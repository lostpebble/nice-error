import { ActionHandler } from "./ActionHandler";
import type { IActionHandlerConfig } from "./ActionHandler.types";

export const handle = (config: IActionHandlerConfig = {}) => {
  return new ActionHandler(config);
};
