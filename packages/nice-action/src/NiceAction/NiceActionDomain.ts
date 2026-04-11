import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";

export class NiceActionDomain<ACT_DOM extends INiceActionDomain> {
  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    const child = new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>();
    return child;
  }
}
