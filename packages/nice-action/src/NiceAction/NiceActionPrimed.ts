import { castNiceError } from "@nice-code/error";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import { EActionState } from "./NiceAction.enums";
import {
  type INiceAction,
  type INiceActionPrimed_JsonObject,
  type NiceActionResult,
  type TNiceActionResponse_JsonObject,
} from "./NiceAction.types";
import { NiceActionResponse } from "./NiceActionResponse";

export class NiceActionPrimed<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
> implements Omit<INiceAction<DOM, ID>, "schema" | "cuid" | "timeCreated">
{
  readonly type = EActionState.primed;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;
  readonly timePrimed: number;

  constructor(
    readonly coreAction: NiceAction<DOM, ID, SCH>,
    private _input: TInferInputFromSchema<SCH>["Input"],
    hydrationData?: Pick<INiceActionPrimed_JsonObject<DOM, ID>, "timePrimed">,
  ) {
    this.domain = coreAction.domain;
    this.allDomains = coreAction.allDomains;
    this.id = coreAction.id;
    this.timePrimed = hydrationData?.timePrimed ?? Date.now();
  }

  get input() {
    return this._input;
  }

  /**
   * Serialize this primed action to a JSON-safe wire format.
   * The input is passed through the schema's serialize function if one is defined,
   * otherwise the (already JSON-native) input is used as-is.
   */
  toJsonObject(): INiceActionPrimed_JsonObject<DOM, ID> {
    return {
      ...this.coreAction.toJsonObject(),
      type: EActionState.primed,
      input: this.coreAction.schema.serializeInput(this.input),
      timePrimed: this.timePrimed,
    };
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonObject());
  }

  toHttpResponse(): Response {
    return new Response(this.toJsonString(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  setResponse(
    output: TInferOutputFromSchema<SCH>["Output"] | undefined,
  ): NiceActionResponse<DOM, ID, SCH> {
    if (this.coreAction.schema.outputSchema != null) {
      this.coreAction.schema.outputSchema["~standard"].validate(output);
    }

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
   * Pass `matchTag` to target a specific named handler/resolver on the domain.
   */
  async execute(matchTag?: string): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction._actionDomain._executeAction(this, { matchTag });
  }

  validateInput(): this {
    const newInput = this.coreAction.schema.validateInput(this.input, {
      domain: this.domain,
      actionId: this.id,
    });

    this._input = newInput;

    return this;
  }

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, value }`. On failure: `{ ok: false, error }`.
   *
   * Mirrors `NiceAction.executeSafe` — useful when re-executing a hydrated primed action.
   */
  async executeSafe(
    matchTag?: string,
  ): Promise<NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute(matchTag);
      return { ok: true, output: value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }
}
