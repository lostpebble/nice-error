import { castNiceError } from "@nice-code/error";
import { nanoid } from "nanoid/non-secure";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import { isActionResponseJsonObject } from "../../utils/isActionResponseJsonObject";
import { isPrimedActionJsonObject } from "../../utils/isPrimedActionJsonObject";
import { ActionHandler } from "../ActionHandler/ActionHandler";
import { EActionHandlerType, type IActionHandler } from "../ActionHandler/ActionHandler.types";
import type {
  IActionConnectConfig,
  IActionConnectTransport,
  IDispatchOptions,
  IPendingRequest,
} from "./ActionConnect.types";
import { EErrId_NiceConnect, err_nice_connect } from "./err_nice_connect";

type TWirePrimedMessage = INiceActionPrimed_JsonObject & { ncEnv?: string };

const DEFAULT_TIMEOUT = 30_000;

/**
 * ActionConnect — a plug-and-play ActionHandler for cross-environment action routing.
 *
 * Extends ActionHandler with transport management so actions dispatched through a
 * domain are transparently forwarded over WebSocket or HTTP when no local resolver
 * matches. Register resolvers via the inherited `.resolve()` / `.forDomain()` /
 * `.forAction()` methods, then attach to a domain with `domain.setHandler(connect)`.
 *
 * @example — client (forwards unresolved actions to server)
 * ```ts
 * const connect = new ActionConnect({ role: "client", httpFallbackUrl: "/api/actions" });
 * connect.setTransport(socket);
 * myDomain.setHandler(connect);
 * // Now myDomain.action("x").execute(input) transparently sends over the transport.
 * ```
 *
 * @example — server (resolves incoming actions locally)
 * ```ts
 * const connect = new ActionConnect({ role: "server" });
 * connect
 *   .resolve(myDomain, "createUser", async ({ name }) => ({ id: await db.insert(name) }))
 *   .resolve(myDomain, "deleteUser", async ({ id }) => { await db.delete(id); });
 * myDomain.setHandler(connect);
 * connect.setTransport(serverSocket);
 * // Incoming actions via onMessage() are dispatched locally.
 * ```
 */
export class ActionConnect implements IActionHandler {
  private _config: IActionConnectConfig;
  private _pendingRequests = new Map<string, IPendingRequest>();
  private _transports = new Map<string | undefined, IActionConnectTransport>();
  readonly tag: string | "_";
  readonly handlerType = EActionHandlerType.connect;
  readonly _domains = new Map<string, NiceActionDomain<any>>();
  readonly cuid: string;

  constructor(config: IActionConnectConfig = {}) {
    this.tag = config.tag ?? "_";
    this._config = {
      enableHttpFallback: true,
      requestTimeout: DEFAULT_TIMEOUT,
      ...config,
    };
    this.cuid = nanoid();
  }

  setTransport(transport: IActionConnectTransport, options?: { environment?: string }): this {
    this._transports.set(options?.environment, transport);
    return this;
  }

  /**
   * Dispatch a primed action. Tries local resolvers/cases first (inherited from
   * ActionHandler). If nothing matches, forwards via the registered transport.
   *
   * This override is what makes ActionConnect a transparent forwarder: setting it
   * as a domain's handler causes unresolved actions to automatically flow to transport.
   */
  async dispatchAction(
    primed: Parameters<ActionHandler["dispatchAction"]>[0],
  ): Promise<NiceActionResponse<any, any>> {
    // const local = await this._tryExecute(primed);
    // if (local.handled) return local.response;
    return await this._dispatchViaTransport(primed);
  }

  /**
   * Explicitly send a primed action via transport, bypassing local resolvers.
   * Useful when you need direct transport access with environment routing.
   */
  async dispatch(
    action: Parameters<ActionHandler["dispatchAction"]>[0],
    options?: IDispatchOptions,
  ): Promise<NiceActionResponse<any>> {
    return this._dispatchViaTransport(action, options);
  }

