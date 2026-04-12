import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  ISerializedNiceAction,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";

export class NiceActionPrimed<DOM extends INiceActionDomain, SCH extends NiceActionSchema<any, any, any>> {
  readonly _isPrimed = true;

  constructor(
    readonly coreAction: NiceAction<DOM, SCH>,
    readonly input: TInferInputFromSchema<SCH>["Input"],
  ) {}

  /**
   * Serialize this primed action to a JSON-safe wire format.
   * The input is passed through the schema's serialize function if one is defined,
   * otherwise the (already JSON-native) input is used as-is.
   */
  toJsonObject(): ISerializedNiceAction {
    return {
      domain: this.coreAction.domain.domain,
      actionId: this.coreAction.id,
      input: this.coreAction.schema.serializeInput(this.input),
    };
  }

  /**
   * Re-execute this primed action through the domain handler.
   * Useful for deferred or cross-environment execution of a hydrated action.
   */
  async execute(): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction.domain._dispatchAction(this) as Promise<TInferOutputFromSchema<SCH>["Output"]>;
  }
}
