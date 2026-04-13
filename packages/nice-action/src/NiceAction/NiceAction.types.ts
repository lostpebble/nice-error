import type { INiceErrorJsonObject } from "@nice-error/core";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";

export interface INiceAction<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["schema"] & string,
> {
  id: ID;
  domain: DOM["domain"];
  allDomains: DOM["allDomains"];
  schema: DOM["schema"][ID];
}
/**
 * Wire format for a serialized NiceActionPrimed — safe to JSON.stringify / transmit.
 */

export interface INiceAction_JsonObject<
  DOM extends INiceActionDomain = INiceActionDomain,
  ID extends keyof DOM["schema"] & string = keyof DOM["schema"] & string,
> {
  domain: DOM["domain"];
  allDomains: DOM["allDomains"];
  id: ID;
}

export interface INiceActionPrimed_JsonObject<
  DOM extends INiceActionDomain = INiceActionDomain,
  ID extends keyof DOM["schema"] & string = keyof DOM["schema"] & string,
> extends INiceAction_JsonObject<DOM, ID> {
  input: TInferInputFromSchema<DOM["schema"][ID]>["SerdeInput"];
}

/**
 * Return type of `executeSafe` — a discriminated union of success and failure.
 *
 * - `{ ok: true; value: OUT }` — the action completed and returned `OUT`
 * - `{ ok: false; error: ERR }` — the action threw; `ERR` is the declared error union
 *
 * @example
 * ```ts
 * const result = await domain.action("getUser").executeSafe({ userId: "123" });
 * if (!result.ok) {
 *   result.error.handleWith([
 *     forDomain(err_auth, (h) => res.status(401).end()),
 *   ]);
 *   return;
 * }
 * console.log(result.value); // typed as the action's OUTPUT
 * ```
 */
export type NiceActionResult<OUT, ERR> = { ok: true; output: OUT } | { ok: false; error: ERR };

/**
 * Wire format for a serialized NiceActionResponse — safe to JSON.stringify / transmit.
 *
 * Carries the original action identity (domain + actionId + serialized input) alongside
 * either the serialized output value or a serialized NiceError.
 *
 * Produced by `NiceActionResponse.toJsonObject()`.
 * Reconstructed by `NiceActionDomain.hydrateResponse()`.
 */

export interface INiceActionResponse_JsonObject_Success<
  DOM extends INiceActionDomain = INiceActionDomain,
  ID extends keyof DOM["schema"] & string = keyof DOM["schema"] & string,
> extends INiceActionPrimed_JsonObject<DOM, ID> {
  ok: true;
  output: TInferOutputFromSchema<DOM["schema"][ID]>["SerdeOutput"];
}

export interface INiceActionResponse_JsonObject_Failure<
  DOM extends INiceActionDomain = INiceActionDomain,
  ID extends keyof DOM["schema"] & string = keyof DOM["schema"] & string,
> extends INiceActionPrimed_JsonObject<DOM, ID> {
  ok: false;
  error: INiceErrorJsonObject;
}

export type TNiceActionResponse_JsonObject<
  DOM extends INiceActionDomain = INiceActionDomain,
  ID extends keyof DOM["schema"] & string = keyof DOM["schema"] & string,
> =
  | INiceActionResponse_JsonObject_Success<DOM, ID>
  | INiceActionResponse_JsonObject_Failure<DOM, ID>;
/* 
export type INiceActionResponse_JsonObject =
  | {
      domain: string;
      actionId: string;
      input: JSONSerializableValue;
      ok: true;
      value: JSONSerializableValue;
    }
  | {
      domain: string;
      actionId: string;
      input: JSONSerializableValue;
      ok: false;
      error: INiceErrorJsonObject;
    };
 */
