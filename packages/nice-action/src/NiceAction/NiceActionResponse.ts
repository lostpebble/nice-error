import { castNiceError } from "@nice-code/error";
import type {
  INiceActionDomain,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { IRuntimeEnvironmentMeta } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import { EActionState } from "./NiceAction.enums";
import {
  type INiceAction,
  type TNiceActionResponse_JsonObject,
  type TNiceActionResult,
} from "./NiceAction.types";
import { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceActionResponse<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
> implements Omit<INiceAction<DOM, ID>, "schema" | "cuid" | "timeCreated">
{
  readonly type = EActionState.resolved;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;
  readonly primed: NiceActionPrimed<DOM, ID, SCH>;
  readonly result: TNiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>;
  readonly timeResponded: number;

  constructor(
    primed: NiceActionPrimed<DOM, ID, SCH>,
    result: TNiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>,
    hydrationData?: Pick<TNiceActionResponse_JsonObject<DOM, ID>, "timeResponded">,
  ) {
    this.primed = primed;
    this.result = result;
    this.domain = primed.coreAction.domain;
    this.allDomains = primed.coreAction.allDomains;
    this.id = primed.coreAction.id;
    this.timeResponded = hydrationData?.timeResponded ?? Date.now();
  }

  getEnvironmentMeta(): IRuntimeEnvironmentMeta {
    return this.primed.coreAction.actionDomain.getEnvironmentMeta();
  }

  /**
   * Serialize this response to a JSON-safe wire format.
   *
   * On success, the output is passed through the schema's serialize function
   * if one is defined, otherwise used as-is.
   * On failure, the error is serialized via `NiceError.toJsonObject()`.
   */
  toJsonObject(): TNiceActionResponse_JsonObject {
    const base = this.primed.toJsonObject();

    if (this.result.ok) {
      return {
        ...base,
        type: EActionState.resolved,
        ok: true,
        output: this.primed.coreAction.schema.serializeOutput(this.result.output),
        timeResponded: this.timeResponded,
      };
    }

    return {
      ...base,
      type: EActionState.resolved,
      ok: false,
      error: this.result.error.toJsonObject(),
      timeResponded: this.timeResponded,
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
}

// ---------------------------------------------------------------------------
// Internal helper — used by NiceActionDomain.hydrateResponse
// ---------------------------------------------------------------------------

/**
 * Reconstruct a loosely-typed NiceActionResponse from its wire format.
 * Called by `NiceActionDomain.hydrateResponse` — not part of the public API.
 *
 * The result's error type is `NiceError<TUnknownNiceErrorDef>` (from `castNiceError`).
 * Use `handleWith` / `forDomain` / `isExact` to narrow on the receiving end.
 */
export function hydrateNiceActionResponse<DOM extends INiceActionDomain>(
  wire: TNiceActionResponse_JsonObject,
  coreAction: NiceAction<
    DOM,
    keyof DOM["actions"] & string,
    DOM["actions"][keyof DOM["actions"] & string]
  >,
): NiceActionResponse<
  DOM,
  keyof DOM["actions"] & string,
  DOM["actions"][keyof DOM["actions"] & string]
> {
  const rawInput = coreAction.schema.deserializeInput(wire.input);
  const primed = new NiceActionPrimed(coreAction, rawInput, { timePrimed: wire.timePrimed });

  if (wire.ok) {
    const rawOutput = coreAction.schema.deserializeOutput(wire.output);
    return new NiceActionResponse(
      primed,
      { ok: true, output: rawOutput },
      { timeResponded: wire.timeResponded },
    );
  }

  return new NiceActionResponse(
    primed,
    { ok: false, error: castNiceError(wire.error) as any },
    { timeResponded: wire.timeResponded },
  );
}
