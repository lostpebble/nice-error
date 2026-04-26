import { castNiceError } from "@nice-code/error";
import type { NiceActionPrimed } from "../../../NiceAction/NiceActionPrimed";
import { isActionResponseJsonObject } from "../../../utils/isActionResponseJsonObject";
import { EErrId_NiceTransport, err_nice_transport } from "./err_nice_transport";
import { Transport } from "./Transport";
import type { IActionTransportDef_Http } from "./Transport.types";

export class TransportHttp extends Transport<IActionTransportDef_Http> {
  readonly abortControllers = new Map<string, AbortController>();

  async send(primed: NiceActionPrimed<any>): Promise<void> {
    const wire = primed.toJsonObject();
    const ac = new AbortController();
    this.abortControllers.set(primed.cuid, ac);

    const res = await fetch(this.def.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wire),
      signal: ac.signal,
    });

    if (!res.ok) {
      try {
        const jsonData = await res.json();

        if (isActionResponseJsonObject(jsonData)) {
          this.respond(primed.coreAction.actionDomain.hydrateResponse(jsonData));
        } else {
          this.respond(primed.errorResponse(castNiceError(jsonData)));
        }
        return;
      } catch (e: any) {
        throw err_nice_transport
          .fromId(EErrId_NiceTransport.transport_send_failed, {
            actionId: primed.id,
            httpStatusCode: res.status,
            message: e.message,
          })
          .withOriginError(e);
      }
    }

    const json: unknown = await res.json();

    if (!isActionResponseJsonObject(json)) {
      throw err_nice_transport.fromId(EErrId_NiceTransport.transport_invalid_action_response, {
        actionId: primed.id,
      });
    }

    this.respond(primed.coreAction.actionDomain.hydrateResponse(json));
  }

  disconnect(): void {
    for (const [, ac] of this.abortControllers) {
      ac.abort();
    }
    this.abortControllers.clear();
  }
}
