import React from "react";

interface ToolCallProps {
	name: string;
	args: Record<string, unknown>;
	result?: unknown;
}

export function ToolCallBubble({ name, args, result }: ToolCallProps) {
	const isCompleted = result !== undefined;

	return (
		<div className="flex flex-col space-y-2 max-w-full">
			<div className="self-start bg-gray-100 rounded-lg p-3 text-sm max-w-[85%] break-words">
				<div className="flex items-center gap-2 mb-1">
					<div
						className={`w-2 h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-blue-500 animate-pulse"}`}
					/>
					<div className="font-medium text-gray-700">工具调用: {name}</div>
				</div>

				<div className="mt-2">
					<div className="text-xs text-gray-500 mb-1">参数:</div>
					<pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
						{JSON.stringify(args, null, 2)}
					</pre>
				</div>

				{isCompleted && (
					<div className="mt-2">
						<div className="text-xs text-gray-500 mb-1">结果:</div>
						<pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
							{typeof result === "object"
								? JSON.stringify(result, null, 2)
								: String(result)}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}

export function ToolCallsList({
	toolCalls,
}: { toolCalls: Array<ToolCallProps> }) {
	if (toolCalls.length === 0) return null;

	return (
		<div className="space-y-3">
			{toolCalls.map((tool, index) => (
				<ToolCallBubble
					key={`tool-${index}-${tool.name}-${JSON.stringify(tool.args)}`}
					name={tool.name}
					args={tool.args}
					result={tool.result}
				/>
			))}
		</div>
	);
}
