import type { NiceError } from "@nice-code/error";
import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import { isActionResponseJsonObject } from "../../../utils/isActionResponseJsonObject";
import { EErrId_NiceTransport, err_nice_transport } from "./err_nice_transport";
import { Transport } from "./Transport";
import {
  ETransportStatus,
  type IActionTransportDef_Ws,
  type TTransportStatusInfo,
} from "./Transport.types";

export class TransportWebSocket extends Transport<IActionTransportDef_Ws> {
  connected: boolean = false;
  websocket?: WebSocket;
  private messageQueue: string[] = [];

  private isInitializingWebSocket: boolean = false;

  protected _status: TTransportStatusInfo = {
    status: ETransportStatus.uninitialized,
  };

  constructor(def: IActionTransportDef_Ws) {
    super(def);
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
    this.messageQueue = [];

    for (const [, pending] of this.requestResolvers) {
      if (pending.type === this.type) {
        clearTimeout(pending.timer);
        pending.reject(error);
        this.requestResolvers.delete(pending.primed.cuid);
      }
    }
  }

  private async createWebSocketConnection(): Promise<void> {
    if (this.isInitializingWebSocket) {
      return;
    }
    this.isInitializingWebSocket = true;
    try {
      this.websocket = await this.def.createWebSocket();
    } catch (e) {
      this.connected = false;
      this.isInitializingWebSocket = false;
      console.error("Failed to create WebSocket:", e);
      this.rejectPendingWebSocketRequests(
        err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_create_failed, {
          originalError: e instanceof Error ? e : undefined,
        }),
      );
      return;
    }

    this.websocket.addEventListener("open", () => {
      for (const message of this.messageQueue) {
        this.websocket?.send(message);
      }
      this.messageQueue = [];
      this.connected = true;
      this.isInitializingWebSocket = false;
    });

    this.websocket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        this.handleMessage(event.data);
      }
    });

    this.websocket.addEventListener("close", (event) => {
      console.error("WebSocket closed:", event);
      this.rejectPendingWebSocketRequests(
        err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_disconnected),
      );
      this.connected = false;
      this.isInitializingWebSocket = false;
    });

    this.websocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      this.rejectPendingWebSocketRequests(
        err_nice_transport.fromId(EErrId_NiceTransport.transport_ws_send_failed),
      );
      this.connected = false;
      this.isInitializingWebSocket = false;
    });

    return;
  }

  protected async send(primed: NiceActionPrimed<any>): Promise<void> {
    const wire = primed.toJsonString();

    if (!this.connected) {
      this.messageQueue.push(wire);
      await this.createWebSocketConnection();
      return;
    }

    this.websocket?.send(wire);
  }

  disconnect(): void {
    this.connected = false;
    this.websocket?.close();
    this.websocket = undefined;
  }
}
