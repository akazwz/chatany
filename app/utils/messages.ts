import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import type { DBMessage } from "~/drizzle/schema";

export function transformMessages(
	messages: DBMessage[],
	userInput?: string,
): Array<ChatCompletionMessageParam> {
	const result: Array<ChatCompletionMessageParam> = messages
		.filter((message) => message.role !== "tool")
		.map((message) => ({
			role: message.role as "user" | "assistant",
			content: message.content as string,
		}));
	if (userInput) {
		result.push({
			role: "user",
			content: userInput,
		});
	}
	return result;
}
