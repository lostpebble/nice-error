import type { INiceActionRootDomain } from "../NiceActionDomain.types";
import { NiceActionRootDomain } from "./NiceActionRootDomain";

export const createActionRootDomain = <ROOT_DOM extends INiceActionRootDomain>(definition: {
  domain: ROOT_DOM["domain"];
}) => {
  return new NiceActionRootDomain<ROOT_DOM>(definition);
};
