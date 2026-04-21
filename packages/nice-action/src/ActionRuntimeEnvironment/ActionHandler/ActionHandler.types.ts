import type {
  MaybePromise,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../../ActionDomain/NiceActionDomain.types";
import type { NiceActionSchema } from "../../ActionSchema/NiceActionSchema";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";

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
  /**
   * An action "match tag" for the handler.
   *
   * This can be used to specify which handler should be used for a given
   * action.
   */
  tag?: string;
}

export type TActionHandlerDispatchResult = { handled: true; output: unknown } | { handled: false };
