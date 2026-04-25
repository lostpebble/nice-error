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
  IDispatchOptions,
} from "./ActionConnect.types";
import { ConnectionConfig } from "./ConnectionConfig/ConnectionConfig";
import type { IActionTransportDef_Http } from "./ConnectionConfig/ConnectionConfig.types";
import { EErrId_NiceConnect, err_nice_connect } from "./err_nice_connect";

interface IPendingRequest {
  resolve: (response: NiceActionResponse<any>) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any>;
}

const DEFAULT_TIMEOUT = 30_000;

export class ActionConnect<TRANS_KEY extends string = never> implements IActionHandler {
  readonly tag: string | "_";
  readonly handlerType = EActionHandlerType.connect;
  readonly cuid: string;

  private _config: IActionConnectConfig;
  private _transports: Map<TRANS_KEY | "_", ConnectionConfig<TRANS_KEY>> = new Map();
  private _connectionByMatchKey = new Map<TMatchHandlerKey, IActionConnectRoute<TRANS_KEY>>();
  private _handlerKeys = new Set<TMatchHandlerKey>();
  private _pendingRequests = new Map<string, IPendingRequest>();

  constructor(
    connectionConfigs: Array<ConnectionConfig<TRANS_KEY>>,
    config: IActionConnectConfig = {},
  ) {
    this.tag = config.tag ?? "_";
    this.cuid = nanoid();
    this._config = config;
    this._config.defaultTimeout ??= DEFAULT_TIMEOUT;

    for (const resolver of connectionConfigs) {
      this._transports.set(resolver.routeKey ?? "_", resolver);
    }
  }

  get allHandlerKeys(): TMatchHandlerKey[] {
    return [...this._handlerKeys];
  }

  /**
   * Route all actions in a domain via transport. An optional transportKey targets
   * a specific named transport; omit it to use the default (unnamed) transport.
   */
  routeDomain<DOM extends INiceActionDomain>(
    domain: NiceActionDomain<DOM>,
    route: IActionConnectRoute<TRANS_KEY> = {},
  ): this {
    this._connectionByMatchKey.set(`${domain.domain}::_`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::_`);
    return this;
  }

  /**
   * Route a specific action via transport. Takes priority over routeDomain for the
   * same domain.
   */
  routeAction<DOM extends INiceActionDomain, ID extends keyof DOM["actions"] & string>(
    domain: NiceActionDomain<DOM>,
    id: ID,
    route: IActionConnectRoute<TRANS_KEY> = {},
  ): this {
    this._connectionByMatchKey.set(`${domain.domain}::${id}`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::${id}`);
    return this;
  }

  /**
   * Route multiple action IDs via transport. Each action shares the same route config.
   */
  routeActionIds<
    DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof DOM["actions"] & string>,
  >(domain: NiceActionDomain<DOM>, ids: IDS, route: IActionConnectRoute<TRANS_KEY> = {}): this {
    for (const id of ids) {
      this.routeAction(domain, id, route);
    }
    return this;
  }

  /**
   * Dispatch a primed action via the matching connection route.
   * Called by ActionRuntimeEnvironment when an action's key matches this handler.
   */
  async dispatchAction(primed: NiceActionPrimed<any, any>): Promise<NiceActionResponse<any, any>> {
    const route =
      this._connectionByMatchKey.get(`${primed.domain}::${primed.id}`) ??
      this._connectionByMatchKey.get(`${primed.domain}::_`);

    return this._sendViaTransport(primed, route);
  }

  /**
   * Explicitly dispatch via a specific connection route, bypassing routing config.
   */
  async dispatch(
    primed: NiceActionPrimed<any, any>,
    options?: IDispatchOptions<TRANS_KEY>,
  ): Promise<NiceActionResponse<any, any>> {
    return this._sendViaTransport(primed, options);
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
    route?: IActionConnectRoute<TRANS_KEY>,
  ): Promise<NiceActionResponse<any, any>> {
    return new Promise((resolve, reject) => {
      const transport = this._transports.get(route?.routeKey ?? "_");

      const wire = primed.toJsonObject();
      const timeout = transport?.config.defaultTimeout ?? DEFAULT_TIMEOUT;

      const timer = setTimeout(() => {
        this._pendingRequests.delete(wire.cuid);
        reject(new Error(`Action "${primed.id}" timed out after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(wire.cuid, { resolve, reject, timer, primed });

      if (transport?.connected) {
        transport.send(JSON.stringify(wire));
        return;
      }

      const httpTransport = this._transports.get(route?.routeKey ?? "_");

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
    transport: IActionTransportDef_Http,
  ): Promise<TNiceActionResponse_JsonObject> {
    const timeout = transport.timeout ?? this._config.defaultTimeout ?? DEFAULT_TIMEOUT;
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
