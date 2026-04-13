import { castNiceError } from "@nice-error/core";
import type {
  INiceActionDomain,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceAction,
  NiceActionResult,
  TNiceActionResponse_JsonObject,
} from "./NiceAction.types";
import { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceActionResponse<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["schema"] & string,
  SCH extends DOM["schema"][ID],
> implements Omit<INiceAction<DOM, ID>, "schema">
{
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;
  readonly primed: NiceActionPrimed<DOM, ID, SCH>;
  readonly result: NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>;

  constructor(
    primed: NiceActionPrimed<DOM, ID, SCH>,
    result: NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>,
  ) {
    this.primed = primed;
    this.result = result;
    this.domain = primed.coreAction.domain;
    this.allDomains = primed.coreAction.allDomains;
    this.id = primed.coreAction.id;
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
        ok: true,
        output: this.primed.coreAction.schema.serializeOutput(this.result.output),
      };
    }

    return {
      ...base,
      ok: false,
      error: this.result.error.toJsonObject(),
    };
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
    keyof DOM["schema"] & string,
    DOM["schema"][keyof DOM["schema"] & string]
  >,
): NiceActionResponse<
  DOM,
  keyof DOM["schema"] & string,
  DOM["schema"][keyof DOM["schema"] & string]
> {
  const rawInput = coreAction.schema.deserializeInput(wire.input);
  const primed = new NiceActionPrimed(coreAction, rawInput);

  if (wire.ok) {
    const rawOutput = coreAction.schema.deserializeOutput(wire.output);
    return new NiceActionResponse(primed, { ok: true, output: rawOutput });
  }

  return new NiceActionResponse(primed, { ok: false, error: castNiceError(wire.error) as any });
}
