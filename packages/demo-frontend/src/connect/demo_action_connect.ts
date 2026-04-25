import { ActionConnect, ActionHandler, type IActionConnectTransport } from "@nice-code/action";
import { act_domain_demo } from "demo-shared";
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

export const connect_requester = new ActionHandler().forDomain(act_domain_demo, {
  execution: (primed) => actionConnect.dispatchAction(primed),
});
