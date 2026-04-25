export enum ETransportType {
  ws = "ws",
  http = "http",
}

export interface IActionTransport_Base {
  /** Per-transport timeout (ms) */
  timeout?: number;
}

export interface IActionTransportDef_Ws extends IActionTransport_Base {
  type: ETransportType.ws;
  send(data: string): void;
  registerOnMessageListener(listener: (data: string) => void): void;
}

export interface IActionTransportDef_Http extends IActionTransport_Base {
  type: ETransportType.http;
  /** HTTP POST URL for action dispatch */
  url: string;
}

export type TActionTransportDef = IActionTransportDef_Ws | IActionTransportDef_Http;

export interface IConnectionConfig {
  defaultTimeout?: number;
  transports: TActionTransportDef[];
}
