import { castNiceError } from "@nice-code/error";
import { nanoid } from "nanoid/non-secure";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { TNiceActionResponse_JsonObject } from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import { isActionResponseJsonObject } from "../../utils/isActionResponseJsonObject";
import {
  EActionHandlerType,
  type IActionHandler,
  type TMatchHandlerKey,
} from "../ActionHandler/ActionHandler.types";
import type {
  IActionConnectConfig,
  IActionConnectRoute,
  IActionConnectTransport,
  IAttachTransportOptions,
  IDispatchOptions,
  IHttpTransport,
  IWsTransport,
} from "./ActionConnect.types";
import { EErrId_NiceConnect, err_nice_connect } from "./err_nice_connect";

interface IPendingRequest {
  resolve: (response: NiceActionResponse<any>) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any>;
}

const DEFAULT_TIMEOUT = 30_000;

function isWsTransport(t: IActionConnectTransport): t is IWsTransport {
  return typeof (t as IWsTransport).send === "function";
}

/**
 * ActionConnect — a pure transport router for cross-environment action dispatch.
 *
 * Implements IActionHandler so it can be registered in an ActionRuntimeEnvironment
 * alongside ActionHandlers. When an action matches a routing rule, it is forwarded
 * via the configured transport (WebSocket or HTTP).
 *
 * Local execution is NOT done here — use ActionHandler for that.
 *
 * @example — client: route all demo domain actions via WebSocket with HTTP fallback
 * ```ts
 * const ac = new ActionConnect()
 *   .attachTransport({ send: (d) => ws.send(d), get connected() { return ws.readyState === WebSocket.OPEN; } })
 *   .attachTransport({ url: "/api/actions" })
 *   .routeDomain(act_domain_demo);
 *
 * ws.onmessage = (e) => ac.onMessage(e.data);
 * myRuntime.addHandlers([ac]);
 * ```
 *
 * @example — route different actions to different backends
 * ```ts
 * const ac = new ActionConnect()
 *   .attachTransport(primaryWs)
 *   .attachTransport(edgeWs, { key: "edge" })
 *   .routeDomain(act_domain_demo)
 *   .routeAction(act_domain_demo, "heavyOp", { transportKey: "edge" });
 * ```
 *
 * @example — server: receive and execute actions (ActionConnect not needed)
 * ```ts
 * const handler = new ActionHandler()
 *   .forDomainActionCases(myDomain, {
 *     createUser: { execution: async (p) => ({ id: await db.insert(p.input) }) },
 *   });
 *
 * ws.onmessage = async (event) => {
 *   const result = await handler.handleWire(JSON.parse(event.data));
 *   if (result.handled) ws.send(result.response.toJsonString());
 * };
 * ```
 */
export class ActionConnect<TTransportKey extends string = never> implements IActionHandler {
  readonly tag: string | "_";
  readonly handlerType = EActionHandlerType.connect;
  readonly cuid: string;

  private _config: IActionConnectConfig;
  private _wsTransports = new Map<string | undefined, IWsTransport>();
  private _httpTransports = new Map<string | undefined, IHttpTransport>();
  private _routesByAction = new Map<string, IActionConnectRoute>();
  private _handlerKeys = new Set<TMatchHandlerKey>();
  private _pendingRequests = new Map<string, IPendingRequest>();

  constructor(config: IActionConnectConfig = {}) {
    this.tag = config.tag ?? "_";
    this.cuid = nanoid();
    this._config = { requestTimeout: DEFAULT_TIMEOUT, ...config };
  }

  get allHandlerKeys(): TMatchHandlerKey[] {
    return [...this._handlerKeys];
  }

