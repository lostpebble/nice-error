import type { INiceActionDomain } from "./NiceActionDomain.types";

export interface INiceAction<ID extends string, DOM extends INiceActionDomain<any>> {
  id: ID;
  domain: DOM["domain"];
  allDomains: DOM["allDomains"];
  schema: DOM["schema"][ID];
}
