import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type {
  INiceActionErrorDeclaration,
  TTransportedValue,
} from "../ActionSchema/NiceActionSchema.types";

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

export type TDomainActionId<DOM extends INiceActionDomain> = keyof DOM["actions"] & string;

export type TInferInputFromSchema<SCH extends NiceActionSchema<any, any, any>> =
  SCH extends NiceActionSchema<infer IN, any, any>
    ? {
        Input: IN[0];
        SerdeInput: IN[1];
      }
    : never;

export type TInferOutputFromSchema<SCH extends NiceActionSchema<any, any, any>> =
  SCH extends NiceActionSchema<any, infer OUT, any>
    ? {
        Output: OUT[0];
        SerdeOutput: OUT[1];
      }
    : never;
