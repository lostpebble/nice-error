import { castNiceError } from "@nice-code/error";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import { isActionResponseJsonObject } from "../../utils/isActionResponseJsonObject";
import { isPrimedActionJsonObject } from "../../utils/isPrimedActionJsonObject";
import { ActionHandler } from "../ActionHandler/ActionHandler";
import { EActionHandlerType } from "../ActionHandler/ActionHandler.types";
import type {
  IActionConnectConfig,
  IActionConnectTransport,
  IAttachTransportOptions,
  IDispatchOptions,
  IReceiveOptions,
} from "./ActionConnect.types";
import { EErrId_NiceConnect, err_nice_connect } from "./err_nice_connect";

interface IPendingRequest {
  resolve: (response: NiceActionResponse<any>) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any>;
}

const DEFAULT_TIMEOUT = 30_000;

/**
 * ActionConnect — a plug-and-play ActionHandler for cross-environment action routing.
 *
 * Extends ActionHandler so all local handler registration (forAction, forDomain,
 * forDomainActionCases, handleWire) is available out of the box. Transport wiring is
 * layered on top.
 *
 * @example — client (forwards all domain actions to server)
 * ```ts
 * const connect = new ActionConnect({ httpFallbackUrl: "/api/actions" });
 * connect.attachTransport(wsTransport).proxyDomain(myDomain);
 * ws.onmessage = (e) => connect.onMessage(e.data);
 * myRuntime.addHandlers([connect]);
 * ```
 *
 * @example — server (resolves incoming actions locally)
 * ```ts
 * const connect = new ActionConnect();
 * connect.forDomainActionCases(myDomain, {
 *   createUser: { execution: async (p) => ({ id: await db.insert(p.input) }) },
 * });
 *
 * // HTTP endpoint
 * app.post("/actions", async (req, res) => {
 *   const result = await connect.handleWire(await req.json());
 *   if (!result.handled) return res.status(404).end();
 *   res.json(result.response.toJsonObject());
 * });
 *
 * // WebSocket
 * ws.onmessage = (e) => connect.onMessage(e.data, { replyTransport: wsTransport });
 * ```
 *
 * @example — HTTP endpoint that responds via WebSocket when the client has one open
 * ```ts
 * app.post("/actions", async (req, res) => {
 *   const clientWs = wsRegistry.get(req.headers["x-client-id"]);
 *   const result = await connect.handleWire(await req.json());
 *   if (!result.handled) return res.status(404).end();
 *   if (clientWs?.connected) {
 *     clientWs.send(result.response.toJsonString());
 *     return res.status(202).end();
 *   }
 *   res.json(result.response.toJsonObject());
 * });
 * ```
 */
export class ActionConnect extends ActionHandler {
  override readonly handlerType = EActionHandlerType.connect;

  private _pendingRequests = new Map<string, IPendingRequest>();
  private _transports = new Map<string | undefined, IActionConnectTransport>();
  private _config: IActionConnectConfig;

  constructor(config: IActionConnectConfig = {}) {
    super({ tag: config.tag });
    this._config = {
      enableHttpFallback: true,
      requestTimeout: DEFAULT_TIMEOUT,
      ...config,
    };
  }

  /**
   * Register a WebSocket-like transport. Multiple transports can be attached
   * with distinct keys for targeted routing via dispatch({ transportKey }).
   */
  attachTransport(transport: IActionConnectTransport, options?: IAttachTransportOptions): this {
    this._transports.set(options?.key, transport);
    return this;
  }

  /**
   * Register this ActionConnect as a transparent proxy for all actions in the domain.
   * Actions execute locally if a local handler matches; otherwise forwarded via transport.
   * Call this on the client side to forward an entire domain to the server.
   */
  proxyDomain<DOM extends INiceActionDomain>(domain: NiceActionDomain<DOM>): this {
    return this.forDomain(domain, {
      execution: (primed) => this.dispatch(primed),
    });
  }

  /**
   * Override dispatchAction: tries local handlers first, then forwards via transport.
   * This is what the ActionRuntimeEnvironment calls when executing an action.
   */
  override async dispatchAction(primed: NiceActionPrimed<any, any>): Promise<NiceActionResponse<any, any>> {
    const local = await this._tryExecute(primed);
    if (local.handled) return local.response;
    return this._sendViaTransport(primed);
  }

