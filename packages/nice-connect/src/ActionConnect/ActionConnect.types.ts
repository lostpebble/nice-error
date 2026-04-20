import type { NiceActionDomain } from "@nice-code/action";
import type { INiceActionDomain } from "@nice-code/action";
import type { NiceActionPrimed } from "@nice-code/action";

export type TConnectRole = "client" | "server";

export interface IActionConnectConfig {
  /** Whether this node is a client (frontend) or server (backend). Determines HTTP fallback eligibility. */
  role: TConnectRole;
  /** URL for HTTP fallback POST requests. Required when role is "client" and HTTP fallback is enabled. */
  httpFallbackUrl?: string;
  /** Enable HTTP POST fallback when WebSocket is unavailable. Clients only. Default: true */
  enableHttpFallback?: boolean;
  /** Timeout in milliseconds for pending dispatched requests. Default: 30_000 */
  requestTimeout?: number;
}

export interface IConnectorRegistrationOptions {
  /** Scope this connector to a named environment. Inbound actions carry an optional ncEnv field to select it. */
  environment?: string;
}

export interface IRequesterRegistrationOptions extends IConnectorRegistrationOptions {
  /** Domains used to hydrate incoming wire primed actions before passing to the requester. */
  domains: NiceActionDomain<INiceActionDomain>[];
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
  /** Route this dispatch to a specific named environment's transport and handlers. */
  environment?: string;
}
