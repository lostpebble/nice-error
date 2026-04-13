import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionDomainResponder } from "./NiceActionResponder";

export class NiceActionResponderEnvironment {
  private _resolvers = new Map<string, NiceActionDomainResponder<INiceActionDomain>>();

  constructor(resolvers: NiceActionDomainResponder<INiceActionDomain>[]) {
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
  async dispatch(
    wire: INiceActionPrimed_JsonObject<INiceActionDomain, string>,
  ): Promise<TNiceActionResponse_JsonObject> {
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
 * Create a `NiceActionResponderEnvironment` from one or more domain resolvers.
 * The environment routes incoming serialized actions to the correct resolver by domain ID.
 *
 * @example
 * ```ts
 * const env = createResponderEnvironment([
 *   createDomainResolver(paymentDomain)
 *     .resolve("chargeCard", async (input) => { ... }),
 *   createDomainResolver(authDomain)
 *     .resolve("login", async (input) => { ... }),
 * ]);
 *
 * const serializedResponse = await env.dispatch(incomingWire);
 * ```
 */
export function createResponderEnvironment(
  resolvers: NiceActionDomainResponder<INiceActionDomain<any, any>>[],
): NiceActionResponderEnvironment {
  return new NiceActionResponderEnvironment(resolvers);
}
