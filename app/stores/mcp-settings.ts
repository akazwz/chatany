import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface MCPSettings {
	sseURL: string;
	setSseURL: (sseURL: string) => void;
	reset: () => void;
}

const DEFAULT_SSE_URL = "http://localhost:3000/sse";

export const useMCPSettings = create<MCPSettings>()(
	persist(
		(set) => ({
			sseURL: DEFAULT_SSE_URL,
			setSseURL: (sseURL: string) => set({ sseURL }),
			reset: () => set({ sseURL: DEFAULT_SSE_URL }),
		}),
		{
			name: "mcp-settings",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
