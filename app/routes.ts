import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx", { id: "home" }),
	route("/chat:id", "routes/home.tsx", { id: "chat" }),
	route("/conversations", "routes/conversations.tsx"),
	route("/settings", "routes/settings.tsx"),
	route("/call", "routes/call.tsx"),
] satisfies RouteConfig;
