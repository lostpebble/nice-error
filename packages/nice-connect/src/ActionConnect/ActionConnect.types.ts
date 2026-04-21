import type { IActionHandlerConfig, NiceActionPrimed } from "@nice-code/action";

export enum EActionConnectRole {
  client = "client",
  server = "server",
}

export interface IActionConnectConfig extends IActionHandlerConfig {
  /** Whether this node is a client (frontend) or server (backend). Determines HTTP fallback eligibility. */
  role: EActionConnectRole;
  /** URL for HTTP fallback POST requests. Required when role is "client" and HTTP fallback is enabled. */
  httpFallbackUrl?: string;
  /** Enable HTTP POST fallback when WebSocket is unavailable. Clients only. Default: true */
  enableHttpFallback?: boolean;
  /** Timeout in milliseconds for pending dispatched requests. Default: 30_000 */
  requestTimeout?: number;
}

export interface IActionConnectTransport {
  send(data: string): void;
  readonly connected: boolean;
}

export interface IPendingRequest {
  resolve: (output: unknown) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any, any, any>;
}

export interface IDispatchOptions {
  /** Route this dispatch to a specific named environment's transport. */
  environment?: string;
}
