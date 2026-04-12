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

  async execute(): Promise<TInferOutputFromSchema<SCH>["Output"]> {
    return this.coreAction.domain._dispatchAction(this) as Promise<TInferOutputFromSchema<SCH>["Output"]>;
  }
}
