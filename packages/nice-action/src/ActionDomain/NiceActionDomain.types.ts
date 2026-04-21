import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type {
  INiceActionErrorDeclaration,
  TTransportedValue,
} from "../ActionSchema/NiceActionSchema.types";
import type { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

export type MaybePromise<T> = T | Promise<T>;

export type TPossibleDomainId = string;

export type TPossibleDomainIdList = [TPossibleDomainId, ...TPossibleDomainId[]];

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
export interface INiceActionDomain<
  IDS extends TPossibleDomainIdList = TPossibleDomainIdList,
  SCH extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: IDS[0] & string;
  allDomains: IDS;
  actions: SCH;
}

export interface INiceActionRootDomain<ID extends TPossibleDomainId = TPossibleDomainId>
  extends INiceActionDomain<[ID], {}> {
  domain: ID;
  allDomains: [ID];
  actions: {};
}

/**
 * Structural interface implemented by `NiceActionDomainResolver`.
 * Used by `NiceActionDomain` to avoid a circular import with the concrete class.
 *
 * `_resolvePrimed` is the inline dispatch path — calls the registered fn directly
 * without re-serializing/deserializing. Errors from the fn propagate naturally.
 */
// export interface INiceActionResolverLike {
//   _resolvePrimed(
//     primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
//   ): Promise<unknown>;
// }

export interface INiceActionDomainChildOptions<
  ERR_DOMAIN extends string = string,
  SCHEMA extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: ERR_DOMAIN;
  actions: SCHEMA;
}

export type TNiceActionDomainChildDef<
  PARENT_DEF extends INiceActionDomain,
  SUB extends INiceActionDomainChildOptions,
> = {
  domain: SUB["domain"];
  allDomains: [SUB["domain"], ...PARENT_DEF["allDomains"]];
  actions: SUB["actions"];
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

/**
 * Handler registered via forDomain.
 *
 * `act.input` is typed as the union of input types for every action in `ACT_DOM`,
 * and `act.coreAction` carries the matching schema — the same narrowing you get
 * from `forActionIds` over all action IDs in the domain.
 */
export type TActionHandlerForDomain<ACT_DOM extends INiceActionDomain> = (
  action: NiceActionPrimed<
    ACT_DOM,
    keyof ACT_DOM["actions"] & string,
    ACT_DOM["actions"][keyof ACT_DOM["actions"] & string]
  >,
) => MaybePromise<unknown>;

/**
 * Handler registered via forActionId — receives a specific action ID, with
 * the primed action's input narrowed to that ID's schema.
 */
export type TActionIdHandlerForDomain<
  ACT_DOM extends INiceActionDomain,
  ID extends keyof ACT_DOM["actions"] & string,
> = (action: NiceActionPrimed<ACT_DOM, ID, ACT_DOM["actions"][ID]>) => MaybePromise<unknown>;

/**
 * Observer called after each action is dispatched.
 * Return value is ignored. Use for logging, metrics, tracing, etc.
 */
export type TActionListener = (action: NiceActionPrimed<any, any, any>) => MaybePromise<void>;

/**
 * Broad handler signature used internally for storage and dispatch.
 * Public-facing registration methods use narrower types (`TActionHandlerForDomain`,
 * `TActionIdHandlerForDomain`); they are cast to this for storage.
 */
export type TBroadActionRequester<P extends NiceActionPrimed<any, any, any>> = (
  action: P,
) => MaybePromise<unknown>;

/**
 * A single case in a `NiceActionRequester`.
 *
 * Construct via `forDomain` / `forActionId` / `forActionIds` — do not build directly.
 */
export interface IActionCase<
  P extends NiceActionPrimed<any, any, any> = NiceActionPrimed<any, any, any>,
> {
  readonly _matcher: (action: P) => boolean;
  readonly _requester: TBroadActionRequester<P>;
}

export type TDomainActionId<DOM extends INiceActionDomain> = keyof DOM["actions"] & string;
