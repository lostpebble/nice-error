export {
  ETransportStatus,
  ETransportType,
  type IActionTransportDef_Http,
  type IActionTransportDef_Ws,
  type TActionTransportDef,
} from "../Transport/Transport.types";

import type { TActionTransportDef } from "../Transport/Transport.types";

export interface IConnectionConfig {
  defaultTimeout?: number;
  transports: TActionTransportDef[];
}
