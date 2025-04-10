import { create } from "zustand";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ChatCompletionTool } from "openai/resources/index.mjs";
import { connectSSEMCP } from "~/services/mcp";
import { useMCPSettings } from "~/stores/mcp-settings";
import type { SessionCreateParams } from "openai/resources/beta/realtime/sessions.mjs";

interface MCPState {
	client: Client | null;
	chatCompletionTools: ChatCompletionTool[];
	realtimeTools: Array<SessionCreateParams.Tool>;
	isLoading: boolean;
	initialized: boolean;
	// 初始化MCP客户端
	initialize: () => Promise<void>;
	// 重置状态
	reset: () => void;
}

export const useMCPStore = create<MCPState>((set, get) => ({
	client: null,
	chatCompletionTools: [],
	realtimeTools: [],
	isLoading: false,
	initialized: false,

	initialize: async () => {
		// 如果已经初始化或正在加载，则不重复初始化
		if (get().initialized || get().isLoading) {
			return;
		}

		set({ isLoading: true });

		try {
			const { sseURL } = useMCPSettings.getState();
			if (!sseURL) {
				throw new Error("MCP SSE URL 未配置");
			}
			const client = await connectSSEMCP(sseURL);
			const toolsResponse = await client.listTools();
			const chatCompletionTools = toolsResponse.tools.map((tool) => ({
				type: "function" as const,
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
				},
			}));
			const realtimeTools: Array<SessionCreateParams.Tool> =
				toolsResponse.tools.map((tool) => ({
					type: "function" as const,
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
				}));
			set({
				client,
				chatCompletionTools,
				realtimeTools,
				isLoading: false,
				initialized: true,
			});
		} catch (error) {
			console.error("初始化MCP客户端失败:", error);
			set({
				isLoading: false,
			});
		}
	},

	reset: () => {
		set({
			client: null,
			chatCompletionTools: [],
			realtimeTools: [],
			isLoading: false,
			initialized: false,
		});
	},
}));
