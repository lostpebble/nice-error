import type { ActionHandler } from "../ActionHandler/ActionHandler";
import type { THandlerKey } from "../ActionHandler/ActionHandler.types";

export class ActionHandlerStore {
  private _handlers: Map<THandlerKey, ActionHandler[]> = new Map();

  registerHandler(handler: ActionHandler): this {
    if (handler.matchTag) {
      const handlers = this._handlers.get(handler.matchTag) || [];
      handlers.push(handler);
      this._handlers.set(handler.matchTag, handlers);
    }
    return this;
  }
}
