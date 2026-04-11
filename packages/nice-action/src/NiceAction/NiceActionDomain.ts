import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";

type TInferInputFromSchema<SCH> =
  SCH extends NiceActionSchema<infer IN, any, any>
    ? {
        Input: IN[0];
        SerdeInput: IN[1];
      }
    : never;

export class NiceActionDomain<ACT_DOM extends INiceActionDomain = INiceActionDomain> {
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  private readonly schema: ACT_DOM["schema"];

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.schema = definition.schema;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    const child = new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      schema: subDomainDef.schema,
    });
    return child;
  }

  newAction<ID extends keyof ACT_DOM["schema"]>(
    id: ID,
    input: TInferInputFromSchema<ACT_DOM["schema"][ID]>["Input"],
  ) {
    const actionSchema = this.schema[id];
    if (!actionSchema) {
      throw new Error(`Action with id "${String(id)}" does not exist in domain "${this.domain}".`);
    }

    return new NiceAction(actionSchema);
  }
}
