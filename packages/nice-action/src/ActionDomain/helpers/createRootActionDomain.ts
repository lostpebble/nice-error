import type { INiceActionRootDomain } from "../NiceActionDomain.types";
import { NiceActionRootDomain } from "../RootDomain/NiceActionRootDomain";

export const createActionRootDomain = <ID extends string>(definition: { domain: ID }) => {
  return new NiceActionRootDomain<INiceActionRootDomain<ID>>(definition);
};
