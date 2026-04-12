import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import type { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "./NiceActionDomain.types";

export class NiceActionPrimed<DOM extends INiceActionDomain, SCH extends NiceActionSchema> {
  readonly _isPrimed = true;

  constructor(
    readonly coreAction: NiceAction<DOM, SCH>,
    readonly input: TInferInputFromSchema<SCH>["Input"],
  ) {}

  toJsonObject() {}

  async execute(
    input: TInferInputFromSchema<SCH>["Input"],
  ): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    const handler = this.coreAction.domain.handler;

    if (handler == null) {
      throw new Error(`No action handler registered for domain ${this.coreAction.domain.domain}`);
    }

    return await handler.handleAction(this);
  }
}
