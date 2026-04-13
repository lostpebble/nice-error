import type {
  MaybePromise,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../../ActionDomain/NiceActionDomain.types";
import type { NiceActionSchema } from "../../ActionSchema/NiceActionSchema";

/**
 * A resolver function for a specific action.
 * Receives the deserialized input and must return (or resolve to) the deserialized output.
 */
export type TActionResponderFn<SCH extends NiceActionSchema<any, any, any>> = (
  input: TInferInputFromSchema<SCH>["Input"],
) => MaybePromise<TInferOutputFromSchema<SCH>["Output"]>;