  /**
   * Register a transport. Pass a WebSocket-like object `{ send, connected }` for
   * real-time dispatch, or an HTTP object `{ url }` for HTTP POST dispatch.
   *
   * An HTTP transport without a key becomes the automatic fallback when no
   * connected WebSocket transport is available for a given dispatch.
   *
   * Multiple transports can be attached with distinct keys for targeted routing
   * via `routeAction({ transportKey })`.
   */
  attachTransport<K extends string>(
    transport: IActionConnectTransport,
    options: IAttachTransportOptions & { key: K },
  ): ActionConnect<TTransportKey | K>;
  attachTransport(
    transport: IActionConnectTransport,
    options?: IAttachTransportOptions & { key?: undefined },
  ): this;
  attachTransport(transport: IActionConnectTransport, options?: IAttachTransportOptions): any {
    if (isWsTransport(transport)) {
      this._wsTransports.set(options?.key, transport);
    } else {
      this._httpTransports.set(options?.key, transport);
    }
    return this;
  }

  /**
   * Route all actions in a domain via transport. An optional transportKey targets
   * a specific named transport; omit it to use the default (unnamed) transport.
   */
  routeDomain<DOM extends INiceActionDomain>(
    domain: NiceActionDomain<DOM>,
    route: IActionConnectRoute<TTransportKey> = {},
  ): this {
    this._routesByAction.set(`${domain.domain}::_`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::_`);
    return this;
  }

  /**
   * Route a specific action via transport. Takes priority over routeDomain for the
   * same domain. An optional transportKey targets a specific named transport.
   */
  routeAction<DOM extends INiceActionDomain, ID extends keyof DOM["actions"] & string>(
    domain: NiceActionDomain<DOM>,
    id: ID,
    route: IActionConnectRoute<TTransportKey> = {},
  ): this {
    this._routesByAction.set(`${domain.domain}::${id}`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::${id}`);
    return this;
  }

  /**
   * Route multiple action IDs via transport. Each action shares the same route config.
   */
  routeActionIds<
    DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof DOM["actions"] & string>,
  >(domain: NiceActionDomain<DOM>, ids: IDS, route: IActionConnectRoute<TTransportKey> = {}): this {
    for (const id of ids) {
      this.routeAction(domain, id, route);
    }
    return this;
  }

  /**
   * Dispatch a primed action via the matching transport route.
   * Called by ActionRuntimeEnvironment when an action's key matches this handler.
   */
  async dispatchAction(primed: NiceActionPrimed<any, any>): Promise<NiceActionResponse<any, any>> {
    const route =
      this._routesByAction.get(`${primed.domain}::${primed.id}`) ??
      this._routesByAction.get(`${primed.domain}::_`);
    return this._sendViaTransport(primed, route?.transportKey);
  }

  /**
   * Explicitly dispatch via a specific transport, bypassing routing config.
   */
  async dispatch(
    primed: NiceActionPrimed<any, any>,
    options?: IDispatchOptions<TTransportKey>,
  ): Promise<NiceActionResponse<any, any>> {
    return this._sendViaTransport(primed, options?.transportKey);
  }

  /**
   * Handle an incoming wire message. Only response wires are processed here —
   * they resolve the matching pending dispatch promise. Primed action wires
   * are ignored (use ActionHandler.handleWire on the server side).
   */
  async onMessage(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (isActionResponseJsonObject(parsed)) {
      this._resolveResponse(parsed);
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
    transportKey: string | undefined,
  ): Promise<NiceActionResponse<any, any>> {
    const wire = primed.toJsonObject();
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(wire.cuid);
        reject(new Error(`Action "${primed.id}" timed out after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(wire.cuid, { resolve, reject, timer, primed });

      const wsTransport =
        this._wsTransports.get(transportKey) ?? this._wsTransports.get(undefined);

      if (wsTransport?.connected) {
        wsTransport.send(JSON.stringify(wire));
        return;
      }

      const httpTransport =
        this._httpTransports.get(transportKey) ?? this._httpTransports.get(undefined);

      if (httpTransport != null) {
        this._sendHttp(wire, httpTransport)
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

  private async _sendHttp(
    wire: ReturnType<NiceActionPrimed<any, any>["toJsonObject"]>,
    transport: IHttpTransport,
  ): Promise<TNiceActionResponse_JsonObject> {
    const timeout = transport.timeout ?? this._config.requestTimeout ?? DEFAULT_TIMEOUT;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);

    try {
      const res = await fetch(transport.url, {
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
