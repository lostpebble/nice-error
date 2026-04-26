import type { NiceActionResponse } from "../..";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";

export interface IActionConnectConfig {
  tag?: string;
  /** Default timeout for dispatching actions, in milliseconds. */
  requestTimeout?: number;
}

/** Route config for a domain or action — controls which named transport handles the dispatch. */
export interface IActionConnectRoute<DOM extends INiceActionDomain, TKey extends string = string> {
  /** Send via this named transport. Omit to use the default (unnamed) transport. */
  routeKey?: TKey;
  onResponse?: (response: NiceActionResponse<DOM>) => void;
}

export interface IDispatchOptions<TKey extends string = string> {
  /** Bypass routing config and send via this named transport instead. */
  routeKey?: TKey;
}
