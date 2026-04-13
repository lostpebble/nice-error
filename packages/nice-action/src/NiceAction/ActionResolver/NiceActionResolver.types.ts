import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type {
  MaybePromise,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../NiceActionDomain.types";

/**
 * A resolver function for a specific action.
 * Receives the deserialized input and must return (or resolve to) the deserialized output.
 */
export type TActionResolverFn<SCH extends NiceActionSchema<any, any, any>> = (
  input: TInferInputFromSchema<SCH>["Input"],
) => MaybePromise<TInferOutputFromSchema<SCH>["Output"]>;
