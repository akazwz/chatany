import { MdCallEnd, MdMic, MdError } from "react-icons/md";
import { FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router";
import { openai } from "~/services/openai";
import { useRTCStore } from "~/stores/rtc";
import { useOpenAISettings } from "~/stores/openai-settings";
import { useMCPStore } from "~/stores/mcp";

export async function clientLoader() {
	await useMCPStore.getState().initialize();
	rtcCall();
}

async function rtcCall() {
	const {
		setCallStatus,
		setPC,
		setMS,
		resetCallDuration,
		incrementCallDuration,
	} = useRTCStore.getState();
	setCallStatus("loading");
	resetCallDuration(); // 重置通话时间
	const tools = useMCPStore.getState().realtimeTools;
	const mcpClient = useMCPStore.getState().client;
	console.log("request tools: ", tools);
	const session = await openai.beta.realtime.sessions.create({
		model: "gpt-4o-mini-realtime-preview",
		instructions: "You are a helpful assistant",
	});
	const EPHEMERAL_KEY = session.client_secret.value;
	const pc = new RTCPeerConnection();
	const audioEl = document.createElement("audio");
	audioEl.autoplay = true;

	// 声明计时器变量
	let callTimer: NodeJS.Timeout | null = null;
	pc.ontrack = (e) => {
		console.log("Track added");
		setCallStatus("success");
		audioEl.srcObject = e.streams[0];

		// 启动计时器
		if (callTimer) clearInterval(callTimer);
		callTimer = setInterval(() => {
			incrementCallDuration();
		}, 1000);

		// 监听页面卸载事件，清除计时器
		window.addEventListener(
			"beforeunload",
			() => {
				if (callTimer) clearInterval(callTimer);
			},
			{ once: true },
		);
	};
	const ms = await navigator.mediaDevices.getUserMedia({
		audio: true,
	});
	setPC(pc);
	setMS(ms);
	pc.addTrack(ms.getTracks()[0]);
	const dc = pc.createDataChannel("oai-events");
	dc.onmessage = async (e) => {
		const data = JSON.parse(e.data);
		//console.log("Data channel message:", data);
		switch (data.type) {
			case "response.done": {
				const output = data.response.output[0]
				if (output.type === "function_call") {
					const name = output.name
					const args = JSON.parse(output.arguments)
					console.log("mcp call tool: ", name, args);
					const result = await mcpClient?.callTool({
						name,
						arguments: args,
					})
					const content = JSON.stringify(result?.content)
					dc.send(JSON.stringify({
						type: "conversation.item.create",
						item: {
							type: "function_call_output",
							call_id: output.call_id,
							output: content
						}
					}));
					dc.send(JSON.stringify({
						type: "response.create",
					}));
				}
				break;
			}
			default:
				break;
		}
	};
	dc.onopen = () => {
		console.log("Data channel opened");
		// update session
		dc.send(
			JSON.stringify({
				type: "session.update",
				session: {
					tools,
					tool_choice: "auto",
					input_audio_transcription: {
						model: "gpt-4o-mini-transcribe",
					}
				},
			}),
		);
	};
	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);
	const { baseURL } = useOpenAISettings.getState();
	const baseUrl = `${baseURL}/realtime`;
	const model = "gpt-4o-mini-realtime-preview";
	const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
		method: "POST",
		body: offer.sdp,
		headers: {
			Authorization: `Bearer ${EPHEMERAL_KEY}`,
			"Content-Type": "application/sdp",
		},
	});
	const sdp = await sdpResponse.text();
	await pc.setRemoteDescription({
		type: "answer",
		sdp,
	});
}

clientLoader.hydrate = true as const;

export default function Call() {
	const {
		pc,
		ms,
		callStatus,
		setCallStatus,
		resetCallDuration,
		formatCallDuration,
	} = useRTCStore();
	const navigate = useNavigate();

	function endCall() {
		navigate("/", {
			viewTransition: true,
		});
		if (!pc || !ms) {
			console.log("No peer connection or media stream");
			return;
		}
		pc.close();
		for (const track of ms.getTracks()) {
			track.stop();
		}
		setCallStatus("idle");
		resetCallDuration();
	}

	// Function to render appropriate status content based on call status
	function renderStatusContent() {
		switch (callStatus) {
			case "idle":
				return (
					<div className="flex flex-col items-center gap-3">
						<div className="size-16 bg-gray-200 rounded-full flex items-center justify-center">
							<MdMic className="size-8 text-gray-500" />
						</div>
						<span className="text-gray-700 font-medium">通话准备就绪</span>
						<p className="text-gray-500 text-sm">点击下方按钮开始通话</p>
					</div>
				);
			case "loading":
				return (
					<div className="flex flex-col items-center gap-3">
						<div className="size-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
							<FaSpinner className="size-8 text-blue-500 animate-spin" />
						</div>
						<span className="text-blue-700 font-medium">正在连接...</span>
						<div className="flex items-center gap-2">
							<div className="size-2 bg-blue-400 rounded-full animate-pulse" />
							<div
								className="size-2 bg-blue-400 rounded-full animate-pulse"
								style={{ animationDelay: "0.2s" }}
							/>
							<div
								className="size-2 bg-blue-400 rounded-full animate-pulse"
								style={{ animationDelay: "0.4s" }}
							/>
						</div>
					</div>
				);
			case "success":
				return (
					<div className="flex flex-col items-center gap-3">
						<div className="size-16 bg-green-100 rounded-full flex items-center justify-center">
							<MdMic className="size-8 text-green-500" />
						</div>
						<span className="text-green-700 font-medium">通话已连接</span>
						<p className="text-green-500 text-sm">您现在可以开始对话</p>
						<div className="mt-2 flex items-center justify-center gap-2 bg-green-50 px-4 py-2 rounded-full">
							<div className="size-2 bg-green-500 rounded-full animate-pulse" />
							<span className="text-green-700 text-sm">通话中</span>
						</div>
						<div className="mt-3 text-center">
							<span className="text-gray-700 font-mono text-lg">
								{formatCallDuration()}
							</span>
						</div>
					</div>
				);
			case "error":
				return (
					<div className="flex flex-col items-center gap-3">
						<div className="size-16 bg-red-100 rounded-full flex items-center justify-center">
							<MdError className="size-8 text-red-500" />
						</div>
						<span className="text-red-700 font-medium">连接失败</span>
						<p className="text-red-500 text-sm">请检查您的网络连接并重试</p>
						<button
							type="button"
							className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm hover:bg-red-200 transition-colors"
							onClick={() => window.location.reload()}
						>
							重新连接
						</button>
					</div>
				);
			default:
				return null;
		}
	}

	return (
		<div className="flex flex-col h-dvh p-4 bg-gradient-to-b from-white to-gray-50 max-w-2xl mx-auto">
			<header className="py-4">
				<h1 className="text-xl font-semibold text-center text-gray-800">
					语音通话
				</h1>
			</header>
			<main className="flex-1 w-full flex items-center justify-center flex-col gap-4">
				<div className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm bg-white border border-gray-100 min-w-72">
					{renderStatusContent()}
				</div>
			</main>
			<footer className="p-8 justify-center w-full">
				<button
					type="button"
					className={`flex items-center size-16 justify-center rounded-full mx-auto ${
						callStatus === "success"
							? "bg-red-500"
							: "bg-red-500 opacity-90 hover:opacity-100"
					} transition-all shadow-lg hover:shadow-xl`}
					onClick={endCall}
					aria-label="结束通话"
				>
					<MdCallEnd className="size-8 text-white" />
				</button>
			</footer>
		</div>
	);
}
