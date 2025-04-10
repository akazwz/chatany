import { RiCloseLine } from "react-icons/ri";
import { Link } from "react-router";
import openaiLogo from "~/assets/openai.svg";
import { useOpenAISettings } from "~/stores/openai-settings";
import { useMCPSettings } from "~/stores/mcp-settings";
import { resetAllTables } from "~/drizzle/db.client";

export default function Settings() {
	const {
		baseURL,
		apiKey,
		setBaseURL,
		setApiKey,
		reset: resetOpenAISettings,
	} = useOpenAISettings();

	const { sseURL, setSseURL, reset: resetMCPSettings } = useMCPSettings();

	const resetAllSettings = () => {
		resetOpenAISettings();
		resetMCPSettings();
	};

	const handleResetDatabase = async () => {
		try {
			await resetAllTables();
			alert("数据库已重置成功");
		} catch (error) {
			console.error("重置数据库失败:", error);
			alert(`重置数据库失败: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	return (
		<div className="p-2 h-dvh flex flex-col max-w-2xl mx-auto">
			<header className="flex items-center gap-4 h-12 p-2">
				<Link to="/" viewTransition>
					<RiCloseLine className="size-6" />
				</Link>
				<span className="font-semibold">设置</span>
			</header>
			<main className="flex-1 flex flex-col overflow-y-auto">
				<div className="flex flex-col items-center gap-2">
					<img
						src={openaiLogo}
						alt="OpenAI"
						className="size-18 rounded-full mx-auto"
					/>
					<span className="font-semibold">OpenAI</span>
					<span className="text-gray-500">release-0.1.0</span>
				</div>
				<div className="p-4 space-y-6">
					<h2 className="text-lg font-medium text-gray-900">API 设置</h2>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="baseURL"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								OpenAI Base URL
							</label>
							<input
								type="text"
								id="baseURL"
								value={baseURL}
								onChange={(e) => setBaseURL(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
						<div>
							<label
								htmlFor="apiKey"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								OpenAI API Key
							</label>
							<input
								type="text"
								id="apiKey"
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
						<div>
							<label
								htmlFor="sseURL"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								MCP SSE URL
							</label>
							<input
								type="text"
								id="sseURL"
								value={sseURL}
								onChange={(e) => setSseURL(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							/>
						</div>
					</div>
					<button
						type="button"
						onClick={resetAllSettings}
						className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						恢复默认设置
					</button>
					<button
						type="button"
						onClick={handleResetDatabase}
						className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-4"
					>
						重置数据库
					</button>
				</div>
			</main>
		</div>
	);
}
