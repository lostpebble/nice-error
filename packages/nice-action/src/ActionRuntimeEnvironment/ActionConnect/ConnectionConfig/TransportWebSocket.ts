import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import type { IActionTransportDef_Ws } from "./ConnectionConfig.types";
import { Transport } from "./Transport";

export class TransportWebSocket<DEF extends IActionTransportDef_Ws> extends Transport<DEF> {
  constructor(def: DEF) {
    super(def);
  }

  send(action: NiceActionPrimed<any>): Promise<NiceActionResponse<any>> {}
}
