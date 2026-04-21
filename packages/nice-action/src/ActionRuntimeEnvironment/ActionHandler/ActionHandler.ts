import { castNiceError } from "@nice-code/error";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type {
  INiceActionDomain,
  TActionHandlerForDomain,
  TActionIdHandlerForDomain,
} from "../../ActionDomain/NiceActionDomain.types";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import { EActionRouteStep } from "../../NiceAction/NiceAction.enums";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import type {
  IActionHandlerCase,
  IActionHandlerConfig,
  TActionHandlerDispatchFn,
  TActionHandlerDispatchResult,
  TActionHandlerResolverFn,
} from "./ActionHandler.types";

export class ActionHandler {
  readonly tag?: string;

  protected _domains = new Map<string, NiceActionDomain<any>>();
  private _resolvers = new Map<string, TActionHandlerDispatchFn>();
  private _cases: IActionHandlerCase[] = [];
  private _defaultHandler?: TActionHandlerDispatchFn;

  constructor(config: IActionHandlerConfig = {}) {
    this.tag = config.tag;
  }

  /**
   * Register a typed resolver for a specific action in a domain.
   * The resolver receives typed input and returns typed output.
   * Resolvers take priority over case-based handlers.
   *
   * @example
   * ```ts
   * handler
   *   .resolve(myDomain, "createUser", async ({ name, email }) => {
   *     return { id: await db.insert({ name, email }) };
   *   })
   *   .resolve(myDomain, "deleteUser", async ({ id }) => {
   *     await db.delete(id);
   *   });
   * ```
   */
  resolve<DOM extends INiceActionDomain, ID extends keyof DOM["actions"] & string>(
    domain: NiceActionDomain<DOM>,
    actionId: ID,
    fn: TActionHandlerResolverFn<DOM["actions"][ID]>,
  ): this {
    const key = `${domain.domain}::${actionId}`;
    this._domains.set(domain.domain, domain);
    this._resolvers.set(key, (primed) => fn(primed.input as any));
    return this;
  }

  /**
   * Register a handler for all actions in a domain (first-match-wins).
   * Receives the full primed action — use `domain.matchAction()` to narrow by id.
   */
  forDomain<FOR_DOM extends INiceActionDomain>(
    domain: NiceActionDomain<FOR_DOM>,
    handler: TActionHandlerForDomain<FOR_DOM>,
  ): this {
    this._domains.set(domain.domain, domain);
    this._cases.push({
      _matcher: (action) => domain.isExactActionDomain(action),
      _handler: handler as TActionHandlerDispatchFn,
    });
    return this;
  }

  /**
   * Register a handler for a specific action ID (first-match-wins).
   * Input is narrowed to that action's schema.
   */
  forAction<ACT_DOM extends INiceActionDomain, ID extends keyof ACT_DOM["actions"] & string>(
    domain: NiceActionDomain<ACT_DOM>,
    id: ID,
    handler: TActionIdHandlerForDomain<ACT_DOM, ID>,
  ): this {
    this._domains.set(domain.domain, domain);
    this._cases.push({
      _matcher: (action) => domain.isExactActionDomain(action) && action.coreAction.id === id,
      _handler: handler as TActionHandlerDispatchFn,
    });
    return this;
  }

  /**
   * Register a handler for multiple action IDs (first-match-wins).
   * Input is narrowed to the union of those IDs' schemas.
   */
  forActionIds<
    ACT_DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof ACT_DOM["actions"] & string>,
  >(
    domain: NiceActionDomain<ACT_DOM>,
    ids: IDS,
    handler: TActionIdHandlerForDomain<ACT_DOM, IDS[number]>,
  ): this {
    this._domains.set(domain.domain, domain);
    this._cases.push({
      _matcher: (action) =>
        domain.isExactActionDomain(action) &&
        (ids as readonly string[]).includes(action.coreAction.id),
      _handler: handler as TActionHandlerDispatchFn,
    });
    return this;
  }

  /**
   * Register a fallback handler that fires when no resolver or case matches.
   * Only one default handler can be registered — calling this twice replaces
   * the previous.
   */
  setDefaultHandler(handler: TActionHandlerDispatchFn): this {
    this._defaultHandler = handler;
    return this;
  }

