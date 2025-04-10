import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export async function connectSSEMCP(url: string) {
	const client = new Client({
		name: "Chatany",
		version: "1.0.0",
	});
	const transport = new SSEClientTransport(new URL(url));
	await client.connect(transport);
	return client;
}
