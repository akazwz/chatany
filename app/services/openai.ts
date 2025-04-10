import { OpenAI } from "openai";
import { useOpenAISettings } from "~/stores/openai-settings";

// 创建OpenAI实例
export const createOpenAIClient = () => {
	const { baseURL, apiKey } = useOpenAISettings.getState();

	return new OpenAI({
		baseURL,
		apiKey,
		dangerouslyAllowBrowser: true,
	});
};

export const openai = createOpenAIClient();

// 文本转语音
export async function textToSpeech(text: string) {
	try {
		const openai = createOpenAIClient();
		return await openai.audio.speech.create({
			model: "gpt-4o-mini-tts",
			voice: "alloy",
			input: text,
			response_format: "mp3",
		});
	} catch (error) {
		console.error("文本转语音失败:", error);
		throw error;
	}
}

// 创建实时语音会话
export async function createRealtimeSession() {
	try {
		const openai = createOpenAIClient();
		return await openai.beta.realtime.sessions.create({
			model: "gpt-4o-mini-realtime-preview",
			input_audio_transcription: {
				model: "whisper-1",
			},
		});
	} catch (error) {
		console.error("创建实时会话失败:", error);
		throw error;
	}
}
