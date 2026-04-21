/**
 * ActionConnect client for the demo frontend.
 *
 * Connects to the Bun WebSocket server (ws_server.ts) via WebSocket with
 * automatic HTTP fallback to the Cloudflare Worker when the WS is not yet open.
 *
 * Usage: swap `demo_requester` for `connect_requester` in main.tsx to route
 * all domain actions through ActionConnect instead of direct HTTP POST.
 */
import { ActionHandler } from "@nice-code/action";
import type { IActionConnectTransport } from "@nice-code/connect";
import { ActionConnect, EActionConnectRole } from "@nice-code/connect";
import { BACKEND_BASE_URL, WS_BACKEND_URL } from "../frontend_env";

const ws = new WebSocket(`${WS_BACKEND_URL}/ws`);

const wsTransport: IActionConnectTransport = {
  send: (data) => {
    ws.send(data);
  },
  get connected() {
    return ws.readyState === WebSocket.OPEN;
  },
};

export const actionConnect = new ActionConnect({
  role: EActionConnectRole.client,
  httpFallbackUrl: `${BACKEND_BASE_URL}/resolve_action`,
  enableHttpFallback: true,
}).setTransport(wsTransport);

ws.onmessage = (event) => {
  void actionConnect.onMessage(event.data as string);
};

ws.onopen = () => {
  console.log("[ActionConnect] WS connected");
};
ws.onclose = () => {
  console.log("[ActionConnect] WS disconnected");
};
ws.onerror = (e) => {
  console.warn("[ActionConnect] WS error", e);
};

export const connect_requester = new ActionHandler().setDefaultHandler((action) =>
  actionConnect.dispatch(action),
);
