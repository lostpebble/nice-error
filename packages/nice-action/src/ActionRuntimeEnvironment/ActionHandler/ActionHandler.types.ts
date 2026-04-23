import type { INiceActionDomain, MaybePromise } from "../../ActionDomain/NiceActionDomain.types";
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
 * Format: `${matchTag | "_"}::${domainName}::${actionName | "_"}`
 */
export type TMatchHandlerKey = `${string | "_"}::${string}::${string | "_"}`;

export type THandleActionExecutionFn<A extends INiceAction<any, any>> =
  A extends INiceAction<infer DOM, infer IDS>
    ? (
        primed: NiceActionPrimed<DOM, IDS>,
      ) => MaybePromise<
        NiceActionResponse<DOM, IDS> | TNiceActionResponse_JsonObject<DOM, IDS> | undefined
      >
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

export type TListenToActionExecutionFn<DOM extends INiceActionDomain> = (
  primed: NiceActionPrimed<DOM>,
) => MaybePromise<void>;

export type TListenToActionResponseFn<DOM extends INiceActionDomain> = (
  response: NiceActionResponse<DOM>,
) => MaybePromise<void>;

export type TExecutionAndResponseListeners<DOM extends INiceActionDomain> = TAtLeastOne<{
  execution: TListenToActionExecutionFn<DOM>;
  response: TListenToActionResponseFn<DOM>;
}>;

export interface IActionHandlerInputs<DOM extends INiceActionDomain = INiceActionDomain> {
  /**
   * An action "match tag" for the handler.
   *
   * This can be used to specify which handler should be used for a given
   * action.
   */
  matchTag?: string;
  listeners?: TExecutionAndResponseListeners<DOM>[];
}

export type THandleActionResult =
  | { handled: true; response: NiceActionResponse<any, any> }
  | { handled: false };
