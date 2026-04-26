import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import { EErrId_NiceTransport, err_nice_transport } from "./err_nice_transport";
import {
  type ITransportPendingRequest,
  type TActionTransportDef,
  type TTransportStatusInfo,
} from "./Transport.types";

export abstract class Transport<DEF extends TActionTransportDef> {
  readonly type: DEF["type"];
  readonly requestResolvers = new Map<string, ITransportPendingRequest>();
  protected abstract _status: TTransportStatusInfo;

  constructor(readonly def: DEF) {
    this.type = def.type;
  }

  get status(): TTransportStatusInfo {
    return this._status;
  }

  checkAndPrepare(): TTransportStatusInfo {
    return this._status;
  }

  protected abstract send(primed: NiceActionPrimed<any>): Promise<void>;
  abstract disconnect(): void;

  protected respond(response: NiceActionResponse<any>): void {
    const resolver = this.requestResolvers.get(response.cuid);
    if (resolver) {
      resolver.resolve(response);
      clearTimeout(resolver.timer);
      this.requestResolvers.delete(response.cuid);
    }
  }

  makeRequest(
    primed: NiceActionPrimed<any>,
    connectionDefaultTimeout: number,
  ): Promise<NiceActionResponse<any>> {
    const timeout = this.def.timeout ?? connectionDefaultTimeout;

    return new Promise((resolve, reject) => {
      this.requestResolvers.set(primed.cuid, {
        type: this.type,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.requestResolvers.delete(primed.cuid);
          reject(err_nice_transport.fromId(EErrId_NiceTransport.transport_timeout, { timeout }));
        }, timeout),
        primed,
      });

      this.send(primed).catch((err) => {
        this.requestResolvers.delete(primed.cuid);
        reject(err);
      });
    });
  }
}
