import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import { EErrId_NiceTransport, err_nice_transport } from "../Transport/err_nice_transport";
import { TransportHttp } from "../Transport/TransportHttp";
import { TransportWebSocket } from "../Transport/TransportWebSocket";
import { ETransportType, type IConnectionConfig } from "./ConnectionConfig.types";

export class ConnectionConfig<K extends string | undefined = undefined> {
  readonly config: IConnectionConfig;
  readonly routeKey: K | undefined;

  private _wsTransports: TransportWebSocket[] = [];
  private _httpTransports: TransportHttp[] = [];

  constructor(input: IConnectionConfig, routeKey?: K) {
    this.config = input;
    this.routeKey = routeKey;

    for (const def of this.config.transports) {
      if (def.type === ETransportType.ws) {
        this._wsTransports.push(new TransportWebSocket(def));
      } else if (def.type === ETransportType.http) {
        this._httpTransports.push(new TransportHttp(def));
      } else {
        throw new Error(`Unsupported transport type: ${(def as any).type}`);
      }
    }
  }

  get connected(): boolean {
    return this._wsTransports.some((t) => t.connected);
  }

  dispatch(
    primed: NiceActionPrimed<any>,
    defaultTimeout: number,
  ): Promise<NiceActionResponse<any>> {
    const timeout = this.config.defaultTimeout ?? defaultTimeout;

    const ws = this._wsTransports[0];
    if (ws != null) return ws.makeRequest(primed, timeout);

    const http = this._httpTransports[0];
    if (http != null) return http.makeRequest(primed, timeout);

    throw err_nice_transport.fromId(EErrId_NiceTransport.transport_not_found, {
      actionId: primed.id,
    });
  }

  disconnect(): void {
    for (const ws of this._wsTransports) {
      ws.disconnect();
    }
  }
}
