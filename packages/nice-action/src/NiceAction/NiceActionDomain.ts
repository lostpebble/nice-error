import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";

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

  createAction<ID extends keyof ACT_DOM["schema"]>(id: ID, input: ACT_DOM["schema"][ID]["input"]) {
    const actionSchema = this.schema[id];
    if (!actionSchema) {
      throw new Error(`Action with id "${String(id)}" does not exist in domain "${this.domain}".`);
    }
  }
}
