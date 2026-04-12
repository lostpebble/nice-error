import type { NiceActionSchema, TInferActionError } from "./ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  ISerializedNiceAction,
  NiceActionResult,
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

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, value }`. On failure: `{ ok: false, error }`.
   *
   * Mirrors `NiceAction.executeSafe` — useful when re-executing a hydrated primed action.
   */
  async executeSafe(): Promise<NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute();
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }
}
