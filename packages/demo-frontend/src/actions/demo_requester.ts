import { NiceActionRequester } from "@nice-error/nice-action";
import { BACKEND_BASE_URL } from "../frontend_env";

export const demo_requester = new NiceActionRequester().setDefaultHandler(async (action) => {
  const res = await fetch(`${BACKEND_BASE_URL}/resolve_action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: action.toJsonString(),
  });

  return action.processResponse(await res.json());
});
