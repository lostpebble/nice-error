export interface IActionConnectConfig {
  tag?: string;
  /** Default timeout (ms) for all pending requests. Default: 30_000 */
  requestTimeout?: number;
}

export interface IWsTransport {
  send(data: string): void;
  readonly connected: boolean;
}

export interface IHttpTransport {
  /** HTTP POST URL for action dispatch */
  url: string;
  /** Per-transport timeout (ms). Falls back to ActionConnect requestTimeout. */
  timeout?: number;
}

export type IActionConnectTransport = IWsTransport | IHttpTransport;

export interface IAttachTransportOptions {
  /** Named key for this transport — used with route options { transportKey } to target it. */
  key?: string;
}

/** Route config for a domain or action — controls which named transport handles the dispatch. */
export interface IActionConnectRoute<TKey extends string = string> {
  /** Send via this named transport. Omit to use the default (unnamed) transport. */
  transportKey?: TKey;
}

export interface IDispatchOptions<TKey extends string = string> {
  /** Bypass routing config and send via this named transport instead. */
  transportKey?: TKey;
}
