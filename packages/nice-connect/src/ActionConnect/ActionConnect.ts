import {
  type INiceActionDomain,
  type INiceActionPrimed_JsonObject,
  isActionResponseJsonObject,
  isPrimedActionJsonObject,
  type NiceActionDomain,
  type NiceActionDomainResponder,
  type NiceActionPrimed,
  type NiceActionRequester,
  NiceActionResponse,
  type TNiceActionResponse_JsonObject,
} from "@nice-code/action";
import { castNiceError } from "@nice-code/error";
import type {
  IActionConnectConfig,
  IActionConnectTransport,
  IConnectorRegistrationOptions,
  IDispatchOptions,
  IPendingRequest,
  IRequesterRegistrationOptions,
} from "./ActionConnect.types";

type TWirePrimedMessage = INiceActionPrimed_JsonObject & { ncEnv?: string };

interface IResponderEntry {
  responder: NiceActionDomainResponder<INiceActionDomain>;
  environment: string | undefined;
}

interface IRequesterEntry {
  requester: NiceActionRequester;
  environment: string | undefined;
  domainMap: Map<string, NiceActionDomain<INiceActionDomain>>;
}

const DEFAULT_TIMEOUT = 30_000;

export class ActionConnect {
  private _config: IActionConnectConfig;
  private _pendingRequests = new Map<string, IPendingRequest>();
  private _responderEntries: IResponderEntry[] = [];
  private _requesterEntries: IRequesterEntry[] = [];
  private _transports = new Map<string | undefined, IActionConnectTransport>();

  constructor(config: IActionConnectConfig) {
    this._config = {
      enableHttpFallback: true,
      requestTimeout: DEFAULT_TIMEOUT,
      ...config,
    };
  }

  setTransport(transport: IActionConnectTransport, options?: { environment?: string }): this {
    this._transports.set(options?.environment, transport);
    return this;
  }

  registerResponder(
    responder: NiceActionDomainResponder<INiceActionDomain>,
    options?: IConnectorRegistrationOptions,
  ): this {
    this._responderEntries.push({ responder, environment: options?.environment });
    return this;
  }

  registerRequester(requester: NiceActionRequester, options: IRequesterRegistrationOptions): this {
    const domainMap = new Map<string, NiceActionDomain<INiceActionDomain>>();
    for (const domain of options.domains) {
      domainMap.set(domain.domain, domain);
    }
    this._requesterEntries.push({ requester, environment: options.environment, domainMap });
    return this;
  }

  async dispatch(
    action: NiceActionPrimed<any, any, any>,
    options?: IDispatchOptions,
  ): Promise<unknown> {
    const wire = action.toJsonObject();
    const { cuid } = wire;
    const timeout = this._config.requestTimeout ?? DEFAULT_TIMEOUT;

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(cuid);
        reject(new Error(`Action "${action.coreAction.id}" timed out after ${timeout}ms`));
      }, timeout);

      this._pendingRequests.set(cuid, { resolve, reject, timer, primed: action });

      const message: TWirePrimedMessage =
        options?.environment != null ? { ...wire, ncEnv: options.environment } : wire;
      const serialized = JSON.stringify(message);

      const transport =
        this._transports.get(options?.environment) ?? this._transports.get(undefined);

      if (transport?.connected) {
        transport.send(serialized);
        return;
      }

      if (
        this._config.role === "client" &&
        (this._config.enableHttpFallback ?? true) &&
        this._config.httpFallbackUrl != null
      ) {
        this._dispatchHttp(message).then(
          (responseWire) => this._resolveRequest(cuid, responseWire),
          (err) => this._rejectRequest(cuid, err),
        );
        return;
      }

      clearTimeout(timer);
      this._pendingRequests.delete(cuid);
      reject(
        new Error(
          `Cannot dispatch action "${action.coreAction.id}": no connected transport available` +
            (this._config.role === "server"
              ? " (server instances do not support HTTP fallback)"
              : ""),
        ),
      );
    });
  }

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
      await this._handlePrimed(parsed, ncEnv, options?.replyTransport);
    }
  }

  disconnect(): void {
    for (const [, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("ActionConnect disconnected"));
    }
    this._pendingRequests.clear();
  }

  private _resolveRequest(cuid: string, responseWire: TNiceActionResponse_JsonObject): void {
    const pending = this._pendingRequests.get(cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(cuid);
    try {
      const output = pending.primed.processResponse(responseWire);
      pending.resolve(output);
    } catch (e) {
      pending.reject(e);
    }
  }

  private _rejectRequest(cuid: string, error: unknown): void {
    const pending = this._pendingRequests.get(cuid);
    if (pending == null) return;
    clearTimeout(pending.timer);
    this._pendingRequests.delete(cuid);
    pending.reject(error);
  }

  private _handleResponse(wire: TNiceActionResponse_JsonObject): void {
    this._resolveRequest(wire.cuid, wire);
  }

  private async _handlePrimed(
    wire: INiceActionPrimed_JsonObject,
    environment: string | undefined,
    replyTransport: IActionConnectTransport | undefined,
  ): Promise<void> {
    const envCandidates: Array<string | undefined> =
      environment != null ? [environment, undefined] : [undefined];

    for (const env of envCandidates) {
      const responderEntry = this._responderEntries.find(
        (e) => e.environment === env && e.responder.domainId === wire.domain,
      );
      if (responderEntry != null) {
        await this._dispatchToResponder(responderEntry.responder, wire, replyTransport);
        return;
      }

      const requesterEntry = this._requesterEntries.find(
        (e) => e.environment === env && e.domainMap.has(wire.domain),
      );
      if (requesterEntry != null) {
        await this._dispatchToRequester(requesterEntry, wire, replyTransport);
        return;
      }
    }
  }

  private async _dispatchToResponder(
    responder: NiceActionDomainResponder<INiceActionDomain>,
    wire: INiceActionPrimed_JsonObject,
    replyTransport: IActionConnectTransport | undefined,
  ): Promise<void> {
    const response = await responder._dispatch(wire as Parameters<typeof responder._dispatch>[0]);
    this._sendReply(JSON.stringify(response.toJsonObject()), replyTransport);
  }

  private async _dispatchToRequester(
    entry: IRequesterEntry,
    wire: INiceActionPrimed_JsonObject,
    replyTransport: IActionConnectTransport | undefined,
  ): Promise<void> {
    const domain = entry.domainMap.get(wire.domain);
    if (domain == null) return;

    const primed = domain.hydratePrimed(wire);
    let responseWire: TNiceActionResponse_JsonObject;

    try {
      const output = await entry.requester.handleAction(primed);
      responseWire = primed.setOutput(output).toJsonObject();
    } catch (e) {
      const niceError = castNiceError(e);
      responseWire = new NiceActionResponse(primed, {
        ok: false,
        error: niceError as ReturnType<typeof castNiceError>,
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
