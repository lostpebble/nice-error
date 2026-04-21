import type {
  MaybePromise,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

export type TActionHandlerDispatchFn = (
  primed: NiceActionPrimed<any, any, any>,
) => MaybePromise<unknown>;

export type TActionHandlerResolverFn<SCH extends NiceActionSchema<any, any, any>> = (
  input: TInferInputFromSchema<SCH>["Input"],
) => MaybePromise<TInferOutputFromSchema<SCH>["Output"]>;

export interface IActionHandlerCase {
  readonly _matcher: (primed: NiceActionPrimed<any, any, any>) => boolean;
  readonly _handler: TActionHandlerDispatchFn;
}

export interface IActionHandlerConfig {
  /** Handle target identifier — appears in route entries. Defaults to a random nanoid. */
  ht?: string;
  /** Runtime label — appears in route entries to identify which environment handled the action. */
  runtime?: string;
}

export type TActionHandlerDispatchResult =
  | { handled: true; output: unknown }
  | { handled: false };
