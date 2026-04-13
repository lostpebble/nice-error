import type { TInferActionError } from "./ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceAction,
  INiceActionPrimed_JsonObject,
  NiceActionResult,
} from "./NiceAction.types";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";
import { NiceActionResponse } from "./NiceActionResponse";

export class NiceActionPrimed<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["schema"] & string,
  SCH extends DOM["schema"][ID],
> implements Omit<INiceAction<DOM, ID>, "schema">
{
  readonly _isPrimed = true;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;

  constructor(
    readonly coreAction: NiceAction<DOM, ID, SCH>,
    readonly input: TInferInputFromSchema<SCH>["Input"],
  ) {
    this.domain = coreAction.domain;
    this.allDomains = coreAction.allDomains;
    this.id = coreAction.id;
  }

  /**
   * Serialize this primed action to a JSON-safe wire format.
   * The input is passed through the schema's serialize function if one is defined,
   * otherwise the (already JSON-native) input is used as-is.
   */
  toJsonObject(): INiceActionPrimed_JsonObject<DOM, ID> {
    return {
      ...this.coreAction.toJsonObject(),
      input: this.coreAction.schema.serializeInput(this.input),
    };
  }

  setOutput(output: TInferOutputFromSchema<SCH>["Output"]): NiceActionResponse<DOM, ID, SCH> {
    return new NiceActionResponse(this, { ok: true, output: output });
  }

  /**
   * Re-execute this primed action through the domain handler or resolver.
   * Useful for deferred or cross-environment execution of a hydrated action.
   *
   * Pass `envId` to target a specific named handler/resolver on the domain.
   */
  async execute(envId?: string): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction._actionDomain._dispatchAction(this, envId) as Promise<
      TInferOutputFromSchema<SCH>["Output"]
    >;
  }

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, value }`. On failure: `{ ok: false, error }`.
   *
   * Mirrors `NiceAction.executeSafe` — useful when re-executing a hydrated primed action.
   */
  async executeSafe(
    envId?: string,
  ): Promise<NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute(envId);
      return { ok: true, output: value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }
}
