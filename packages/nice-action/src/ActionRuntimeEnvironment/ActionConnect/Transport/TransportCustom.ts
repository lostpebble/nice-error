import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import { Transport } from "./Transport";
import {
  type IActionTransportDef_Custom,
  type ICustomActionTransport,
  type TTransportStatusInfo,
} from "./Transport.types";

export class TransportCustom extends Transport<IActionTransportDef_Custom> {
  readonly abortControllers = new Map<string, AbortController>();
  protected _status: TTransportStatusInfo;
  private _customTransport: ICustomActionTransport;

  constructor(def: IActionTransportDef_Custom) {
    super(def);
    this._status = def.initialStatus;
    this._customTransport = def.createTransport();
  }

  checkAndPrepare(): TTransportStatusInfo {
    this._status = this._customTransport.checkAndPrepare();
    return this._status;
  }

  async send(primed: NiceActionPrimed<any>): Promise<void> {
    await this._customTransport.handleAction(primed, (response) => this.respond(response));
  }

  disconnect(): void {
    this._customTransport.onDisconnect();
  }
}
