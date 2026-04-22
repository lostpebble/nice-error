import type { MaybePromise } from "../../ActionDomain/NiceActionDomain.types";
import type {
  INiceAction,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../NiceAction/NiceActionResponse";

export type TAtLeastOne<T extends object> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Format: `${matchTag | "_"}::${domainName | "_"}::${actionName | "_"}`
 */
export type TMatchHandlerKey = `${string}::${string}::${string}`;

export type THandleActionExecutionFn<A extends INiceAction<any, any>> =
  A extends INiceAction<infer DOM, infer IDS>
    ? (
        primed: NiceActionPrimed<DOM, IDS>,
      ) => MaybePromise<NiceActionResponse<DOM, IDS> | TNiceActionResponse_JsonObject<DOM, IDS> | undefined>
    : never;

export type THandleActionResponseFn<A extends INiceAction<any, any>> =
  A extends INiceAction<infer DOM, infer IDS>
    ? (
        response: NiceActionResponse<DOM, IDS>,
      ) => MaybePromise<
        NiceActionResponse<DOM, IDS> | TNiceActionResponse_JsonObject<DOM, IDS> | undefined
      >
    : never;

export type TExecutionAndResponseHandlers<A extends INiceAction<any, any>> = TAtLeastOne<{
  execution: THandleActionExecutionFn<A>;
  response: THandleActionResponseFn<A>;
}>;

export interface IActionHandlerConfig {
  /**
   * An action "match tag" for the handler.
   *
   * This can be used to specify which handler should be used for a given
   * action.
   */
  matchTag?: string;
}

export type THandleActionResult =
  | { handled: true; response: NiceActionResponse<any, any> }
  | { handled: false };
