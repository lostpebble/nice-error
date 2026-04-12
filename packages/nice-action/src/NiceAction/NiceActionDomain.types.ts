import type { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type { NiceActionDomain } from "./NiceActionDomain";
import type { NiceActionPrimed } from "./NiceActionPrimed";

export type TNiceActionDomainId = string;

export type TNiceActionDomainIds = [TNiceActionDomainId, ...TNiceActionDomainId[]];

export type TNiceActionDomainSchema = Record<string, NiceActionSchema>;

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
  handler?: NiceActionHandler<any>;
}

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
    : undefined;

export type TActionHandlerForDomain<ACT_DOM extends INiceActionDomain> = (
  action: NiceActionPrimed<ACT_DOM, ACT_DOM["schema"][string]>,
) => Promise<TInferOutputFromSchema<ACT_DOM["schema"][string]>["Output"]>;

/**
 * A single case in a `setActionHandler`
 *
 * Construct via `forDomain` or `forIds` — do not build this object directly.
 */
export interface IActionCase<ACT_DOM extends INiceActionDomain> {
  readonly _domain: NiceActionDomain<ACT_DOM>;
  readonly _ids: ReadonlyArray<keyof ACT_DOM["schema"]> | undefined;
  readonly _handler: TActionHandlerForDomain<ACT_DOM>;
}

export interface IActionHandlerWithId<ACT_DOM extends INiceActionDomain> {
  id: string;
  handler: NiceActionHandler<ACT_DOM>;
}
