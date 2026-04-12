import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type {
  INiceActionDomainDef,
  ISerializedNiceAction,
  ISerializedNiceActionResponse,
} from "../NiceActionDomain.types";
import type { NiceActionDomainResolver } from "./NiceActionDomainResolver";

export class NiceActionResolverEnvironment {
  private _resolvers = new Map<string, NiceActionDomainResolver<INiceActionDomainDef>>();

  constructor(resolvers: NiceActionDomainResolver<INiceActionDomainDef>[]) {
    for (const resolver of resolvers) {
      this._resolvers.set(resolver.domainId, resolver);
    }
  }

  /**
   * Dispatch a serialized action to the matching domain resolver.
   *
   * Finds the resolver by `wire.domain`, hydrates the action, calls the registered fn,
   * and returns the serialized response as `ISerializedNiceActionResponse`.
   *
   * Throws `resolver_domain_not_registered` if no resolver was registered for the domain.
   *
   * @example
   * ```ts
   * // server handler
   * app.post("/actions", async (req, res) => {
   *   const response = await env.dispatch(req.body);
   *   res.json(response);
   * });
   * ```
   */
  async dispatch(wire: ISerializedNiceAction): Promise<ISerializedNiceActionResponse> {
    const resolver = this._resolvers.get(wire.domain);
    if (resolver == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.resolver_domain_not_registered, {
        domain: wire.domain,
      });
    }
    const response = await resolver._dispatch(wire);
    return response.toJsonObject();
  }
}

/**
 * Create a `NiceActionResolverEnvironment` from one or more domain resolvers.
 * The environment routes incoming serialized actions to the correct resolver by domain ID.
 *
 * @example
 * ```ts
 * const env = createResolverEnvironment([
 *   createDomainResolver(paymentDomain)
 *     .resolve("chargeCard", async (input) => { ... }),
 *   createDomainResolver(authDomain)
 *     .resolve("login", async (input) => { ... }),
 * ]);
 *
 * const serializedResponse = await env.dispatch(incomingWire);
 * ```
 */
export function createResolverEnvironment(
  resolvers: NiceActionDomainResolver<INiceActionDomainDef>[],
): NiceActionResolverEnvironment {
  return new NiceActionResolverEnvironment(resolvers);
}
