import type { NiceError } from "@nice-code/error";
import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import { isActionResponseJsonObject } from "../../../utils/isActionResponseJsonObject";
import { EErrId_NiceTransport, err_nice_transport } from "./err_nice_transport";
import { Transport } from "./Transport";
import {
  ETransportStatus,
  type IActionTransportDef_Ws,
  type ITransportInitializationFinishedInfo,
  type ITransportStatusInfo_Initializing,
  type TTransportStatusInfo,
} from "./Transport.types";

export class TransportWebSocket extends Transport<IActionTransportDef_Ws> {
  websocket?: WebSocket;

  protected _status: TTransportStatusInfo = { status: ETransportStatus.uninitialized };

  constructor(def: IActionTransportDef_Ws) {
    super(def);
  }

  override checkAndPrepare(): TTransportStatusInfo {
    if (this._status.status === ETransportStatus.uninitialized) {
      this._status = this.startInitializing();
    }
    return this._status;
  }

  private startInitializing(): ITransportStatusInfo_Initializing {
    const waitForInitialization = new Promise<ITransportInitializationFinishedInfo>((resolve) => {
      resolve({
        transport: this,
        newStatus: {},
      });
    });

    this._connect();

    return {
      status: ETransportStatus.initializing,
      timeStarted: Date.now(),
      waitForInitialization,
    };
  }

  private handleMessage(data: string): void {
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      return;
    }

    if (!isActionResponseJsonObject(json)) {
      return;
    }

    const pending = this.requestResolvers.get(json.cuid);
    if (pending == null) {
      return;
    }

    this.respond(pending.primed.coreAction.actionDomain.hydrateResponse(json));
  }

  private rejectPendingWebSocketRequests(error: NiceError): void {
    for (const [, pending] of this.requestResolvers) {
      if (pending.type === this.type) {
        clearTimeout(pending.timer);
        pending.reject(error);
        this.requestResolvers.delete(pending.primed.cuid);
      }
    }
  }

  private async _connect(): Promise<void> {
    try {
      this.websocket = await this.def.createWebSocket();
    } catch (e) {
      console.error("Failed to create WebSocket:", e);
      const error = err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_create_failed, {
        originalError: e instanceof Error ? e : undefined,
      });
      this._status = { status: ETransportStatus.failed, error, timeFailed: Date.now() };
      this.rejectPendingWebSocketRequests(error);
      return;
    }

    this.websocket.addEventListener("open", () => {
      this._status = { status: ETransportStatus.ready };
    });

    this.websocket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        this.handleMessage(event.data);
      }
    });

    this.websocket.addEventListener("close", (event) => {
      // Intentional disconnect sets status to uninitialized first — don't overwrite it
      if (this._status.status === ETransportStatus.uninitialized) return;
      // Error event may have already set failed — avoid double-reject
      if (this._status.status !== ETransportStatus.failed) {
        console.error("WebSocket closed:", event);
        const error = err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_disconnected);
        this._status = { status: ETransportStatus.failed, error, timeFailed: Date.now() };
        this.rejectPendingWebSocketRequests(error);
      }
    });

    this.websocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      const error = err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_send_failed);
      this._status = { status: ETransportStatus.failed, error, timeFailed: Date.now() };
      this.rejectPendingWebSocketRequests(error);
    });
  }

  protected async send(primed: NiceActionPrimed<any>): Promise<void> {
    this.websocket?.send(primed.toJsonString());
  }

  disconnect(): void {
    // Set uninitialized before close() so the close event handler skips the failed transition
    this._status = { status: ETransportStatus.uninitialized };
    this.websocket?.close();
    this.websocket = undefined;
  }
}
