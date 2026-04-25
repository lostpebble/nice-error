export interface IActionConnectConfig {
  tag?: string;
  /** Default timeout for dispatching actions, in milliseconds. */
  defaultTimeout?: number;
}

/** Route config for a domain or action — controls which named transport handles the dispatch. */
export interface IActionConnectRoute<TKey extends string = string> {
  /** Send via this named transport. Omit to use the default (unnamed) transport. */
  routeKey?: TKey;
}

export interface IDispatchOptions<TKey extends string = string> {
  /** Bypass routing config and send via this named transport instead. */
  routeKey?: TKey;
}
