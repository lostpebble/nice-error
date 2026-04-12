import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceAction<DOM extends INiceActionDomain, SCH extends NiceActionSchema<any, any, any>> {
  constructor(
    readonly domain: DOM,
    readonly schema: SCH,
    readonly id: string,
  ) {}

  /**
   * Serialize this action definition (without input) to a JSON-safe object.
   * Useful for describing which action will be invoked without yet having input.
   */
  toJsonObject(): { domain: string; actionId: string } {
    return {
      domain: this.domain.domain,
      actionId: this.id,
    };
  }

  is(action: unknown): action is NiceActionPrimed<DOM, SCH> {
    return (
      action instanceof NiceActionPrimed &&
      action.coreAction.domain.domain === this.domain.domain &&
      action.coreAction.id === this.id
    );
  }

  /**
   * Prime this action with input and immediately execute it through the domain handler.
   */
  async execute(
    input: TInferInputFromSchema<SCH>["Input"],
  ): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    const primed = new NiceActionPrimed(this, input);
    return this.domain._dispatchAction(primed) as Promise<TInferOutputFromSchema<SCH>["Output"]>;
  }
}
