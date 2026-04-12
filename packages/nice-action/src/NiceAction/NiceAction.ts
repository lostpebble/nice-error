import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceAction<DOM extends INiceActionDomain, SCH extends NiceActionSchema> {
  constructor(
    readonly domain: DOM,
    readonly schema: SCH,
    readonly id: string,
  ) {}

  toJsonObject() {}

  is(action: unknown): action is NiceActionPrimed<DOM, SCH> {
    if (
      action instanceof NiceActionPrimed &&
      action.coreAction.domain.domain === this.domain.domain &&
      action.coreAction.id === this.id
    ) {
      return true;
    }

    return false;
  }

  async execute(
    input: TInferInputFromSchema<SCH>["Input"],
  ): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    const primed = new NiceActionPrimed(this, input);
    return this.domain._dispatchAction(primed) as Promise<TInferOutputFromSchema<SCH>["Output"]>;
  }
}
