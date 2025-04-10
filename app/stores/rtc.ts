import { create } from "zustand";

export type CallStatus = "idle" | "loading" | "success" | "error";

interface RTCStore {
	pc: RTCPeerConnection | null;
	ms: MediaStream | null;
	callStatus: CallStatus;
	callDuration: number;
	setCallStatus: (status: CallStatus) => void;
	setPC: (pc: RTCPeerConnection | null) => void;
	setMS: (ms: MediaStream | null) => void;
	incrementCallDuration: () => void;
	resetCallDuration: () => void;
	formatCallDuration: () => string;
}

export const useRTCStore = create<RTCStore>((set, get) => ({
	pc: null,
	ms: null,
	callStatus: "idle",
	callDuration: 0,
	setCallStatus: (status: CallStatus) => set({ callStatus: status }),
	setPC: (pc: RTCPeerConnection | null) => set({ pc }),
	setMS: (ms: MediaStream | null) => set({ ms }),
	incrementCallDuration: () =>
		set((state) => ({ callDuration: state.callDuration + 1 })),
	resetCallDuration: () => set({ callDuration: 0 }),
	formatCallDuration: () => {
		const { callDuration } = get();
		const hours = Math.floor(callDuration / 3600);
		const minutes = Math.floor((callDuration % 3600) / 60);
		const seconds = callDuration % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	},
}));
