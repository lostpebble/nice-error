import type { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
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
  TInferInputFromSchema,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";
import { NiceActionDomainBase } from "./NiceActionDomainBase";
import { type NiceActionRootDomain } from "./RootDomain/NiceActionRootDomain";

export class NiceActionDomain<
  ACT_DOM extends INiceActionDomain = INiceActionDomain,
> extends NiceActionDomainBase<ACT_DOM> {
  private _handlersByTag = new Map<string, ActionHandler>();
  private _rootDomain: NiceActionRootDomain;

  constructor(
    definition: ACT_DOM,
    {
      rootDomain,
    }: {
      rootDomain: NiceActionRootDomain;
    },
  ) {
    super(definition);
    this._rootDomain = rootDomain;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    if (this.allDomains.includes(subDomainDef.domain)) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_already_exists_in_hierarchy, {
        domain: subDomainDef.domain,
        allParentDomains: this.allDomains,
        parentDomain: this.domain,
      });
    }

    return new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>(
      {
        allDomains: [subDomainDef.domain, ...this.allDomains],
        domain: subDomainDef.domain,
        actions: subDomainDef.actions,
      },
      { rootDomain: this._rootDomain },
    );
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
   * Validate and return a primed action with confirmed input.
   * Used by ActionHandler.handleWire() for server-side wire dispatch.
   */
  async validatePrimed<P extends NiceActionPrimed<any, any, any>>(primed: P): Promise<P> {
    return this._withValidatedInput(primed) as Promise<P>;
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
      route: serialized.route ?? [],
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
      route: serialized.route ?? [],
    });

    return hydrateNiceActionResponse(serialized, coreAction);
  }

  /**
   * Delegates dispatch to the root domain. All handler/environment routing lives there.
   */
  async _dispatchAction(
    primed: NiceActionPrimed<any, any, any>,
    matchTag?: string,
  ): Promise<unknown> {
    // Try exact-tag handler registered on this domain
    const exactHandler = this._handlersByTag.get(matchTag ?? "_");
    if (exactHandler != null) {
      const validatedPrimed = await this._withValidatedInput(primed);
      const result = await exactHandler.dispatchAction(validatedPrimed);
      for (const listener of this._listeners) await listener(validatedPrimed);
      return result;
    }

    // If a specific matchTag was requested but not found, fall back to the
    // domain's default handler ("_") before escalating to the root domain.
    if (matchTag != null) {
      const defaultHandler = this._handlersByTag.get("_");
      if (defaultHandler != null) {
        const validatedPrimed = await this._withValidatedInput(primed);
        const result = await defaultHandler.dispatchAction(validatedPrimed);
        for (const listener of this._listeners) await listener(validatedPrimed);
        return result;
      }
    }

    // No domain-level handler — try the root domain (runtime environment routing).
    return this._rootDomain._dispatchAction(primed, matchTag);
  }

  /**
   * Register an `ActionHandler` on this domain.
   *
   * Pass `options.matchTag` to register under a named tag, targeted via
   * `action.execute(input, matchTag)`. Omit to register as the default handler.
   * Throws `domain_handler_conflict` if the default tag is registered twice, or
   * `environment_already_registered` if any other tag is registered twice.
   */
  setHandler(handler: ActionHandler, options?: { matchTag?: string }): this {
    const matchTag = options?.matchTag ?? handler.matchTag;
    if (this._handlersByTag.has(matchTag)) {
      if (matchTag === "_") {
        throw err_nice_action.fromId(EErrId_NiceAction.domain_handler_conflict, {
          domain: this.domain,
        });
      }
      throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
        domain: this.domain,
        matchTag: matchTag,
      });
    }
    this._handlersByTag.set(matchTag, handler);
    handler._onRegisteredWith(this);
    return this;
  }
}
