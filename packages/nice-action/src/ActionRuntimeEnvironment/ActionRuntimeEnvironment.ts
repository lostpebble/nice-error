import { nanoid } from "nanoid";
import { ActionHandler } from "./ActionHandler/ActionHandler";
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

  private _handlersByTag = new Map<string, ActionHandler[]>();

  constructor(input: IActionRuntimeEnvironment_Constructor_Input) {
    this.envId = input.envId;
    this.memCuid = `${input.envId}::${nanoid(8)}`;
    this.timeCreated = Date.now();
  }

  addHandlers(handlers: ActionHandler[]): this {
    for (const handler of handlers) {
      const tag = handler.matchTag;
      if (!this._handlersByTag.has(tag)) {
        this._handlersByTag.set(tag, []);
      }
      this._handlersByTag.get(tag)!.push(handler);
    }
    return this;
  }

  /**
   * Return the first handler registered for the given matchTag, or undefined
   * if none has been registered.
   */
  getHandlerForTag(matchTag: string): ActionHandler | undefined {
    return this._handlersByTag.get(matchTag)?.[0];
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
