import { nanoid } from "nanoid";
import { ActionHandler } from "./ActionHandler/ActionHandler";
import { ActionHandlerStore } from "./ActionHandlerStore/ActionHandlerStore";
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

  private _handlerStore: ActionHandlerStore = new ActionHandlerStore();

  constructor(input: IActionRuntimeEnvironment_Constructor_Input) {
    this.envId = input.envId;
    this.memCuid = `${input.envId}::${nanoid(8)}`;
    this.timeCreated = Date.now();
  }

  get handlers(): readonly ActionHandler[] {
    return this._handlerStore;
  }

  toJsonObject(): IActionRuntimeEnvironment_JsonObject {
    return {
      envId: this.envId,
      memCuid: this.memCuid,
      timeCreated: this.timeCreated,
      runtimeInfo: this.runtimeInfo,
    };
  }

  addHandler(handler: ActionHandler): this {
    this._handlerStore.addHandler(handler);
    return this;
  }
}
