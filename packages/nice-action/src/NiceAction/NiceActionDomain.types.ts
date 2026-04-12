import type { JSONSerializableValue } from "@nice-error/core";
import type { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type { NiceActionDomain } from "./NiceActionDomain";
import type { NiceActionPrimed } from "./NiceActionPrimed";

export type MaybePromise<T> = T | Promise<T>;

export type TNiceActionDomainId = string;

export type TNiceActionDomainIds = [TNiceActionDomainId, ...TNiceActionDomainId[]];

export type TNiceActionDomainSchema = Record<string, NiceActionSchema>;

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
  _dispatchAction(primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>): Promise<unknown>;
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
> = (
  action: NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]>,
) => MaybePromise<unknown>;

/**
 * Observer called after each action is dispatched.
 * Return value is ignored. Use for logging, metrics, tracing, etc.
 */
export type TActionListener = (
  action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
) => MaybePromise<void>;

/**
 * A single case in a `setActionHandler`.
 *
 * Construct via `forDomain` / `forActionId` / `forActionIds` — do not build directly.
 */
export interface IActionCase<ACT_DOM extends INiceActionDomainDef> {
  readonly _domain: NiceActionDomain<ACT_DOM>;
  readonly _ids: ReadonlyArray<string> | undefined;
  readonly _handler: TActionHandlerForDomain<ACT_DOM>;
}

/**
 * Wire format for a serialized NiceActionPrimed — safe to JSON.stringify / transmit.
 */
export interface ISerializedNiceAction {
  domain: string;
  actionId: string;
  input: JSONSerializableValue;
}

export interface IActionHandlerWithId<ACT_DOM extends INiceActionDomainDef> {
  id: string;
  handler: NiceActionHandler<ACT_DOM>;
}
