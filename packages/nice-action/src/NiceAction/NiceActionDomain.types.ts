import type { INiceActionSchema } from "./ActionSchema/NiceActionSchema.types";

export type TNiceActionDomainId = string;

export type TNiceActionDomainIds = [TNiceActionDomainId, ...TNiceActionDomainId[]];

export type TNiceActionDomainSchema = Record<string, INiceActionSchema>;

export interface INiceActionDomainChildOptions<
  ERR_DOMAIN extends string = string,
  SCHEMA extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: ERR_DOMAIN;
  schema: SCHEMA;
}

export type TNiceActionDomainChildDef<
  PARENT_DEF extends INiceActionDomain,
  SUB extends INiceActionDomainChildOptions,
> = {
  domain: SUB["domain"];
  allDomains: [SUB["domain"], ...PARENT_DEF["allDomains"]];
  schema: SUB["schema"];
};

export interface INiceActionDomain<
  IDS extends TNiceActionDomainIds = TNiceActionDomainIds,
  SCH extends TNiceActionDomainSchema = TNiceActionDomainSchema,
> {
  domain: IDS[0];
  allDomains: IDS;
  schema: SCH;
}
