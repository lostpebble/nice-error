import { castNiceError } from "@nice-error/core";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type { NiceActionDomain } from "../NiceActionDomain";
import type {
  INiceActionDomainDef,
  INiceActionResolverLike,
  ISerializedNiceAction,
} from "../NiceActionDomain.types";
import type { NiceActionPrimed } from "../NiceActionPrimed";
import { NiceActionResponse } from "../NiceActionResponse";
import type { TActionResolverFn } from "./NiceActionResolver.types";

export class NiceActionDomainResolver<DOM extends INiceActionDomainDef>
  implements INiceActionResolverLike
{
  private _domain: NiceActionDomain<DOM>;
  private _resolvers = new Map<string, TActionResolverFn<NiceActionSchema<any, any, any>>>();

  constructor(domain: NiceActionDomain<DOM>) {
    this._domain = domain;
  }

  get domainId(): DOM["domain"] {
    return this._domain.domain;
  }

  /**
   * Register a resolver function for a specific action ID in this domain.
   * The input and output types are inferred from the domain's schema for that action ID.
   *
   * @example
   * ```ts
   * createDomainResolver(myDomain)
   *   .resolve("myAction", async (input) => {
   *     return { result: await db.query(input.id) };
   *   });
   * ```
   */
  resolve<ID extends keyof DOM["schema"] & string>(
    actionId: ID,
    fn: TActionResolverFn<DOM["schema"][ID]>,
  ): this {
    this._resolvers.set(actionId, fn as TActionResolverFn<NiceActionSchema<any, any, any>>);
    return this;
  }

  /**
   * Internal: called by `NiceActionDomain._dispatchAction` when this resolver is registered
   * as the domain's fallback. Calls the registered fn directly — no re-serialization.
   * Errors from the fn propagate naturally (consistent with handler dispatch).
   *
   * Throws `resolver_action_not_registered` if no fn was registered for the action ID.
   */
  async _resolvePrimed(
    primed: NiceActionPrimed<any, NiceActionSchema<any, any, any>>,
  ): Promise<unknown> {
    const resolver = this._resolvers.get(primed.coreAction.id);
    if (resolver == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_action_not_registered, {
        domain: primed.coreAction.domain.domain,
        actionId: primed.coreAction.id,
      });
    }
    return resolver(primed.input);
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
  async _dispatch(
    wire: ISerializedNiceAction,
  ): Promise<NiceActionResponse<any, NiceActionSchema<any, any, any>>> {
    const primed = this._domain.hydrateAction(wire);

    // _resolvePrimed throws synchronously for unregistered actions — intentionally outside
    // the try/catch so programming errors are not swallowed into the response.
    const resolverFn = this._resolvers.get(wire.actionId);
    if (resolverFn == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_action_not_registered, {
        domain: wire.domain,
        actionId: wire.actionId,
      });
    }

    try {
      const output = await resolverFn(primed.input);
      return new NiceActionResponse(primed, { ok: true, value: output });
    } catch (e) {
      return new NiceActionResponse(primed, { ok: false, error: castNiceError(e) as any });
    }
  }
}

/**
 * Create a `NiceActionDomainResolver` for `domain`.
 * Chain `.resolve(actionId, fn)` calls to register typed resolver functions,
 * then pass the resolver to `createResolverEnvironment`.
 */
export function createDomainResolver<DOM extends INiceActionDomainDef>(
  domain: NiceActionDomain<DOM>,
): NiceActionDomainResolver<DOM> {
  return new NiceActionDomainResolver(domain);
}
