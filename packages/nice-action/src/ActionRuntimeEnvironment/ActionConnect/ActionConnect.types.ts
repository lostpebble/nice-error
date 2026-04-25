import type { NiceError } from "@nice-code/error";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../NiceAction/NiceActionResponse";

// export enum EActionConnectRole {
//   client = "client",
//   server = "server",
// }

export interface IActionConnectConfig {
  tag?: string;
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
  resolve: (output: NiceActionResponse<any>) => void;
  reject: (error: NiceError) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any>;
}

export interface IDispatchOptions {
  /** Route this dispatch to a specific named environment's transport. */
  envId?: string;
}
