import { NiceActionRequester } from "../ActionRequestResponse/ActionRequester/NiceActionRequester";
import type { NiceActionDomainResponder } from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceAction } from "../NiceAction/NiceAction";
import { EActionState } from "../NiceAction/NiceAction.enums";
import {
  type INiceAction_JsonObject,
  type INiceActionPrimed_JsonObject,
  type TNiceActionResponse_JsonObject,
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
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["actions"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly actions: ACT_DOM["actions"];
  private _listeners: TActionListener[] = [];
  private _requesters = new Map<string | undefined, NiceActionRequester>();
  private _responders = new Map<string | undefined, NiceActionDomainResponder<INiceActionDomain>>();

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.actions = definition.actions;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    return new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      actions: subDomainDef.actions,
    });
  }

  primeUnknown(
    actionId: ACT_DOM["allDomains"][number],
    input: unknown,
  ): NiceActionPrimed<ACT_DOM, string, ACT_DOM["actions"][string]> {
    const action = this.action(actionId as keyof ACT_DOM["actions"] & string).prime(
      input as TInferInputFromSchema<
        ACT_DOM["actions"][keyof ACT_DOM["actions"] & string]
      >["Input"],
    );
    return action;
  }

  primeAction<ID extends keyof ACT_DOM["actions"] & string>(
    id: ID,
    input: TInferInputFromSchema<ACT_DOM["actions"][ID]>["Input"],
  ): NiceActionPrimed<ACT_DOM, ID, ACT_DOM["actions"][ID]> {
    return this.action(id).prime(input);
  }

  action<ID extends keyof ACT_DOM["actions"] & string>(
    id: ID,
    hydrationData?: Pick<INiceAction_JsonObject<ACT_DOM, ID>, "cuid" | "timeCreated" | "route">,
  ): NiceAction<ACT_DOM, ID, ACT_DOM["actions"][ID]> {
    const actionSchema = this.actions[id];
    if (!actionSchema) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_id_not_in_domain, {
        domain: this.domain,
        actionId: id as string,
      });
    }
    return new NiceAction<ACT_DOM, ID, ACT_DOM["actions"][ID]>(
      this,
      actionSchema,
      id,
      hydrationData,
    );
  }

  isExactActionDomain<ID extends keyof ACT_DOM["actions"] & string>(
    action: unknown,
  ): action is NiceActionPrimed<ACT_DOM, ID, ACT_DOM["actions"][ID]> {
    return action instanceof NiceActionPrimed && this.domain === action.domain;
  }

  matchAction<ID extends keyof ACT_DOM["actions"] & string>(
    action: unknown,
    id: ID,
  ): NiceActionPrimed<ACT_DOM, ID, ACT_DOM["actions"][ID]> | null {
    if (this.isExactActionDomain(action) && action.coreAction.id === id) {
      return action as unknown as NiceActionPrimed<ACT_DOM, ID, ACT_DOM["actions"][ID]>;
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

  async _dispatchAction<P extends NiceActionPrimed<ACT_DOM, string, ACT_DOM["actions"][string]>>(
    primed: P,
    envId?: string,
  ): Promise<unknown> {
    // envId-specific requester takes first priority when registered.
    if (envId != null) {
      const envRequester = this._requesters.get(envId);

      if (envRequester) {
        const validatedPrimed = await this._withValidatedInput(primed);
        const result = await envRequester.handleAction(validatedPrimed);
        for (const listener of this._listeners) await listener(validatedPrimed);
        return result;
      }

      const envResponder = this._responders.get(envId);
      if (envResponder) {
        const result = await envResponder._resolvePrimed(primed);
        for (const listener of this._listeners) await listener(primed);
        return result;
      }
      // No envId-specific handler found — fall through to this domain's default handler
      // so that a domain's own registered handler always takes priority over an envId that
      // is not registered here (e.g. a child domain's local handler wins over a parent's
      // envId-keyed handler that was never registered on this domain).
    }

    const defaultRequester = this._requesters.get(undefined);
    if (defaultRequester) {
      const validatedPrimed = await this._withValidatedInput(primed);
      const result = await defaultRequester.handleAction(validatedPrimed);
      for (const listener of this._listeners) await listener(validatedPrimed);
      return result;
    }

    const defaultResponder = this._responders.get(undefined);
    if (defaultResponder) {
      const result = await defaultResponder._resolvePrimed(primed);
      for (const listener of this._listeners) await listener(primed);
      return result;
    }

    if (envId != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_environment_not_found, {
        domain: this.domain,
        envId,
      });
    }
    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
  }

  private async _withValidatedInput(
    primed: NiceActionPrimed<any, any, any>,
  ): Promise<NiceActionPrimed<any, any, any>> {
    const validatedInput = await primed.coreAction.schema.validateInput(primed.input, {
      domain: this.domain,
      actionId: primed.coreAction.id,
    });
    return primed.coreAction.prime(validatedInput);
  }

  /**
   * Reconstruct a NiceActionPrimed from its serialized wire format.
   * Runs the schema's deserializeInput if a custom serialization was defined.
   */
  hydratePrimed<P extends INiceActionPrimed_JsonObject>(
    serialized: P,
  ): NiceActionPrimed<
    ACT_DOM,
    keyof ACT_DOM["actions"] & string,
    ACT_DOM["actions"][P["id"] & keyof ACT_DOM["actions"]]
  > {
    if (serialized.type !== EActionState.primed) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_state_mismatch, {
        expected: EActionState.primed,
        received: serialized.type,
      });
    }

    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.id;
    if (!this.actions[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.id,
      });
    }

    const coreAction = this.action(id, {
      cuid: serialized.cuid,
      timeCreated: serialized.timeCreated,
      route: serialized.route,
    });

    const rawInput = coreAction.schema.deserializeInput(serialized.input);
    return new NiceActionPrimed(coreAction, rawInput, {
      timePrimed: serialized.timePrimed,
    });
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
    keyof ACT_DOM["actions"] & string,
    ACT_DOM["actions"][R["id"] & keyof ACT_DOM["actions"]]
  > {
    if (serialized.type !== EActionState.resolved) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_state_mismatch, {
        expected: EActionState.resolved,
        received: serialized.type,
      });
    }

    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.id as keyof ACT_DOM["actions"] & string;
    if (!this.actions[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.id,
      });
    }

    const coreAction = this.action(id, {
      cuid: serialized.cuid,
      timeCreated: serialized.timeCreated,
      route: serialized.route,
    });

    return hydrateNiceActionResponse(serialized, coreAction);
  }

  /**
   * Register a `NiceActionRequester` on this domain.
   *
   * Pass `options.envId` to register under a named environment — useful when multiple
   * execution environments (e.g. worker, main thread) share the same domain definition.
   * Named requesters are targeted by passing the same `envId` to `action.execute(input, envId)`.
   *
   * Omit `options` (or pass `undefined`) to register the default requester.
   * Pass an existing `NiceActionRequester` as `handler` to reuse a shared instance.
   * Throws `environment_already_registered` / `domain_action_requester_conflict` if already taken.
   */
  setActionRequester(
    options?: { envId?: string },
    handler?: NiceActionRequester,
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
