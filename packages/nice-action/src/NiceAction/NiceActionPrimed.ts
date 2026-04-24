import { extractMessageFromStandardSchema } from "@nice-code/common-errors";
import { castNiceError } from "@nice-code/error";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { IActionMetaInputs } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { IRuntimeEnvironmentMeta } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
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
> implements Omit<INiceAction<DOM, ID>, "schema" | "cuid" | "timeCreated">
{
  readonly type = EActionState.primed;
  readonly domain: DOM["domain"];
  readonly allDomains: DOM["allDomains"];
  readonly id: ID;
  readonly timePrimed: number;

  constructor(
    readonly coreAction: NiceAction<DOM, ID, SCH>,
    private _input: TInferInputFromSchema<SCH>["Input"],
    hydrationData?: Pick<INiceActionPrimed_JsonObject<DOM, ID>, "timePrimed">,
  ) {
    this.domain = coreAction.domain;
    this.allDomains = coreAction.allDomains;
    this.id = coreAction.id;
    this.timePrimed = hydrationData?.timePrimed ?? Date.now();
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

    let finalOutput: TInferOutputFromSchema<SCH>["Output"] | undefined = output;

    if (this.coreAction.schema.outputSchema != null) {
      const result = this.coreAction.schema.outputSchema["~standard"].validate(output);

      if (result instanceof Promise) {
        throw err_nice_action.fromId(EErrId_NiceAction.action_output_validation_promise, {
          domain: this.domain,
          actionId: this.id,
        });
      }

      if (result.issues != null) {
        throw err_nice_action.fromId(EErrId_NiceAction.action_output_validation_failed, {
          domain: this.domain,
          actionId: this.id,
          validationMessage: extractMessageFromStandardSchema(result),
        });
      }

      finalOutput = result.value as TInferOutputFromSchema<SCH>["Output"];
    }

    return new NiceActionResponse(this, { ok: true, output: finalOutput });
  }

  processResponse(wire: TNiceActionResponse_JsonObject): TInferOutputFromSchema<SCH>["Output"] {
    if (!wire.ok) {
      throw castNiceError(wire.error);
    }
    return this.coreAction.schema.deserializeOutput(wire.output as any);
  }

  async execute(meta?: IActionMetaInputs): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction.actionDomain._executeAction(this, { actionMeta: meta ?? {} });
  }

  validateInput(): this {
    const newInput = this.coreAction.schema.validateInput(this.input, {
      domain: this.domain,
      actionId: this.id,
    });

    this._input = newInput;

    return this;
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
