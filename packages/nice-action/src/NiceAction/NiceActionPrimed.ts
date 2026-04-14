import { castNiceError } from "@nice-error/core";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceAction,
  INiceActionPrimed_JsonObject,
  NiceActionResult,
  TNiceActionResponse_JsonObject,
} from "./NiceAction.types";
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

  toJsonString(): string {
    return JSON.stringify(this.toJsonObject());
  }

  setOutput(output: TInferOutputFromSchema<SCH>["Output"]): NiceActionResponse<DOM, ID, SCH> {
    return new NiceActionResponse(this, { ok: true, output: output });
  }

  /**
   * Process a wire response returned by a remote `NiceActionResponderEnvironment`.
   *
   * Deserializes the output using the schema's deserialization if defined, and throws
   * the error (via `castNiceError`) if the response indicates failure.
   *
   * Intended for use inside `NiceActionRequester` handlers that receive a
   * `TNiceActionResponse_JsonObject` from a network call, so the caller of `execute()`
   * always gets the raw output type without manually deserializing.
   *
   * @example
   * ```ts
   * dom.setActionRequester().forDomain(dom, async (act) => {
   *   const wire = await fetch("/api/actions", {
   *     method: "POST",
   *     body: JSON.stringify(act.toJsonObject()),
   *   }).then((r) => r.json());
   *   return act.processResponse(wire);
   * });
   * ```
   */
  processResponse(wire: TNiceActionResponse_JsonObject): TInferOutputFromSchema<SCH>["Output"] {
    if (!wire.ok) {
      throw castNiceError(wire.error);
    }
    return this.coreAction.schema.deserializeOutput(wire.output as any);
  }

  /**
   * Re-execute this primed action through the domain handler or resolver.
   * Useful for deferred or cross-environment execution of a hydrated action.
   *
   * Pass `envId` to target a specific named handler/resolver on the domain.
   */
  async execute(envId?: string): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction._actionDomain._dispatchAction(this, envId);
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
