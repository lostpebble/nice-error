import type { StandardSchemaV1 } from "@standard-schema/spec";
import { nanoid } from "nanoid";
import * as v from "valibot";
import type { NiceActionDomain } from "../ActionDomain/NiceActionDomain";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { IActionMetaInputs } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import { EActionState } from "./NiceAction.enums";
import {
  type INiceAction,
  type INiceAction_JsonObject,
  type INiceActionPrimed_JsonObject,
  type TNiceActionResult,
} from "./NiceAction.types";
import { NiceActionPrimed } from "./NiceActionPrimed";
import { NiceActionResponse } from "./NiceActionResponse";

export class NiceAction<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
> implements INiceAction<DOM, ID>
{
  readonly type = EActionState.empty;
  readonly id: ID;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly timeCreated: number;
  readonly cuid: string;

  constructor(
    readonly actionDomain: NiceActionDomain<DOM>,
    readonly schema: SCH,
    id: ID,
    hydrationData?: Pick<INiceAction_JsonObject<DOM, ID>, "cuid" | "timeCreated">,
  ) {
    this.id = id;
    this.domain = actionDomain.domain;
    this.allDomains = actionDomain.allDomains;
    this.timeCreated = hydrationData?.timeCreated ?? Date.now();
    this.cuid = hydrationData?.cuid ?? nanoid();
  }

  /**
   * Serialize this action definition (without input) to a JSON-safe object.
   * Useful for describing which action will be invoked without yet having input.
   */
  toJsonObject(): INiceAction_JsonObject<DOM, ID> {
    return {
      type: EActionState.empty,
      domain: this.domain,
      allDomains: this.allDomains,
      id: this.id,
      timeCreated: this.timeCreated,
      cuid: this.cuid,
    };
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonObject());
  }

  toHttpResponse(): Response {
    return new Response(this.toJsonString(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  toValidationSchema(): StandardSchemaV1 {
    return v.object({
      domain: v.literal(this.domain),
      allDomains: v.pipe(
        v.array(v.string()),
        v.length(this.allDomains.length),
        v.includes(this.domain),
      ),
      id: v.literal(this.id),
    });
  }

  is(action: unknown): action is NiceActionPrimed<DOM, ID, SCH> {
    return (
      action instanceof NiceActionPrimed &&
      action.coreAction.domain === this.domain &&
      action.coreAction.id === this.id
    );
  }

  prime(
    input: TInferInputFromSchema<SCH>["Input"],
    hydrationData?: Pick<INiceActionPrimed_JsonObject<DOM, ID>, "timePrimed">,
  ): NiceActionPrimed<DOM, ID, SCH> {
    return new NiceActionPrimed(this, input, hydrationData);
  }

  async execute(
    input: TInferInputFromSchema<SCH>["Input"],
    meta?: IActionMetaInputs,
  ): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    const primed = new NiceActionPrimed(this, input);
    return this.actionDomain._executeAction(primed, { actionMeta: meta ?? {} });
  }

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, output }`. On failure: `{ ok: false, error }`.
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
   * console.log(result.output); // typed as the action's OUTPUT
   * ```
   */
  async executeSafe(
    input: TInferInputFromSchema<SCH>["Input"],
    meta?: IActionMetaInputs,
  ): Promise<TNiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute(input, meta);
      return { ok: true, output: value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }

  /**
   * Prime this action with input, execute it, and return a `NiceActionResponse`
   * that carries both the original primed action (domain + actionId + input) and
   * the result (`{ ok: true, output }` or `{ ok: false, error }`).
   *
   * The response can be serialized for cross-boundary transport via `toJsonObject()`.
   * Reconstruct on the receiving end with `domain.hydrateResponse(wire)`.
   */
  async executeToResponse(
    input: TInferInputFromSchema<SCH>["Input"],
    meta?: IActionMetaInputs,
  ): Promise<NiceActionResponse<DOM, ID, SCH>> {
    const primed = this.prime(input);
    const result = await primed.executeSafe(meta);
    return new NiceActionResponse<DOM, ID, SCH>(primed, result);
  }
}
