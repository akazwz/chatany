import {
	RiPhoneLine,
	RiDeleteBinLine,
	RiPauseLine,
	RiSettings2Line,
} from "react-icons/ri";
import type OpenAI from "openai";
import { eq } from "drizzle-orm";
import { useState, useRef, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import { Link } from "react-router";
import TextareaAutosize from "react-textarea-autosize";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, schema } from "~/drizzle/db.client";
import type { DBMessage, NewDBMessage } from "~/drizzle/schema";
import { openai } from "~/services/openai";
import { transformMessages } from "~/utils/messages";
import { ChatBubble, LoadingBubble } from "~/components/ChatBubble";
import { useMCPStore } from "~/stores/mcp";

export async function clientLoader() {
	await useMCPStore.getState().initialize();
	return null;
}

export default function Home() {
	const [userInput, setUserInput] = useState("");
	const [tempResponse, setTempResponse] = useState("");
	const queryClient = useQueryClient();
	const abortControllerRef = useRef<AbortController | null>(null);
	const scrollEndRef = useRef<HTMLDivElement>(null);

	const { client: mcpClient, chatCompletionTools } = useMCPStore();

	const { data: messagesData } = useQuery({
		queryKey: ["messages"],
		queryFn: async () => {
			return await db.query.messages.findMany({
				orderBy(fields, operators) {
					return [operators.asc(fields.createdAt)];
				},
			});
		},
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (scrollEndRef.current) {
			scrollEndRef.current.scrollIntoView({ behavior: "instant" });
		}
	}, [messagesData, tempResponse]);

	async function clearMessages() {
		queryClient.setQueryData(["messages"], []);
		setTempResponse("");
		await db.delete(schema.messages);
	}

	async function cancelResponse() {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}

	async function addMessage(message: NewDBMessage) {
		const [msg] = await db.insert(schema.messages).values(message).returning();
		queryClient.setQueryData(["messages"], (messages: DBMessage[]) => {
			return [...messages, msg];
		});
	}

	async function addToolMessage(name: string, args: Record<string, unknown>) {
		const [msg] = await db
			.insert(schema.messages)
			.values({
				role: "tool",
				content: `调用工具: ${name}`,
				toolName: name,
				toolArgs: args,
			})
			.returning();

		queryClient.setQueryData(["messages"], (messages: DBMessage[]) => {
			return [...messages, msg];
		});
		return msg;
	}

	async function updateToolMessage(messageId: string, result: unknown) {
		await db
			.update(schema.messages)
			.set({
				content: "工具调用结果",
				toolResult: result,
			})
			.where(eq(schema.messages.id, messageId));

		queryClient.setQueryData(["messages"], (oldMessages: DBMessage[]) =>
			oldMessages.map((msg) =>
				msg.id === messageId
					? { ...msg, content: "工具调用结果", toolResult: result }
					: msg,
			),
		);
	}

	const mutation = useMutation({
		mutationFn: async (userInput: string) => {
			try {
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}
				abortControllerRef.current = new AbortController();
				const messages = transformMessages(messagesData || [], userInput);
				const stream = await openai.chat.completions.create(
					{
						model: "gpt-4o-mini",
						messages,
						tools: chatCompletionTools,
						stream: true,
					},
					{ signal: abortControllerRef.current.signal },
				);
				let fullResponse = "";
				const toolCallMap = new Map<
					number,
					OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall
				>();
				for await (const chunk of stream) {
					const content = chunk.choices[0].delta.content;
					if (content) {
						fullResponse += content;
						setTempResponse((prev) => prev + content);
					}
					for (const toolCall of chunk.choices[0].delta.tool_calls || []) {
						const existingCall = toolCallMap.get(toolCall.index);
						if (existingCall) {
							if (toolCall.function?.name) {
								existingCall.function = existingCall.function || {};
								existingCall.function.name = toolCall.function.name;
							}
							if (toolCall.function?.arguments) {
								existingCall.function = existingCall.function || {};
								existingCall.function.arguments =
									(existingCall.function.arguments || "") +
									toolCall.function.arguments;
							}
							if (toolCall.id) {
								existingCall.id = toolCall.id;
							}
							if (toolCall.type) {
								existingCall.type = toolCall.type;
							}
						} else {
							toolCallMap.set(toolCall.index, {
								index: toolCall.index,
								id: toolCall.id,
								type: toolCall.type,
								function: {
									name: toolCall.function?.name,
									arguments: toolCall.function?.arguments || "",
								},
							});
						}
					}
				}
				const toolCalls = Array.from(toolCallMap.values());
				const toolsMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
					[];
				for (const toolCall of toolCalls) {
					const id = toolCall.id;
					const name = toolCall.function?.name;
					if (!id || !name) {
						continue;
					}
					const args: Record<string, unknown> = toolCall.function?.arguments
						? JSON.parse(toolCall.function.arguments)
						: {};
					const toolMessage = await addToolMessage(name, args);
					try {
						const result = await mcpClient?.callTool({
							name,
							arguments: args,
						});
						// 更新工具调用消息
						await updateToolMessage(toolMessage.id, result);
					} catch (error: unknown) {
						console.error(`工具 ${name} 调用失败:`, error);
						const errorMessage =
							error instanceof Error ? error.message : "未知错误";
						await updateToolMessage(toolMessage.id, {
							error: `调用失败: ${errorMessage}`,
						});
						continue; // 跳过当前工具调用，继续处理下一个
					}
					toolsMessages.push({
						role: "assistant",
						content: null,
						tool_calls: [
							{
								id,
								type: "function",
								function: {
									name,
									arguments: JSON.stringify(args),
								},
							},
						],
					});
					// 获取数据库中保存的工具调用结果
					const toolResult = await db.query.messages.findFirst({
						where: eq(schema.messages.id, toolMessage.id),
					});
					// 确保有工具结果后再添加工具消息
					if (toolResult?.toolResult) {
						toolsMessages.push({
							role: "tool",
							tool_call_id: id,
							content:
								typeof toolResult.toolResult === "string"
									? toolResult.toolResult
									: JSON.stringify(toolResult.toolResult),
						});
					}
				}
				if (toolsMessages.length > 0) {
					messages.push(...toolsMessages);
					const completion2 = await openai.chat.completions.create({
						model: "gpt-4o-mini",
						messages,
						stream: true,
					});
					for await (const chunk of completion2) {
						const content = chunk.choices[0].delta.content;
						if (content) {
							fullResponse += content;
							setTempResponse((prev) => prev + content);
						}
					}
				}
				return fullResponse;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return tempResponse;
				}
				throw error;
			} finally {
				abortControllerRef.current = null;
			}
		},
		onSettled: async (data, error) => {
			if (data) {
				await addMessage({
					role: "assistant",
					content: data,
				});
			}
			if (error) {
				console.error(error);
			}
			setTempResponse("");
		},
	});

	const sendMessage = async () => {
		if (!userInput.trim()) return;
		await addMessage({
			role: "user",
			content: userInput,
		});
		mutation.mutate(userInput);
	};

	return (
		<div className="h-dvh flex flex-col p-2 max-w-2xl mx-auto">
			<header className="flex justify-between items-center h-12 p-2">
				<Link to="/settings" className="w-full" viewTransition>
					<RiSettings2Line className="size-6" />
				</Link>
				<div className="flex gap-4">
					<RiDeleteBinLine className="size-6" onClick={clearMessages} />
					<Link to="/call" viewTransition>
						<RiPhoneLine className="size-6" />
					</Link>
				</div>
			</header>
			<main className="flex-1 overflow-y-auto p-2 space-y-4">
				{messagesData?.length === 0 && !mutation.isPending && (
					<div className="flex h-[80%] flex-col justify-center items-center text-gray-400 p-4">
						<p className="text-center mb-3">开始新的对话</p>
						<div className="text-sm opacity-75">
							<p>↓ 在下方输入您的问题</p>
						</div>
					</div>
				)}
				{messagesData?.map((message) => (
					<ChatBubble key={message.id} id={message.id} message={message} />
				))}
				{mutation.isPending && <LoadingBubble tempResponse={tempResponse} />}
				<div ref={scrollEndRef} />
			</main>
			<footer className="p-2">
				<div className="flex items-end gap-2 bg-gray-100 rounded-xl p-2 shadow-sm">
					<TextareaAutosize
						value={userInput}
						onChange={(e) => setUserInput(e.target.value)}
						placeholder="请输入消息"
						className="w-full resize-none text-sm bg-transparent border-none focus:outline-none px-3 py-2 max-h-32"
						maxRows={5}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								if (userInput.trim()) {
									sendMessage();
									setUserInput("");
								}
							}
						}}
					/>
					{/* Send/Pause Button */}
					{mutation.isPending ? (
						<button
							onClick={cancelResponse}
							type="button"
							className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors duration-200 flex items-center justify-center"
							title="暂停回复"
						>
							<RiPauseLine className="h-5 w-5" aria-label="暂停" />
						</button>
					) : (
						<button
							onClick={() => {
								if (userInput.trim()) {
									sendMessage();
									setUserInput("");
								}
							}}
							type="button"
							className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition-colors duration-200 flex items-center justify-center"
							disabled={!userInput.trim()}
						>
							<FiSend className="h-5 w-5" aria-label="发送" />
						</button>
					)}
				</div>
			</footer>
		</div>
	);
}
