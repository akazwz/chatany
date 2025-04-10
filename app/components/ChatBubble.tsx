import ReactMarkdown from "react-markdown";
import {
	forwardRef,
	type ForwardedRef,
	useState,
	useEffect,
	useRef,
} from "react";
import {
	RiFileCopyLine,
	RiVolumeUpLine,
	RiCheckLine,
	RiPauseCircleLine,
	RiToolsLine,
	RiArrowDownSLine,
	RiArrowUpSLine,
} from "react-icons/ri";
import type { DBMessage } from "~/drizzle/schema";
import { openai } from "~/services/openai";

interface ChatBubbleProps {
	message: DBMessage;
	id: string;
}

// Sound wave animation component
function SoundWave() {
	// Add animation style
	useEffect(() => {
		const styleId = "sound-wave-animation";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
				@keyframes soundWaveA {
					0% { transform: scaleY(0.3); }
					20% { transform: scaleY(0.8); }
					40% { transform: scaleY(0.4); }
					60% { transform: scaleY(1); }
					80% { transform: scaleY(0.5); }
					100% { transform: scaleY(0.3); }
				}
				@keyframes soundWaveB {
					0% { transform: scaleY(0.5); }
					25% { transform: scaleY(0.3); }
					50% { transform: scaleY(0.9); }
					75% { transform: scaleY(0.5); }
					100% { transform: scaleY(0.5); }
				}
				@keyframes soundWaveC {
					0% { transform: scaleY(0.8); }
					33% { transform: scaleY(0.4); }
					66% { transform: scaleY(1); }
					100% { transform: scaleY(0.8); }
				}
			`;
			document.head.appendChild(style);
		}

		// Clean up function
		return () => {
			if (typeof document === "undefined") return;
			const existingStyle = document.getElementById(styleId);
			if (
				existingStyle &&
				document.querySelectorAll('[data-is-playing="true"]').length <= 1
			) {
				existingStyle.remove();
			}
		};
	}, []);

	return (
		<div className="flex items-center h-5 gap-[1px]" data-is-playing="true">
			<div
				className="w-[2px] h-2 bg-gray-400 rounded-full transform-gpu"
				style={{
					animation: "soundWaveA 0.9s ease-in-out infinite",
					transformOrigin: "center center",
				}}
			/>
			<div
				className="w-[2px] h-3 bg-gray-400 rounded-full transform-gpu"
				style={{
					animation: "soundWaveB 0.8s ease-in-out infinite",
					transformOrigin: "center center",
					animationDelay: "0.25s",
				}}
			/>
			<div
				className="w-[2px] h-5 bg-gray-400 rounded-full transform-gpu"
				style={{
					animation: "soundWaveC 0.7s ease-in-out infinite",
					transformOrigin: "center center",
					animationDelay: "0.1s",
				}}
			/>
			<div
				className="w-[2px] h-3 bg-gray-400 rounded-full transform-gpu"
				style={{
					animation: "soundWaveA 0.85s ease-in-out infinite",
					transformOrigin: "center center",
					animationDelay: "0.33s",
				}}
			/>
			<div
				className="w-[2px] h-2 bg-gray-400 rounded-full transform-gpu"
				style={{
					animation: "soundWaveB 0.75s ease-in-out infinite",
					transformOrigin: "center center",
					animationDelay: "0.15s",
				}}
			/>
		</div>
	);
}

export const ChatBubble = forwardRef(function ChatBubble(
	{ message, id }: ChatBubbleProps,
	ref: ForwardedRef<HTMLDivElement>,
) {
	const isUser = message.role === "user";
	const isTool = message.role === "tool";
	const [copied, setCopied] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const copyToClipboard = () => {
		const textToCopy =
			typeof message.content === "string"
				? message.content
				: JSON.stringify(message.content, null, 2);

		navigator.clipboard
			.writeText(textToCopy)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch((err) => {
				console.error("Failed to copy: ", err);
			});
	};

	// Placeholder for future implementation
	const togglePlayback = () => {
		if (isPlaying) {
			stopAudio();
		} else {
			const content =
				typeof message.content === "string"
					? message.content
					: JSON.stringify(message.content);
			playAudio(content);
		}
		setIsPlaying(!isPlaying);
	};

	async function playAudio(input: string) {
		const response = await openai.audio.speech.create({
			model: "gpt-4o-mini-tts",
			input,
			voice: "alloy",
			response_format: "mp3",
		});
		const stream = response.body;
		if (!stream) return;
		const mediaSource = new MediaSource();
		const audio = new Audio();
		audioRef.current = audio;
		audio.src = URL.createObjectURL(mediaSource);
		mediaSource.addEventListener("sourceopen", async () => {
			const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
			const reader = stream.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					mediaSource.endOfStream();
					break;
				}
				// 等待缓冲区准备好
				if (sourceBuffer.updating) {
					await new Promise((resolve) =>
						sourceBuffer.addEventListener("updateend", resolve, { once: true }),
					);
				}
				// 添加数据到缓冲区
				sourceBuffer.appendBuffer(value);
			}
		});
		audio.onended = () => {
			setIsPlaying(false);
		};
		audio.onerror = () => {
			setIsPlaying(false);
			if (audio.src) {
				URL.revokeObjectURL(audio.src);
			}
		};
		audio.play();
	}

	async function stopAudio() {
		if (audioRef.current) {
			audioRef.current.pause();
			if (audioRef.current.src) {
				URL.revokeObjectURL(audioRef.current.src);
			}
			audioRef.current = null;
		}
	}

	// 渲染工具调用消息
	if (isTool) {
		const isCompleted =
			message.toolResult !== undefined && message.toolResult !== null;
		const toolName = message.toolName || "未知工具";
		const [expanded, setExpanded] = useState(false);

		const toolArgs = message.toolArgs ? (
			<pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
				{JSON.stringify(message.toolArgs, null, 2)}
			</pre>
		) : null;

		const toolResult =
			isCompleted && message.toolResult ? (
				<pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
					{JSON.stringify(message.toolResult, null, 2)}
				</pre>
			) : null;

		return (
			<div ref={ref} id={id} className="flex flex-col items-start">
				<div className="self-start bg-gray-100 rounded-lg p-3 text-sm max-w-[85%] break-words">
					<button
						className="flex items-center justify-between w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
						onClick={() => setExpanded(!expanded)}
						type="button"
					>
						<div className="flex items-center gap-2">
							<div
								className={`w-2 h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-blue-500 animate-pulse"}`}
							/>
							<div className="font-medium text-gray-700 flex items-center">
								<RiToolsLine className="mr-1" />
								工具调用: {toolName}
							</div>
						</div>
						<div className="text-gray-500 ml-2">
							{expanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
						</div>
					</button>

					{expanded && (
						<>
							{message.toolArgs && (
								<div className="mt-2">
									<div className="text-xs text-gray-500 mb-1">参数:</div>
									{toolArgs}
								</div>
							)}

							{isCompleted && message.toolResult && (
								<div className="mt-2">
									<div className="text-xs text-gray-500 mb-1">结果:</div>
									{toolResult}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		);
	}

	// 获取要显示的内容
	const contentToDisplay =
		typeof message.content === "string"
			? message.content
			: JSON.stringify(message.content, null, 2);

	return (
		<div
			ref={ref}
			id={id}
			className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
		>
			<div
				className={`prose prose-sm max-w-[80%] p-2 rounded-lg ${
					isUser ? "bg-blue-500 text-white rounded-tr-none" : "rounded-tl-none"
				}`}
			>
				<ReactMarkdown>{contentToDisplay}</ReactMarkdown>
			</div>
			{!isUser && (
				<div className="flex gap-2 mt-1 px-1 text-xs text-gray-500">
					<button
						type="button"
						className="flex items-center gap-1 hover:text-gray-700 transition-colors"
						onClick={copyToClipboard}
						title="复制"
					>
						{copied ? (
							<RiCheckLine className="size-5" />
						) : (
							<RiFileCopyLine className="size-5" />
						)}
					</button>
					{/* <button
						type="button"
						className="flex items-center gap-1 hover:text-gray-700 transition-colors"
						title="重新生成"
					>
						<RiRefreshLine className="size-5" />
					</button> */}
					<button
						type="button"
						className="flex items-center gap-1 hover:text-gray-700 transition-colors"
						onClick={togglePlayback}
						title={isPlaying ? "暂停播放" : "语音播放"}
					>
						{isPlaying ? (
							<div className="flex items-center">
								<RiPauseCircleLine className="size-5 mr-1" />
								<SoundWave />
							</div>
						) : (
							<RiVolumeUpLine className="size-5" />
						)}
					</button>
				</div>
			)}
		</div>
	);
});

interface LoadingBubbleProps {
	tempResponse?: string;
}

export const LoadingBubble = forwardRef(function LoadingBubble(
	{ tempResponse }: LoadingBubbleProps,
	ref: ForwardedRef<HTMLDivElement>,
) {
	if (tempResponse) {
		return (
			<div ref={ref} className="flex justify-start">
				<div className="prose prose-sm max-w-[80%] p-2 rounded-lg rounded-tl-none">
					<ReactMarkdown>{tempResponse}</ReactMarkdown>
				</div>
			</div>
		);
	}

	return (
		<div ref={ref} className="flex justify-start">
			<div className="prose prose-sm max-w-[80%] p-2 rounded-lg">
				<div className="flex space-x-1 items-center">
					<div className="size-2 bg-gray-400 rounded-full animate-pulse" />
					<div
						className="size-2 bg-gray-400 rounded-full animate-pulse"
						style={{ animationDelay: "0.2s" }}
					/>
					<div
						className="size-2 bg-gray-400 rounded-full animate-pulse"
						style={{ animationDelay: "0.4s" }}
					/>
				</div>
			</div>
		</div>
	);
});
