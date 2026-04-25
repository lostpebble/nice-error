import { ActionConnect, Transport } from "@nice-code/action";
import { act_domain_demo } from "demo-shared";
import { BACKEND_BASE_URL, WS_BACKEND_URL } from "../frontend_env";

const ws = new WebSocket(`${WS_BACKEND_URL}/ws`);

export const actionConnect = new ActionConnect([
  new Transport({
    send: (data) => ws.send(data),
    get connected() {
      return ws.readyState === WebSocket.OPEN;
    },
  }),
  new Transport({ url: `${BACKEND_BASE_URL}/resolve_action` }),
]).routeDomain(act_domain_demo);

ws.onmessage = (event) => void actionConnect.onMessage(event.data as string);
ws.onopen = () => console.log("[ActionConnect] WS connected");
ws.onclose = () => console.log("[ActionConnect] WS disconnected");
ws.onerror = (e) => console.warn("[ActionConnect] WS error", e);
