import type { INiceActionDomain } from "../ActionDomain/NiceActionDomain.types";
import type { NiceAction } from "./NiceAction";
import type { NiceActionPrimed } from "./NiceActionPrimed";
import type { NiceActionResponse } from "./NiceActionResponse";

export type TNiceActionInstanceAny<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
> =
  | NiceAction<DOM, ID, DOM["actions"][ID]>
  | NiceActionPrimed<DOM, ID, DOM["actions"][ID]>
  | NiceActionResponse<DOM, ID, DOM["actions"][ID]>;
