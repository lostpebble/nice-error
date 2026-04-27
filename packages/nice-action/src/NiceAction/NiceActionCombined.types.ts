import type { INiceActionDomain } from "../ActionDomain/NiceActionDomain.types";
import type { NiceAction } from "./NiceAction";
import type { INiceAction } from "./NiceAction.types";
import type { NiceActionPrimed } from "./NiceActionPrimed";
import type { NiceActionResponse } from "./NiceActionResponse";

export type TNiceActionInstanceAny<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
> =
  | NiceAction<DOM, ID, DOM["actions"][ID]>
  | NiceActionPrimed<DOM, ID, DOM["actions"][ID]>
  | NiceActionResponse<DOM, ID, DOM["actions"][ID]>;

export type TNarrowActionType<
  ACT extends INiceAction<any>,
  D extends INiceActionDomain,
  ID extends keyof D["actions"] & string = keyof D["actions"] & string,
> =
  ACT extends NiceActionResponse<any>
    ? NiceActionResponse<D, ID>
    : ACT extends NiceActionPrimed<any>
      ? NiceActionPrimed<D, ID>
      : ACT extends NiceAction<any>
        ? NiceAction<D, ID>
        : INiceAction<D, ID>;

export type TDistributedDomainActions<ACT extends INiceAction<any>, DOM extends INiceActionDomain> =
  { [ID in keyof DOM["actions"] & string]: TNarrowActionType<ACT, DOM, ID> }[keyof DOM["actions"] & string];
