import type {
  INiceActionDomain,
  MaybePromise,
  TInferOutputFromSchema,
} from "../../ActionDomain/NiceActionDomain.types";
import type {
  INiceAction,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import type { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import type { IRuntimeEnvironmentMeta } from "../ActionRuntimeEnvironment.types";

export type TAtLeastOne<T extends object> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Format: `${matchTag | "_"}::${domainName}::${actionName | "_"}`
 */
export type TMatchHandlerKey = `${string}::${string | "_"}`;

export interface IActionMetaInputs {
  /**
   * An action "tag" for the handler.
   *
   * This can be used to specify which handler should be used for a given
   * action.
   */
  tag?: string;
  meta?: any;
}

export interface IActionMetaInputsWithRuntime extends IActionMetaInputs {
  runtime: IRuntimeEnvironmentMeta;
}

export type THandleActionExecutionFn<A extends INiceAction<any, any>> =
  A extends INiceAction<infer DOM, infer IDS>
    ? (
        primed: NiceActionPrimed<DOM, IDS>,
        envData: IActionMetaInputsWithRuntime,
      ) => MaybePromise<
        | NiceActionResponse<DOM, IDS>
        | TNiceActionResponse_JsonObject<DOM, IDS>
        | TInferOutputFromSchema<DOM["actions"][IDS]>["Output"]
        | undefined
      >
    : never;

export type THandleActionResponseFn<A extends INiceAction<any, any>> =
  A extends INiceAction<infer DOM, infer IDS>
    ? (
        response: NiceActionResponse<DOM, IDS>,
        envData: IActionMetaInputsWithRuntime,
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
  envData: IActionMetaInputsWithRuntime,
) => void;

export type TListenToActionResponseFn<DOM extends INiceActionDomain> = (
  response: NiceActionResponse<DOM>,
  envData: IActionMetaInputsWithRuntime,
) => void;

export type TExecutionAndResponseListeners<DOM extends INiceActionDomain> = TAtLeastOne<{
  execution: TListenToActionExecutionFn<DOM>;
  response: TListenToActionResponseFn<DOM>;
}>;

export interface IActionHandlerInputs<DOM extends INiceActionDomain = INiceActionDomain> {
  listeners?: TExecutionAndResponseListeners<DOM>[];
  actionMeta: IActionMetaInputs;
}

export type THandleActionResult =
  | { handled: true; response: NiceActionResponse<any, any> }
  | { handled: false };

export type TStoredHandlers<A extends INiceAction<any, any> = INiceAction<any, any>> = {
  execution?: THandleActionExecutionFn<A>;
  response?: THandleActionResponseFn<A>;
};

export enum EActionHandlerType {
  connect = "connect",
  custom = "custom",
}

export interface IActionHandler {
  cuid: string;
  handlerType: EActionHandlerType;
  dispatchAction: (primed: NiceActionPrimed<any, any>) => Promise<NiceActionResponse<any, any>>;
}
