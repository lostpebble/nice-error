import type { NiceError } from "@nice-code/error";
import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../../NiceAction/NiceActionResponse";
import type { Transport } from "./Transport";

export enum ETransportType {
  ws = "ws",
  http = "http",
}

export enum ETransportStatus {
  uninitialized = "uninitialized",
  initializing = "initializing",
  ready = "ready",
  failed = "failed",
}

export interface ITransportStatusInfo_Base<S extends ETransportStatus> {
  status: S;
}

export interface ITransportStatusInfo_Failed
  extends ITransportStatusInfo_Base<ETransportStatus.failed> {
  error: NiceError;
  timeFailed: number;
}

export interface ITransportInitializationFinishedInfo {
  transport: Transport<any>;
  newStatus: ITransportStatusInfo_Base<ETransportStatus.ready> | ITransportStatusInfo_Failed;
}

export interface ITransportStatusInfo_Initializing
  extends ITransportStatusInfo_Base<ETransportStatus.initializing> {
  timeStarted: number;
  waitForInitialization: Promise<ITransportInitializationFinishedInfo>;
}

export type TTransportStatusInfo =
  | ITransportStatusInfo_Base<ETransportStatus.uninitialized>
  | ITransportStatusInfo_Initializing
  | ITransportStatusInfo_Base<ETransportStatus.ready>
  | ITransportStatusInfo_Failed;

export interface IActionTransport_Base {
  /** Per-transport timeout override (ms) */
  timeout?: number;
}

export interface IActionTransportDef_Ws extends IActionTransport_Base {
  type: ETransportType.ws;
  createWebSocket: () => Promise<WebSocket>;
}

export interface IActionTransportDef_Http extends IActionTransport_Base {
  type: ETransportType.http;
  url: string;
}

export type TActionTransportDef = IActionTransportDef_Ws | IActionTransportDef_Http;

export interface ITransportPendingRequest {
  type: ETransportType;
  resolve: (response: NiceActionResponse<any>) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  primed: NiceActionPrimed<any>;
}
