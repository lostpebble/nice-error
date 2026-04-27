import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { IActionMetaInputs } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { IRuntimeEnvironmentMeta } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import { EActionState } from "./NiceAction.enums";
import {
  type INiceAction,
  type INiceActionPrimed_JsonObject,
  type TNiceActionResponse_JsonObject,
  type TNiceActionResult,
} from "./NiceAction.types";
import { NiceActionResponse } from "./NiceActionResponse";

export class NiceActionPrimed<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string = keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
> implements INiceAction<DOM, ID>
{
  readonly type = EActionState.primed;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;
  readonly timePrimed: number;
  readonly cuid: string;
  readonly schema: SCH;
  readonly timeCreated: number;

  constructor(
    readonly coreAction: NiceAction<DOM, ID, SCH>,
    private _input: TInferInputFromSchema<SCH>["Input"],
    hydrationData?: Pick<INiceActionPrimed_JsonObject<DOM, ID>, "timePrimed">,
  ) {
    this.domain = coreAction.domain;
    this.allDomains = coreAction.allDomains;
    this.id = coreAction.id;
    this.timePrimed = hydrationData?.timePrimed ?? Date.now();
    this.cuid = coreAction.cuid;
    this.schema = coreAction.schema;
    this.timeCreated = coreAction.timeCreated;
  }

  get input() {
    return this._input;
  }

  getEnvironmentMeta(): IRuntimeEnvironmentMeta {
    return this.coreAction.actionDomain.getEnvironmentMeta();
  }

  /**
   * Serialize this primed action to a JSON-safe wire format.
   * The input is passed through the schema's serialize function if one is defined,
   * otherwise the (already JSON-native) input is used as-is.
   */
  toJsonObject(): INiceActionPrimed_JsonObject<DOM, ID> {
    return {
      ...this.coreAction.toJsonObject(),
      type: EActionState.primed,
      input: this.coreAction.schema.serializeInput(this.input),
      timePrimed: this.timePrimed,
    };
  }

  toJsonString(): string {
    return JSON.stringify(this.toJsonObject());
  }

  hydratePrimeJson(wire: INiceActionPrimed_JsonObject<DOM, ID>): NiceActionPrimed<DOM, ID, SCH> {
    return this.coreAction.actionDomain.hydratePrimed(wire) as NiceActionPrimed<DOM, ID, SCH>;
  }

  hydrateResponseJson(
    wire: TNiceActionResponse_JsonObject<DOM, ID>,
  ): NiceActionResponse<DOM, ID, SCH> {
    return this.coreAction.actionDomain.hydrateResponse(wire) as NiceActionResponse<DOM, ID, SCH>;
  }

  errorResponse(err: TInferActionError<SCH>): NiceActionResponse<DOM, ID, SCH> {
    return new NiceActionResponse(this, { ok: false, error: err });
  }

  toHttpResponse(): Response {
    return new Response(this.toJsonString(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  setResponse(
    ...args: [TInferOutputFromSchema<SCH>["Output"]] extends [never]
      ? []
      : [output: TInferOutputFromSchema<SCH>["Output"]]
  ): NiceActionResponse<DOM, ID, SCH> {
    const output = args[0];
    const finalOutput = this.coreAction.schema.validateOutput(output, {
      domain: this.domain,
      actionId: this.id,
    });
    return new NiceActionResponse(this, { ok: true, output: finalOutput });
  }

  async execute(meta?: IActionMetaInputs): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction.actionDomain._executeAction(this, { actionMeta: meta ?? {} });
  }

  /**
   * Like `execute`, but catches thrown errors and returns a `NiceActionResult` discriminated union
   * instead of propagating. On success: `{ ok: true, output }`. On failure: `{ ok: false, error }`.
   *
   * Mirrors `NiceAction.executeSafe` — useful when re-executing a hydrated primed action.
   */
  async executeSafe(
    meta?: IActionMetaInputs,
  ): Promise<TNiceActionResult<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>>> {
    try {
      const value = await this.execute(meta);
      return { ok: true, output: value };
    } catch (error) {
      return { ok: false, error: error as TInferActionError<SCH> };
    }
  }
}
