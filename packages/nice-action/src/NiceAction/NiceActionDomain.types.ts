import type { INiceErrorJsonObject, JSONSerializableValue } from "@nice-error/core";
import type { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type {
  INiceActionErrorDeclaration,
  TTransportedValue,
} from "./ActionSchema/NiceActionSchema.types";
import type { NiceActionPrimed } from "./NiceActionPrimed";

export type MaybePromise<T> = T | Promise<T>;

export type TNiceActionDomainId = string;

export type TNiceActionDomainIds = [TNiceActionDomainId, ...TNiceActionDomainId[]];

export type TNiceActionDomainSchema = Record<
  string,
  NiceActionSchema<
    TTransportedValue<any, any>,
    TTransportedValue<any, any>,
    readonly INiceActionErrorDeclaration<any, any>[]
  >
>;

/**
 * Data shape for a domain — used for construction and as the type-level schema carrier.
 * Does NOT include class methods.
 */
export interface INiceActionDomainDef<
  IDS extends TNiceActionDomainIds = TNiceActionDomainIds,
  SCH extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: IDS[0];
  allDomains: IDS;
  schema: SCH;
}

/**
 * Full domain contract — extends the data shape with the dispatch method.
 * Implemented by NiceActionDomain. Used as the constraint on NiceAction / NiceActionPrimed.
 */
export interface INiceActionDomain<
  IDS extends TNiceActionDomainIds = TNiceActionDomainIds,
  SCH extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> extends INiceActionDomainDef<IDS, SCH> {
  _dispatchAction(
    primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
    envId?: string,
  ): Promise<unknown>;
}

/**
 * Structural interface implemented by `NiceActionDomainResolver`.
 * Used by `NiceActionDomain` to avoid a circular import with the concrete class.
 *
 * `_resolvePrimed` is the inline dispatch path — calls the registered fn directly
 * without re-serializing/deserializing. Errors from the fn propagate naturally.
 */
export interface INiceActionResolverLike {
  _resolvePrimed(
    primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
  ): Promise<unknown>;
}

export interface INiceActionDomainChildOptions<
  ERR_DOMAIN extends string = string,
  SCHEMA extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: ERR_DOMAIN;
  schema: SCHEMA;
}

export type TNiceActionDomainChildDef<
  PARENT_DEF extends INiceActionDomainDef,
  SUB extends INiceActionDomainChildOptions,
> = {
  domain: SUB["domain"];
  allDomains: [SUB["domain"], ...PARENT_DEF["allDomains"]];
  schema: SUB["schema"];
};

export type TInferInputFromSchema<SCH> =
  SCH extends NiceActionSchema<infer IN, any, any>
    ? {
        Input: IN[0];
        SerdeInput: IN[1];
      }
    : never;

export type TInferOutputFromSchema<SCH> =
  SCH extends NiceActionSchema<any, infer OUT, any>
    ? {
        Output: OUT[0];
        SerdeOutput: OUT[1];
      }
    : never;

/** Handler registered via forDomain — receives any action from a matching domain. */
export type TActionHandlerForDomain<ACT_DOM extends INiceActionDomainDef> = (
  action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
) => MaybePromise<unknown>;

/**
 * Handler registered via forActionId — receives a specific action ID, with
 * the primed action's input narrowed to that ID's schema.
 */
export type TActionIdHandlerForDomain<
  ACT_DOM extends INiceActionDomainDef,
  ID extends keyof ACT_DOM["schema"] & string,
> = (action: NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]>) => MaybePromise<unknown>;

/**
 * Observer called after each action is dispatched.
 * Return value is ignored. Use for logging, metrics, tracing, etc.
 */
export type TActionListener = (
  action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
) => MaybePromise<void>;

/**
 * A single case in a `NiceActionHandler`.
 *
 * Construct via `forDomain` / `forActionId` / `forActionIds` — do not build directly.
 */
export interface IActionCase {
  readonly _matcher: (
    action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
  ) => boolean;
  readonly _handler: TActionHandlerForDomain<INiceActionDomainDef>;
}

/**
 * Wire format for a serialized NiceActionPrimed — safe to JSON.stringify / transmit.
 */
export interface ISerializedNiceAction {
  domain: string;
  actionId: string;
  input: JSONSerializableValue;
}

export interface IActionHandlerWithId {
  id: string;
  handler: NiceActionHandler;
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
export type NiceActionResult<OUT, ERR> = { ok: true; value: OUT } | { ok: false; error: ERR };

/**
 * Wire format for a serialized NiceActionResponse — safe to JSON.stringify / transmit.
 *
 * Carries the original action identity (domain + actionId + serialized input) alongside
 * either the serialized output value or a serialized NiceError.
 *
 * Produced by `NiceActionResponse.toJsonObject()`.
 * Reconstructed by `NiceActionDomain.hydrateResponse()`.
 */
export type ISerializedNiceActionResponse =
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
