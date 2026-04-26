import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import { EErrId_NiceTransport, err_nice_transport } from "../Transport/err_nice_transport";
import { Transport } from "../Transport/Transport";
import { TransportHttp } from "../Transport/TransportHttp";
import { TransportWebSocket } from "../Transport/TransportWebSocket";
import { ETransportStatus, ETransportType, type IConnectionConfig } from "./ConnectionConfig.types";

export class ConnectionConfig<K extends string | undefined = undefined> {
  readonly config: IConnectionConfig;
  readonly routeKey: K | undefined;

  private _transports: Transport<any>[] = [];

  constructor(input: IConnectionConfig, routeKey?: K) {
    this.config = input;
    this.routeKey = routeKey;

    for (const def of this.config.transports) {
      if (def.type === ETransportType.ws) {
        this._transports.push(new TransportWebSocket(def));
      } else if (def.type === ETransportType.http) {
        this._transports.push(new TransportHttp(def));
      } else {
        throw new Error(`Unsupported transport type: ${(def as any).type}`);
      }
    }
  }

  get connected(): boolean {
    return this._transports.some((t) => t.status.status === ETransportStatus.ready);
  }

  dispatch(
    primed: NiceActionPrimed<any>,
    defaultTimeout: number,
  ): Promise<NiceActionResponse<any>> {
    const timeout = this.config.defaultTimeout ?? defaultTimeout;

    for (const transport of this._transports) {
      const { status } = transport.checkAndPrepare();

      if (status === ETransportStatus.ready) {
        return transport.makeRequest(primed, timeout);
      }
      // initializing → being set up, skip for this request
      // failed → excluded, skip
    }

    throw err_nice_transport.fromId(EErrId_NiceTransport.transport_not_found, {
      actionId: primed.id,
    });
  }

  disconnect(): void {
    for (const transport of this._transports) {
      transport.disconnect();
    }
  }
}