  /**
   * Handle an incoming wire message (primed action or response).
   *
   * - If it's a response: resolves the corresponding pending `dispatch` promise.
   * - If it's a primed action: dispatches it locally via registered resolvers/cases
   *   and sends a response back on `replyTransport` (or the default transport).
   */
  async onMessage(
    rawMessage: string,
    options?: { replyTransport?: IActionConnectTransport },
  ): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMessage);
    } catch {
      return;
    }

    if (isActionResponseJsonObject(parsed)) {
      this._handleResponse(parsed);
      return;
    }

    if (isPrimedActionJsonObject(parsed)) {
      const ncEnv = (parsed as TWirePrimedMessage).ncEnv;
      await this._handleIncomingPrimed(parsed, ncEnv, options?.replyTransport);
    }
  }

  disconnect(): void {
    for (const [, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(err_nice_connect.fromId(EErrId_NiceConnect.disconnected));
    }
    this._pendingRequests.clear();
  }

  private async _dispatchViaTransport(
    action: Parameters<ActionHandler["dispatchAction"]>[0],
    options?: IDispatchOptions,
  ): Promise<NiceActionResponse<any>> {
    const wire = action.toJsonObject();
    const { cuid } = wire;
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;

    return new Promise<NiceActionResponse<any>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(cuid);
        reject(new Error(`Action "${action.coreAction.id}" timed out after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(cuid, { resolve, reject, timer, primed: action });

      const message: TWirePrimedMessage =
        options?.envId != null ? { ...wire, ncEnv: options.envId } : wire;
      const serialized = JSON.stringify(message);

      const transport = this._transports.get(options?.envId) ?? this._transports.get(undefined);

      if (transport?.connected) {
        transport.send(serialized);
        return;
      }

      if ((this._config.enableHttpFallback ?? true) && this._config.httpFallbackUrl != null) {
        this._dispatchHttp(message).then(
          (responseWire) => this._handleResponse(responseWire),
          (err) => this._rejectRequest(cuid, castNiceError(err)),
        );
        return;
      }

      clearTimeout(timer);
      this._pendingRequests.delete(cuid);
      reject(
        new Error(
          `Cannot dispatch action "${action.coreAction.id}": no connected transport available`,
        ),
      );
    });
  }

  private _rejectRequest(cuid: string, error: unknown): void {
    const pending = this._pendingRequests.get(cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(cuid);
    pending.reject(castNiceError(error));
  }

  private _handleResponse(wire: TNiceActionResponse_JsonObject): void {
    const pending = this._pendingRequests.get(wire.cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(wire.cuid);
    try {
      const hydratedResponse = pending.primed.coreAction.actionDomain.hydrateResponse(wire);
      // const output = pending.primed.extractOutput(wire);
      pending.resolve(hydratedResponse);
    } catch (e) {
      pending.reject(castNiceError(e));
    }
  }

  /**
   * Handle an incoming primed-action wire message.
   * Dispatches locally (no transport fallback) and sends the response.
   * The `ncEnv` field is preserved for informational/routing purposes but
   * handler selection is managed at domain registration time via `setHandler`.
   */
  private async _handleIncomingPrimed(
    wire: INiceActionPrimed_JsonObject,
    _ncEnv: string | undefined,
    replyTransport: IActionConnectTransport | undefined,
  ): Promise<void> {
    const domain = this._domains.get(wire.domain);
    if (domain == null) return;

    let responseWire: TNiceActionResponse_JsonObject;
    let primed: ReturnType<typeof domain.hydratePrimed> | undefined;

    try {
      primed = domain.hydratePrimed(wire);
      const validatedPrimed = domain.validatePrimed(primed);

      // Use _tryExecute (not dispatchAction) to avoid transport fallback on the receiving side.
      const result = await validatedPrimed.executeSafe();

      if (result.handled) {
        responseWire = result.response.toJsonObject();
      } else {
        const error = castNiceError(
          new Error(
            `ActionConnect: no local handler for action "${wire.id}" in domain "${wire.domain}"`,
          ),
        );
        responseWire = new NiceActionResponse(validatedPrimed, { ok: false, error }).toJsonObject();
      }
    } catch (e) {
      if (primed == null) return; // hydration failed — nothing to reply with
      responseWire = new NiceActionResponse(primed, {
        ok: false,
        error: castNiceError(e),
      }).toJsonObject();
    }

    this._sendReply(JSON.stringify(responseWire), replyTransport);
  }

  private async _dispatchHttp(wire: TWirePrimedMessage): Promise<TNiceActionResponse_JsonObject> {
    const url = this._config.httpFallbackUrl!;
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wire),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP fallback failed: ${res.status} ${res.statusText}`);
      }

      const json: unknown = await res.json();
      if (!isActionResponseJsonObject(json)) {
        throw new Error("HTTP fallback: response is not a valid NiceActionResponse");
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  private _sendReply(message: string, replyTransport: IActionConnectTransport | undefined): void {
    const transport = replyTransport ?? this._transports.get(undefined);
    transport?.send(message);
  }
}
