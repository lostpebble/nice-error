import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import type { IActionTransportDef_Http } from "./ConnectionConfig.types";
import { Transport } from "./Transport";

export class TransportHttp<DEF extends IActionTransportDef_Http> extends Transport<DEF> {
  constructor(def: DEF) {
    super(def);
  }

  send(action: NiceActionPrimed<any>): Promise<NiceActionResponse<any>> {}
}
