import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  INiceActionDomainDef,
  INiceActionResolverLike,
  ISerializedNiceAction,
  ISerializedNiceActionResponse,
  TActionListener,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";
import { hydrateNiceActionResponse, NiceActionResponse } from "./NiceActionResponse";

export class NiceActionDomain<ACT_DOM extends INiceActionDomainDef = INiceActionDomainDef>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["schema"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly schema: ACT_DOM["schema"];
  private _listeners: TActionListener[] = [];
  private _handlers = new Map<string | undefined, NiceActionHandler>();
  private _resolvers = new Map<string | undefined, INiceActionResolverLike>();

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.schema = definition.schema;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    return new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      schema: subDomainDef.schema,
    });
  }

  action<ID extends keyof ACT_DOM["schema"] & string>(
    id: ID,
  ): NiceAction<this, ACT_DOM["schema"][ID]> {
    const actionSchema = this.schema[id];
    if (!actionSchema) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_id_not_in_domain, {
        domain: this.domain,
        actionId: id as string,
      });
    }
    return new NiceAction(this, actionSchema, id);
  }

  isExactActionDomain(
    action: unknown,
  ): action is NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>> {
    return (
      action instanceof NiceActionPrimed &&
      this.allDomains.includes(action.coreAction.domain.domain)
    );
  }

  matchAction<ID extends keyof ACT_DOM["schema"] & string>(
    action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
    id: ID,
  ): NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]> | null {
    if (this.isExactActionDomain(action) && action.coreAction.id === id) {
      return action as NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]>;
    }
    return null;
  }

  /**
   * Add an observer that is called after every action dispatched through this domain.
   * Returns an unsubscribe function — call it to remove the listener.
   */
  addActionListener(listener: TActionListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  async _dispatchAction(
    primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
    envId?: string,
  ): Promise<unknown> {
    if (envId != null) {
      const handler = this._handlers.get(envId);
      if (handler) {
        const result = await handler.handleAction(primed);
        for (const listener of this._listeners) await listener(primed);
        return result;
      }
      const resolver = this._resolvers.get(envId);
      if (resolver) {
        const result = await resolver._resolvePrimed(primed);
        for (const listener of this._listeners) await listener(primed);
        return result;
      }
      throw err_nice_action.fromId(EErrId_NiceAction.action_environment_not_found, {
        domain: this.domain,
        envId,
      });
    }

    const defaultHandler = this._handlers.get(undefined);
    if (defaultHandler) {
      const result = await defaultHandler.handleAction(primed);
      for (const listener of this._listeners) await listener(primed);
      return result;
    }

    const defaultResolver = this._resolvers.get(undefined);
    if (defaultResolver) {
      const result = await defaultResolver._resolvePrimed(primed);
      for (const listener of this._listeners) await listener(primed);
      return result;
    }

    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
  }

  /**
   * Reconstruct a NiceActionPrimed from its serialized wire format.
   * Runs the schema's deserializeInput if a custom serialization was defined.
   */
  hydrateAction(
    serialized: ISerializedNiceAction,
  ): NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>> {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.actionId as keyof ACT_DOM["schema"] & string;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.actionId,
      });
    }

    const coreAction = this.action(id);
    const rawInput = coreAction.schema.deserializeInput(serialized.input);
    return new NiceActionPrimed(coreAction, rawInput);
  }

  /**
   * Reconstruct a NiceActionResponse from its serialized wire format.
   * The result is loosely typed — `result.error` is `NiceError<TUnknownNiceErrorDef>`.
   * Use `handleWith` / `forDomain` / `isExact` to route errors on the receiving end.
   */
  hydrateResponse(
    serialized: ISerializedNiceActionResponse,
  ): NiceActionResponse<INiceActionDomain, NiceActionSchema<any, any, any>> {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.actionId as keyof ACT_DOM["schema"] & string;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.actionId,
      });
    }

    const coreAction = this.action(id);
    return hydrateNiceActionResponse(serialized, coreAction);
  }

  /**
   * Register a `NiceActionHandler` on this domain.
   *
   * Pass `options.envId` to register under a named environment — useful when multiple
   * execution environments (e.g. worker, main thread) share the same domain definition.
   * Named handlers are targeted by passing the same `envId` to `action.execute(input, envId)`.
   *
   * Omit `envId` to register the default handler, used when no `envId` is passed to `execute`.
   * Throws `environment_already_registered` / `domain_action_handler_conflict` if already taken.
   */
  setActionHandler(handler?: NiceActionHandler, options?: { envId?: string }): NiceActionHandler {
    const envId = options?.envId;
    if (this._handlers.has(envId)) {
      if (envId != null) {
        throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
          domain: this.domain,
          envId,
        });
      }
      throw err_nice_action.fromId(EErrId_NiceAction.domain_action_handler_conflict, {
        domain: this.domain,
      });
    }
    const h = handler ?? new NiceActionHandler();
    this._handlers.set(envId, h);
    return h;
  }

  /**
   * Register a resolver as the fallback execution path for this domain.
   *
   * When no handler is set (or no envId-matching handler), the domain falls back to the
   * resolver — calling `_resolvePrimed` directly, without re-serializing the input.
   *
   * Pass `options.envId` to register under a named environment.
   * Throws `environment_already_registered` if the envId (or default) is already taken.
   */
  registerResolver(resolver: INiceActionResolverLike, options?: { envId?: string }): this {
    const envId = options?.envId;
    if (this._resolvers.has(envId)) {
      throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
        domain: this.domain,
        envId: envId ?? "(default)",
      });
    }
    this._resolvers.set(envId, resolver);
    return this;
  }
}
