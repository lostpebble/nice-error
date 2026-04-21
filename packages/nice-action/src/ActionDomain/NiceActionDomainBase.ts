import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceActionDomain } from "./NiceActionDomain";
import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";

export class NiceActionDomainBase<ACT_DOM extends INiceActionDomain = INiceActionDomain>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["actions"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly actions: ACT_DOM["actions"];

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.actions = definition.actions;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    if (this.allDomains.includes(subDomainDef.domain)) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_already_exists_in_hierarchy, {
        domain: subDomainDef.domain,
        parentDomain: this.domain,
      });
    }

    return new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      actions: subDomainDef.actions,
    });
  }
}