  /**
   * Explicitly dispatch via transport, bypassing local handlers.
   * Used internally by proxyDomain and available for direct use when guaranteed
   * remote execution is needed.
   */
  async dispatch(primed: NiceActionPrimed<any, any>, options?: IDispatchOptions): Promise<NiceActionResponse<any, any>> {
    return this._sendViaTransport(primed, options);
  }

  /**
   * Handle an incoming wire message string.
   *
   * - **Response wire** → resolves the matching pending `dispatch` promise.
   * - **Primed wire** → executes locally via registered handlers, replies via
   *   `options.replyTransport` (or the default transport if none is provided).
   */
  async onMessage(raw: string, options?: IReceiveOptions): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (isActionResponseJsonObject(parsed)) {
      this._resolveResponse(parsed);
      return;
    }

    if (isPrimedActionJsonObject(parsed)) {
      await this._executeAndReply(parsed, options?.replyTransport);
    }
  }

  /**
   * Reject all pending dispatches. Call when the connection drops.
   */
  disconnect(): void {
    for (const [, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(err_nice_connect.fromId(EErrId_NiceConnect.disconnected));
    }
    this._pendingRequests.clear();
  }

  private async _sendViaTransport(
    primed: NiceActionPrimed<any, any>,
    options?: IDispatchOptions,
  ): Promise<NiceActionResponse<any, any>> {
    const wire = primed.toJsonObject();
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(wire.cuid);
        reject(new Error(`Action "${primed.id}" timed out after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(wire.cuid, { resolve, reject, timer, primed });

      const transport =
        this._transports.get(options?.transportKey) ?? this._transports.get(undefined);

      if (transport?.connected) {
        transport.send(JSON.stringify(wire));
        return;
      }

      if (this._config.enableHttpFallback !== false && this._config.httpFallbackUrl != null) {
        this._sendHttp(wire)
          .then((response) => this._resolveResponse(response))
          .catch((err) => this._rejectPending(wire.cuid, err));
        return;
      }

      clearTimeout(timer);
      this._pendingRequests.delete(wire.cuid);
      reject(new Error(`Cannot dispatch "${primed.id}": no connected transport available`));
    });
  }

  private _resolveResponse(wire: TNiceActionResponse_JsonObject): void {
    const pending = this._pendingRequests.get(wire.cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(wire.cuid);
    try {
      pending.resolve(pending.primed.coreAction.actionDomain.hydrateResponse(wire));
    } catch (e) {
      pending.reject(e);
    }
  }

  private _rejectPending(cuid: string, error: unknown): void {
    const pending = this._pendingRequests.get(cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(cuid);
    pending.reject(castNiceError(error));
  }

  private async _executeAndReply(
    wire: INiceActionPrimed_JsonObject,
    replyTransport: IActionConnectTransport | undefined,
  ): Promise<void> {
    const domain = this._domains.get(wire.domain);
    if (domain == null) return;

    let responseWire: TNiceActionResponse_JsonObject;
    let primed: ReturnType<typeof domain.hydratePrimed> | undefined;

    try {
      primed = domain.hydratePrimed(wire);
      const result = await this._tryExecute(primed);

      if (result.handled) {
        responseWire = result.response.toJsonObject();
      } else {
        responseWire = new NiceActionResponse(primed, {
          ok: false,
          error: castNiceError(
            new Error(`No handler for "${wire.id}" in domain "${wire.domain}"`),
          ),
        }).toJsonObject();
      }
    } catch (e) {
      if (primed == null) return;
      responseWire = new NiceActionResponse(primed, {
        ok: false,
        error: castNiceError(e),
      }).toJsonObject();
    }

    const transport = replyTransport ?? this._transports.get(undefined);
    transport?.send(JSON.stringify(responseWire));
  }

  private async _sendHttp(
    wire: INiceActionPrimed_JsonObject,
  ): Promise<TNiceActionResponse_JsonObject> {
    const url = this._config.httpFallbackUrl!;
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wire),
        signal: ac.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP fallback failed: ${res.status} ${res.statusText}`);
      }

      const json: unknown = await res.json();
      if (!isActionResponseJsonObject(json)) {
        throw new Error("HTTP fallback: response is not a valid NiceActionResponse");
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }
}
