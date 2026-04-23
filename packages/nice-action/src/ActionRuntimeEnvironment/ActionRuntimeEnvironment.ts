import { nanoid } from "nanoid";
import type { INiceAction } from "../NiceAction/NiceAction.types";
import { ActionHandler } from "./ActionHandler/ActionHandler";
import type { TMatchHandlerKey } from "./ActionHandler/ActionHandler.types";
import type {
  IActionRuntimeEnvironment_JsonObject,
  IRuntimeMeta,
} from "./ActionRuntimeEnvironment.types";
import { getAssumedRuntimeInfo } from "./utils/getAssumedRuntimeEnvironment";

interface IActionRuntimeEnvironment_Constructor_Input {
  envId: string;
}

export class ActionRuntimeEnvironment {
  readonly envId: string;

  /**
   * A unique identifier for this runtime environment instance.
   *
   * Format: `${envId}::${randomSuffix}` where `envId` is the runtime static ID and `randomSuffix` is a short random
   * string to distinguish multiple instances of the same runtime.
   */
  readonly memCuid: string;
  readonly timeCreated: number;
  readonly runtimeInfo: IRuntimeMeta = getAssumedRuntimeInfo();

  private _handlersByTag = new Map<TMatchHandlerKey, ActionHandler[]>();

  constructor(input: IActionRuntimeEnvironment_Constructor_Input) {
    this.envId = input.envId;
    this.memCuid = `${input.envId}::${nanoid(8)}`;
    this.timeCreated = Date.now();
  }

  addHandlers(handlers: ActionHandler[]): this {
    for (const handler of handlers) {
      for (const matchKey of handler.allHandlerKeys) {
        if (!this._handlersByTag.has(matchKey)) {
          this._handlersByTag.set(matchKey, []);
        } else if (this._handlersByTag.get(matchKey)!.some((h) => h.cuid === handler.cuid)) {
          continue;
        }

        const handlersForKey = this._handlersByTag.get(matchKey)!;
        this._handlersByTag.set(matchKey, [handler, ...handlersForKey]);
      }
    }

    console.log("added handlers", {
      envId: this.envId,
      memCuid: this.memCuid,
      handlerInfo: handlers.map((h) => ({ cuid: h.cuid, keys: h.allHandlerKeys.join(", ") })),
    });
    return this;
  }

  /**
   * Return the first handler registered for the given matchTag, or undefined
   * if none has been registered.
   */
  getHandlerForAction(
    action: Pick<INiceAction<any, any>, "domain" | "id">,
    tag?: string,
  ): ActionHandler | undefined {
    const matchTag = tag ?? "_";
    return this._handlersByTag.get(`${matchTag}::${action.domain}::${action.id}`)?.[0];
  }

  toJsonObject(): IActionRuntimeEnvironment_JsonObject {
    return {
      envId: this.envId,
      memCuid: this.memCuid,
      timeCreated: this.timeCreated,
      runtimeInfo: this.runtimeInfo,
    };
  }
}

export const createActionRuntime = (
  config: IActionRuntimeEnvironment_Constructor_Input,
): ActionRuntimeEnvironment => {
  return new ActionRuntimeEnvironment(config);
};
