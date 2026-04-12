import { NiceActionDomain } from "./NiceActionDomain";
import type { INiceActionDomainDef } from "./NiceActionDomain.types";

export const createActionDomain = <ACT_DOM extends Omit<INiceActionDomainDef, "allDomains">>(
  definition: ACT_DOM,
) => {
  return new NiceActionDomain({
    ...definition,
    allDomains: [definition.domain],
  });
};
