import { nanoid } from "nanoid";

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

  constructor(input: IActionRuntimeEnvironment_Constructor_Input) {
    this.envId = input.envId;
    this.memCuid = `${input.envId}::${nanoid(8)}`;
    this.timeCreated = Date.now();
  }
}
