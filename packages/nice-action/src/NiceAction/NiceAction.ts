import type { TInferActionError } from "./ActionSchema/NiceActionSchema";
import type { INiceAction, INiceAction_JsonObject, NiceActionResult } from "./NiceAction.types";
import type { NiceActionDomain } from "./NiceActionDomain";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";
import { NiceActionResponse } from "./NiceActionResponse";

export class NiceAction<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["schema"] & string,
  SCH extends DOM["schema"][ID],
> implements INiceAction<DOM, ID>
{
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly _actionDomain: NiceActionDomain<DOM>;

  constructor(
    readonly actionDomain: NiceActionDomain<DOM>,
    readonly schema: SCH,
    readonly id: ID,
  ) {
    this._actionDomain = actionDomain;
    this.domain = actionDomain.domain;
    this.allDomains = actionDomain.allDomains;
  }

  /**
   * Serialize this action definition (without input) to a JSON-safe object.
   * Useful for describing which action will be invoked without yet having input.
   */
  toJsonObject(): INiceAction_JsonObject<DOM, ID> {
    return {
      domain: this.domain,
      allDomains: this.allDomains,
      id: this.id,
    };
  }

  is(action: unknown): action is NiceActionPrimed<DOM, ID, SCH> {
    return (
      action instanceof NiceActionPrimed &&
      action.coreAction.domain.domain === this.domain &&
      action.coreAction.id === this.id
    );
  }

  prime(input: TInferInputFromSchema<SCH>["Input"]): NiceActionPrimed<DOM, ID, SCH> {
    return new NiceActionPrimed(this, input);
  }

  /**
   * Prime this action with input and immediately execute it through the domain handler or resolver.
   *
   * Pass `envId` to target a specific named handler/resolver registered on the domain via
   * `setActionHandler(h, { envId })` or `registerResolver(r, { envId })`.
   * Throws `action_environment_not_found` if no handler or resolver with that id exists.
   */
  async execute(
    input: TInferInputFromSchema<SCH>["Input"],
    envId?: string,
  ): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    const primed = new NiceActionPrimed(this, input);
    return this._actionDomain._dispatchAction(primed, envId) as Promise<
      TInferOutputFromSchema<SCH>["Output"]
    >;
  }

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, value }`. On failure: `{ ok: false, error }`.
   *
   * The `error` type is the union of all `NiceError` types declared via `.throws()` on the schema,
   * plus `InferNiceError<typeof err_cast_not_nice>` as the always-present fallback.
   *
   * @example
   * ```ts
   * const result = await domain.action("getUser").executeSafe({ userId: "123" });
   * if (!result.ok) {
   *   result.error.handleWith([
   *     forDomain(err_auth, (h) => res.status(401).end()),
   *   ]);
   *   return;
   * }
   * console.log(result.value);
   * ```
   */
  async executeSafe(
    input: TInferInputFromSchema<SCH>["Input"],
    envId?: string,
  ): Promise<NiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute(input, envId);
      return { ok: true, output: value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }

  /**
   * Prime this action with input, execute it, and return a `NiceActionResponse`
   * that carries both the original primed action (domain + actionId + input) and
   * the result (`{ ok: true, value }` or `{ ok: false, error }`).
   *
   * The response can be serialized for cross-boundary transport via `toJsonObject()`.
   * Reconstruct on the receiving end with `domain.hydrateResponse(wire)`.
   */
  async executeToResponse(
    input: TInferInputFromSchema<SCH>["Input"],
    envId?: string,
  ): Promise<NiceActionResponse<DOM, ID, SCH>> {
    const primed = this.prime(input);
    const result = await this.executeSafe(input, envId);
    return new NiceActionResponse<DOM, ID, SCH>(primed, result);
  }
}
