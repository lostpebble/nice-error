import { nanoid } from "nanoid/non-secure";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import {
  EActionHandlerType,
  type IActionHandler,
  type TMatchHandlerKey,
} from "../ActionHandler/ActionHandler.types";
import type { IActionConnectConfig, IActionConnectRoute } from "./ActionConnect.types";
import { ConnectionConfig } from "./ConnectionConfig/ConnectionConfig";
import { EErrId_NiceTransport, err_nice_transport } from "./Transport/err_nice_transport";

const DEFAULT_TIMEOUT = 30_000;

export class ActionConnect<TRANS_KEY extends string = never> implements IActionHandler {
  readonly tag: string | "_";
  readonly handlerType = EActionHandlerType.connect;
  readonly cuid: string;

  private _config: IActionConnectConfig;
  private _connections: Map<TRANS_KEY | "_", ConnectionConfig<any>> = new Map();
  private _connectionByMatchKey = new Map<TMatchHandlerKey, IActionConnectRoute<any, TRANS_KEY>>();
  private _handlerKeys = new Set<TMatchHandlerKey>();

  constructor(
    connectionConfigs: Array<ConnectionConfig<TRANS_KEY | undefined>>,
    config: IActionConnectConfig = {},
  ) {
    this.tag = config.tag ?? "_";
    this.cuid = nanoid();
    this._config = { requestTimeout: DEFAULT_TIMEOUT, ...config };

    for (const conn of connectionConfigs) {
      this._connections.set(conn.routeKey ?? "_", conn);
    }
  }

  get allHandlerKeys(): TMatchHandlerKey[] {
    return [...this._handlerKeys];
  }

  routeDomain<DOM extends INiceActionDomain>(
    domain: NiceActionDomain<DOM>,
    route: IActionConnectRoute<DOM, TRANS_KEY> = {},
  ): this {
    this._connectionByMatchKey.set(`${domain.domain}::_`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::_`);
    return this;
  }

  routeAction<DOM extends INiceActionDomain, ID extends keyof DOM["actions"] & string>(
    domain: NiceActionDomain<DOM>,
    id: ID,
    route: IActionConnectRoute<DOM, TRANS_KEY> = {},
  ): this {
    this._connectionByMatchKey.set(`${domain.domain}::${id}`, route);
    this._handlerKeys.add(`${this.tag}::${domain.domain}::${id}`);
    return this;
  }

  routeActionIds<
    DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof DOM["actions"] & string>,
  >(
    domain: NiceActionDomain<DOM>,
    ids: IDS,
    route: IActionConnectRoute<DOM, TRANS_KEY> = {},
  ): this {
    for (const id of ids) {
      this.routeAction(domain, id, route);
    }
    return this;
  }

  async dispatchAction(primed: NiceActionPrimed<any, any>): Promise<NiceActionResponse<any, any>> {
    const route =
      this._connectionByMatchKey.get(`${primed.domain}::${primed.id}`) ??
      this._connectionByMatchKey.get(`${primed.domain}::_`);

    return this._dispatchViaRoute(primed, route);
  }

  disconnect(): void {
    for (const conn of this._connections.values()) {
      conn.disconnect();
    }
  }

  private async _dispatchViaRoute(
    primed: NiceActionPrimed<any, any>,
    route?: IActionConnectRoute<any, TRANS_KEY>,
  ): Promise<NiceActionResponse<any, any>> {
    const conn = this._connections.get(route?.routeKey ?? "_");

    if (conn == null) {
      return Promise.reject(
        err_nice_transport.fromId(EErrId_NiceTransport.transport_not_found, {
          actionId: primed.id,
          routeKey: route?.routeKey,
          tag: this.tag !== "_" ? this.tag : undefined,
        }),
      );
    }

    const response = await conn.dispatch(primed, this._config.requestTimeout ?? DEFAULT_TIMEOUT);

    if (route?.onResponse) {
      route.onResponse(response);
    }

    return response;
  }
}
