import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OpenAISettings {
	baseURL: string;
	apiKey: string;
	setBaseURL: (baseURL: string) => void;
	setApiKey: (apiKey: string) => void;
	reset: () => void;
}

const DEFAULT_BASE_URL = "https://openaiproxyz.fly.dev/v1";
const DEFAULT_API_KEY = "akazwz";

export const useOpenAISettings = create<OpenAISettings>()(
	persist(
		(set) => ({
			baseURL: DEFAULT_BASE_URL,
			apiKey: DEFAULT_API_KEY,
			setBaseURL: (baseURL: string) => set({ baseURL }),
			setApiKey: (apiKey: string) => set({ apiKey }),
			reset: () => set({ baseURL: DEFAULT_BASE_URL, apiKey: DEFAULT_API_KEY }),
		}),
		{
			name: "openai-settings",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
