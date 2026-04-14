import { NiceActionRequester } from "../ActionRequestResponse/ActionRequester/NiceActionRequester";
import type { NiceActionDomainResponder } from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceAction } from "../NiceAction/NiceAction";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../NiceAction/NiceAction.types";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";
import { hydrateNiceActionResponse, NiceActionResponse } from "../NiceAction/NiceActionResponse";
import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TActionListener,
  TInferInputFromSchema,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";

export class NiceActionDomain<ACT_DOM extends INiceActionDomain = INiceActionDomain>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["schema"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly schema: ACT_DOM["schema"];
  private _listeners: TActionListener[] = [];
  private _requesters = new Map<string | undefined, NiceActionRequester>();
  private _responders = new Map<string | undefined, NiceActionDomainResponder<INiceActionDomain>>();

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

  primeUnknown(
    actionId: ACT_DOM["allDomains"][number],
    input: unknown,
  ): NiceActionPrimed<ACT_DOM, string, ACT_DOM["schema"][string]> {
    const action = this.action(actionId as keyof ACT_DOM["schema"] & string).prime(
      input as TInferInputFromSchema<ACT_DOM["schema"][keyof ACT_DOM["schema"] & string]>["Input"],
    );
    return action;
  }

  primeAction<ID extends keyof ACT_DOM["schema"] & string>(
    id: ID,
    input: TInferInputFromSchema<ACT_DOM["schema"][ID]>["Input"],
  ): NiceActionPrimed<ACT_DOM, ID, ACT_DOM["schema"][ID]> {
    return this.action(id).prime(input);
  }

  action<ID extends keyof ACT_DOM["schema"] & string>(
    id: ID,
  ): NiceAction<ACT_DOM, ID, ACT_DOM["schema"][ID]> {
    const actionSchema = this.schema[id];
    if (!actionSchema) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_id_not_in_domain, {
        domain: this.domain,
        actionId: id as string,
      });
    }
    return new NiceAction<ACT_DOM, ID, ACT_DOM["schema"][ID]>(this, actionSchema, id);
  }

  isExactActionDomain<ID extends keyof ACT_DOM["schema"] & string>(
    action: unknown,
  ): action is NiceActionPrimed<ACT_DOM, ID, ACT_DOM["schema"][ID]> {
    return action instanceof NiceActionPrimed && this.domain === action.domain;
  }

  matchAction<ID extends keyof ACT_DOM["schema"] & string>(
    action: unknown,
    id: ID,
  ): NiceActionPrimed<ACT_DOM, ID, ACT_DOM["schema"][ID]> | null {
    if (this.isExactActionDomain(action) && action.coreAction.id === id) {
      return action as unknown as NiceActionPrimed<ACT_DOM, ID, ACT_DOM["schema"][ID]>;
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

  async _dispatchAction<P extends NiceActionPrimed<ACT_DOM, string, ACT_DOM["schema"][string]>>(
    primed: P,
    envId?: string,
  ): Promise<unknown> {
    if (envId != null) {
      const requester = this._requesters.get(envId);
      if (requester) {
        const result = await requester.handleAction(primed);
        for (const listener of this._listeners) await listener(primed);
        return result;
      }
      const responder = this._responders.get(envId);
      if (responder) {
        const result = await responder._resolvePrimed(primed);
        for (const listener of this._listeners) await listener(primed);
        return result;
      }
      throw err_nice_action.fromId(EErrId_NiceAction.action_environment_not_found, {
        domain: this.domain,
        envId,
      });
    }

    const defaultHandler = this._requesters.get(undefined);
    if (defaultHandler) {
      const result = await defaultHandler.handleAction(primed);
      for (const listener of this._listeners) await listener(primed);
      return result;
    }

    const defaultResolver = this._responders.get(undefined);
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
  hydrateAction<P extends INiceActionPrimed_JsonObject>(
    serialized: P,
  ): NiceActionPrimed<
    ACT_DOM,
    keyof ACT_DOM["schema"] & string,
    ACT_DOM["schema"][P["id"] & keyof ACT_DOM["schema"]]
  > {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.id;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.id,
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
  hydrateResponse<R extends TNiceActionResponse_JsonObject>(
    serialized: R,
  ): NiceActionResponse<
    ACT_DOM,
    keyof ACT_DOM["schema"] & string,
    ACT_DOM["schema"][R["id"] & keyof ACT_DOM["schema"]]
  > {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.id as keyof ACT_DOM["schema"] & string;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.id,
      });
    }

    const coreAction = this.action(id);
    return hydrateNiceActionResponse(serialized, coreAction);
  }

  /**
   * Register a `NiceActionRequester` on this domain.
   *
   * Pass `options.envId` to register under a named environment — useful when multiple
   * execution environments (e.g. worker, main thread) share the same domain definition.
   * Named requesters are targeted by passing the same `envId` to `action.execute(input, envId)`.
   *
   * Omit `envId` to register the default requester, used when no `envId` is passed to `execute`.
   * Throws `environment_already_registered` / `domain_action_requester_conflict` if already taken.
   */
  setActionRequester(
    handler?: NiceActionRequester,
    options?: { envId?: string },
  ): NiceActionRequester {
    const envId = options?.envId;
    if (this._requesters.has(envId)) {
      if (envId != null) {
        throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
          domain: this.domain,
          envId,
        });
      }
      throw err_nice_action.fromId(EErrId_NiceAction.domain_action_requester_conflict, {
        domain: this.domain,
      });
    }
    const h = handler ?? new NiceActionRequester();
    this._requesters.set(envId, h);
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
  registerResponder(
    resolver: NiceActionDomainResponder<ACT_DOM>,
    options?: { envId?: string },
  ): this {
    const envId = options?.envId;
    if (this._responders.has(envId)) {
      throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
        domain: this.domain,
        envId: envId ?? "(default)",
      });
    }
    this._responders.set(
      envId,
      resolver as unknown as NiceActionDomainResponder<INiceActionDomain>,
    );
    return this;
  }
}
