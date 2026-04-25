import { err } from "@nice-code/error";
import { err_nice_action } from "../../errors/err_nice_action";

export enum EErrId_NiceConnect {
  disconnected = "disconnected",
}

export const err_nice_connect = err_nice_action.createChildDomain({
  domain: "err_nice_connect",
  schema: {
    [EErrId_NiceConnect.disconnected]: err({
      message: "ActionConnect is disconnected. Please connect before executing actions.",
    }),
  },
});
