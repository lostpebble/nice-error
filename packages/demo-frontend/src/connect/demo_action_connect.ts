import { ActionConnect } from "@nice-code/action";
import { act_domain_demo } from "demo-shared";
import { ConnectionConfig } from "../../../nice-action/src/ActionRuntimeEnvironment/ActionConnect/ConnectionConfig/ConnectionConfig";
import { ETransportType } from "../../../nice-action/src/ActionRuntimeEnvironment/ActionConnect/Transport/Transport.types";
import { BACKEND_BASE_URL, WS_BACKEND_URL } from "../frontend_env";

const connectionConfig = new ConnectionConfig({
  transports: [
    {
      type: ETransportType.ws,
      createWebSocket: async () => {
        return new WebSocket(`${WS_BACKEND_URL}/resolve_action/ws`);
      },
    },
    {
      type: ETransportType.http,
      url: `${BACKEND_BASE_URL}/resolve_action`,
    },
  ],
});

export const demoActionConnect = new ActionConnect([connectionConfig]).routeDomain(act_domain_demo);
