import type { ActionHandler } from "../ActionHandler/ActionHandler";
import type { THandlerKey } from "../ActionHandler/ActionHandler.types";

export class ActionHandlerStore {
  private _handlers: Map<THandlerKey, ActionHandler[]> = new Map();

  addHandler(handler: ActionHandler, sourceId: string): void {
    for (const caseItem of handler.cases) {
      if (this._handlers.has(caseItem._matchKey)) {
        console.warn(
          `Warning: Multiple handlers on "${sourceId}" registered for key "${caseItem._matchKey}". This may lead to non-deterministic behavior. Consider using more specific match keys or consolidating handlers.`,
        );
      } else {
        this._handlers.set(caseItem._matchKey, []);
      }

      this._handlers.set(caseItem._matchKey, [handler, ...this._handlers.get(caseItem._matchKey)!]);
    }
  }

  getHandler(key: THandlerKey): ActionHandler | undefined {
    const handlers = this._handlers.get(key);
    return handlers ? handlers[0] : undefined;
  }
}
