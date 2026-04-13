import { NiceActionDomain } from "./NiceActionDomain";
import type { INiceActionDomain } from "./NiceActionDomain.types";

export const createActionDomain = <ACT_DOM extends Omit<INiceActionDomain, "allDomains">>(
  definition: ACT_DOM,
) => {
  return new NiceActionDomain({
    ...definition,
    allDomains: [definition.domain],
  });
};
