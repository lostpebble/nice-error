import { ActionHandler } from "@nice-code/action";
import { BACKEND_BASE_URL } from "../frontend_env";

export const demo_requester = new ActionHandler().setDefaultHandler(async (action) => {
  const res = await fetch(`${BACKEND_BASE_URL}/resolve_action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: action.toJsonString(),
  });

  return action.processResponse(await res.json());
});
