import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import type { TActionTransportDef } from "./ConnectionConfig.types";

export abstract class Transport<DEF extends TActionTransportDef> {
  readonly type: DEF["type"];

  constructor(readonly def: DEF) {
    this.type = def.type;
  }

  abstract send(action: NiceActionPrimed<any>): Promise<NiceActionResponse<any>>;
}
