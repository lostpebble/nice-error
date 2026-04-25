export interface IActionConnectConfig {
  tag?: string;
  /** URL for HTTP fallback POST requests. Required when enableHttpFallback is true. */
  httpFallbackUrl?: string;
  /** Enable HTTP POST fallback when no WebSocket transport is connected. Default: true */
  enableHttpFallback?: boolean;
  /** Timeout (ms) for pending dispatched requests. Default: 30_000 */
  requestTimeout?: number;
}

export interface IActionConnectTransport {
  send(data: string): void;
  readonly connected: boolean;
}

export interface IAttachTransportOptions {
  /** Named key for this transport — used with dispatch({ transportKey }) to target it. */
  key?: string;
}

export interface IDispatchOptions {
  /** Route this dispatch to a named transport instead of the default. */
  transportKey?: string;
}

export interface IReceiveOptions {
  /** Transport to reply on when handling an incoming primed action. */
  replyTransport?: IActionConnectTransport;
}