  /**
   * Try to dispatch a primed action to a registered resolver or case. Returns
   * `{ handled: false }` if nothing matches — does not throw. Errors from
   * handlers propagate naturally.
   *
   * Subclasses can override `dispatchAction` to extend with fallback behavior
   * (e.g. transport forwarding in ActionConnect) while still calling this
   * method for the local-first dispatch attempt.
   */
  async _tryDispatch(
    primed: NiceActionPrimed<any, any, any>,
  ): Promise<TActionHandlerDispatchResult> {
    // Typed resolvers take priority (registered via .resolve())
    const resolverKey = `${primed.domain}::${primed.coreAction.id}`;
    const resolver = this._resolvers.get(resolverKey);
    if (resolver != null) {
      primed.coreAction.addRouteEntry({
        runtime: this.runtime ?? "local",
        step: EActionRouteStep.found_resolver,
        ht: this.ht,
      });
      const output = await resolver(primed);
      return { handled: true, output };
    }

    // Case-based handlers (first-match-wins)
    for (const c of this._cases) {
      if (!c._matcher(primed)) continue;
      primed.coreAction.addRouteEntry({
        runtime: this.runtime ?? "local",
        step: EActionRouteStep.found_requester,
        ht: this.ht,
      });
      const output = await c._handler(primed);
      return { handled: true, output };
    }

    // Default handler
    if (this._defaultHandler != null) {
      const output = await this._defaultHandler(primed);
      return { handled: true, output };
    }

    return { handled: false };
  }

  /**
   * Dispatch a primed action. Throws `domain_no_handler` if no handler is registered.
   * Errors from handlers propagate naturally (same as the old requester path).
   *
   * Override in subclasses to add fallback behavior after local dispatch fails
   * (see ActionConnect for transport fallback).
   */
  async dispatchAction(primed: NiceActionPrimed<any, any, any>): Promise<unknown> {
    const result = await this._tryDispatch(primed);
    if (result.handled) return result.output;
    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: primed.domain });
  }

  /**
   * Dispatch a wire-format primed action and return a wire-format response.
   * Used for server-side HTTP/WebSocket handlers — catches resolver errors and
   * serializes them into the response (`ok: false`) rather than propagating.
   *
   * Throws (does not wrap) for structural errors:
   * - `resolver_domain_not_registered` — domain not known to this handler
   * - `hydration_*` — the wire payload is malformed
   * - `resolver_action_not_registered` — no resolver/case for this action id
   *
   * @example
   * ```ts
   * app.post("/actions", async (req, res) => {
   *   const response = await handler.handleWire(req.body);
   *   res.json(response);
   * });
   * ```
   */
  async handleWire(wire: INiceActionPrimed_JsonObject): Promise<TNiceActionResponse_JsonObject> {
    const domain = this._domains.get(wire.domain);
    if (domain == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_domain_not_registered, {
        domain: wire.domain,
      });
    }

    // hydratePrimed throws on structural errors (domain mismatch, unknown id, etc.)
    const primed = domain.hydratePrimed(wire);

    // Check handler registration before entering the error-wrapping try-catch,
    // so "no resolver" is a programming error (throws) rather than a runtime failure (response).
    const hasResolver = this._resolvers.has(`${wire.domain}::${wire.id}`);
    const hasCase = !hasResolver && this._cases.some((c) => c._matcher(primed));
    if (!hasResolver && !hasCase && this._defaultHandler == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_action_not_registered, {
        domain: wire.domain,
        actionId: wire.id,
      });
    }

    try {
      const validatedPrimed = await domain.validatePrimed(primed);
      const result = await this._tryDispatch(validatedPrimed);
      // Always handled at this point (we checked above)
      return validatedPrimed
        .setOutput((result as { handled: true; output: unknown }).output as any)
        .toJsonObject();
    } catch (e) {
      return new NiceActionResponse(primed, {
        ok: false,
        error: castNiceError(e),
      }).toJsonObject();
    }
  }

  /**
   * Called when this handler is registered on a domain via `domain.setHandler()`.
   * Stores the domain reference for wire-format dispatch (`handleWire`).
   * Subclasses can override to perform additional setup.
   */
  _onRegisteredWith(domain: NiceActionDomain<any>): void {
    this._domains.set(domain.domain, domain);
  }
}
