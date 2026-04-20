import { castNiceError } from "@nice-code/error";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { NiceActionSchema } from "../../ActionSchema/NiceActionSchema";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type { INiceActionPrimed_JsonObject } from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import type { TActionResponderFn } from "./NiceActionResponder.types";

export class NiceActionDomainResponder<DOM extends INiceActionDomain> {
  private _domain: NiceActionDomain<DOM>;
  private _responders = new Map<string, TActionResponderFn<NiceActionSchema<any, any, any>>>();

  constructor(domain: NiceActionDomain<DOM>) {
    this._domain = domain;
  }

  get domainId(): DOM["domain"] {
    return this._domain.domain;
  }

  /**
   * Register a responder function for a specific action ID in this domain.
   * The input and output types are inferred from the domain's schema for that action ID.
   *
   * @example
   * ```ts
   * createDomainResponder(myDomain)
   *   .resolve("myAction", async (input) => {
   *     return { result: await db.query(input.id) };
   *   });
   * ```
   */
  resolveAction<ID extends keyof DOM["actions"] & string>(
    actionId: ID,
    fn: TActionResponderFn<DOM["actions"][ID]>,
  ): this {
    this._responders.set(actionId, fn as TActionResponderFn<NiceActionSchema<any, any, any>>);
    return this;
  }

  /**
   * Internal: called by `NiceActionDomain._dispatchAction` when this resolver is registered
   * as the domain's fallback. Calls the registered fn directly — no re-serialization.
   * Errors from the fn propagate naturally (consistent with handler dispatch).
   *
   * Throws `resolver_action_not_registered` if no fn was registered for the action ID.
   */
  async _resolvePrimed(primed: NiceActionPrimed<any, any, any>): Promise<unknown> {
    const resolver = this._responders.get(primed.coreAction.id);
    if (resolver == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_action_not_registered, {
        domain: primed.domain,
        actionId: primed.coreAction.id,
      });
    }
    const validatedInput = await primed.coreAction.schema.validateInput(primed.input, {
      domain: primed.domain,
      actionId: primed.coreAction.id,
    });
    const response = await resolver(validatedInput);
    return response;
  }

  /**
   * Internal: hydrate the wire action, call the registered resolver fn, and return a
   * `NiceActionResponse`. Any error thrown by the resolver fn is caught and wrapped in the
   * response as `{ ok: false }` via `castNiceError`.
   *
   * Throws `resolver_action_not_registered` if no fn was registered for the action ID.
   * Throws `hydration_*` errors (from `NiceActionDomain.hydrateAction`) if the action ID
   * is not part of this domain's schema.
   */
  async _dispatch<P extends INiceActionPrimed_JsonObject<DOM, string>>(
    wire: P,
  ): Promise<NiceActionResponse<DOM, P["id"], DOM["actions"][P["id"]]>> {
    const primed = this._domain.hydratePrimed(wire);

    // _resolvePrimed throws synchronously for unregistered actions — intentionally outside
    // the try/catch so programming errors are not swallowed into the response.
    const resolverFn = this._responders.get(wire.id);
    if (resolverFn == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_action_not_registered, {
        domain: wire.domain,
        actionId: wire.id,
      });
    }

    try {
      const validatedInput = await primed.coreAction.schema.validateInput(primed.input, {
        domain: wire.domain,
        actionId: wire.id,
      });
      const output = await resolverFn(validatedInput);
      return new NiceActionResponse<DOM, P["id"], DOM["actions"][P["id"] & keyof DOM["actions"]]>(
        primed,
        {
          ok: true,
          output: output,
        },
      );
    } catch (e) {
      return new NiceActionResponse<DOM, P["id"], DOM["actions"][P["id"] & keyof DOM["actions"]]>(
        primed,
        {
          ok: false,
          error: castNiceError(e) as any,
        },
      );
    }
  }
}

/**
 * Create a `NiceActionDomainResponder` for `domain`.
 * Chain `.resolveAction(actionId, fn)` calls to register typed resolver functions,
 * then pass the responder to `createResolverEnvironment`.
 */
export function createDomainResponder<DOM extends INiceActionDomain>(
  domain: NiceActionDomain<DOM>,
): NiceActionDomainResponder<DOM> {
  return new NiceActionDomainResponder(domain);
}
