import { castNiceError } from "@nice-error/core";
import type { TInferActionError } from "./ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  ISerializedNiceActionResponse,
  NiceActionResult,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceActionResponse<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["schema"] & string,
> {
  readonly primed: NiceActionPrimed<DOM, ID, DOM["schema"][ID]>;
  readonly result: NiceActionResult<
    TInferOutputFromSchema<DOM["schema"][ID]>["Output"],
    TInferActionError<DOM["schema"][ID]>
  >;

  constructor(
    primed: NiceActionPrimed<DOM, ID, DOM["schema"][ID]>,
    result: NiceActionResult<
      TInferOutputFromSchema<DOM["schema"][ID]>["Output"],
      TInferActionError<DOM["schema"][ID]>
    >,
  ) {
    this.primed = primed;
    this.result = result;
  }

  /**
   * Serialize this response to a JSON-safe wire format.
   *
   * On success, the output is passed through the schema's serialize function
   * if one is defined, otherwise used as-is.
   * On failure, the error is serialized via `NiceError.toJsonObject()`.
   */
  toJsonObject(): ISerializedNiceActionResponse {
    const base = {
      domain: this.primed.coreAction.domain,
      actionId: this.primed.coreAction.id,
      input: this.primed.coreAction.schema.serializeInput(this.primed.input),
    };

    if (this.result.ok) {
      return {
        ...base,
        ok: true,
        value: this.primed.coreAction.schema.serializeOutput(this.result.value),
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
export function hydrateNiceActionResponse(
  wire: ISerializedNiceActionResponse,
  coreAction: NiceAction<INiceActionDomain, string, INiceActionDomain["schema"][string]>,
): NiceActionResponse<INiceActionDomain, string> {
  const rawInput = coreAction.schema.deserializeInput(wire.input);
  const primed = new NiceActionPrimed(coreAction, rawInput);

  if (wire.ok) {
    const rawOutput = coreAction.schema.deserializeOutput(wire.value);
    return new NiceActionResponse(primed, { ok: true, value: rawOutput });
  }

  return new NiceActionResponse(primed, { ok: false, error: castNiceError(wire.error) as any });
}
