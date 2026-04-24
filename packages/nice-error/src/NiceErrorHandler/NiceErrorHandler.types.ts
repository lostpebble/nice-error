import type { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDomainProps, TDomainNiceErrorId } from "../NiceError/NiceError.types";
import type { NiceErrorHydrated } from "../NiceError/NiceErrorHydrated";

export type MaybePromise<T> = T | Promise<T>;
/**
 * Broad handler signature used internally for storage and dispatch.
 */
export type TBroadErrorHandler<E extends NiceError = NiceError, RES = unknown> = (
  action: E,
) => MaybePromise<RES>;

/**
 * Handler registered via forDomain.
 *
 * `act.input` is typed as the union of input types for every action in `ACT_DOM`,
 * and `act.coreAction` carries the matching schema — the same narrowing you get
 * from `forActionIds` over all action IDs in the domain.
 */
export type TErrorHandlerForDomain<ERR_DOM extends INiceErrorDomainProps> = (
  error: NiceErrorHydrated<ERR_DOM>,
) => MaybePromise<unknown>;

/**
 * Handler registered via forActionId — receives a specific action ID, with
 * the primed action's input narrowed to that ID's schema.
 */
export type TErrorIdHandlerForDomain<
  ERR_DOM extends INiceErrorDomainProps,
  ID extends TDomainNiceErrorId<ERR_DOM>,
> = (error: NiceErrorHydrated<ERR_DOM, ID>) => MaybePromise<unknown>;

export enum EErrorHandlerTargetType {
  ids = "ids",
  domain = "domain",
  default = "default",
}

export type TErrorHandlerTarget = (
  | {
      type: EErrorHandlerTargetType.ids;
      domain: string;
      ids: string[]; // if omitted, matches all IDs in the domain
    }
  | {
      type: EErrorHandlerTargetType.domain;
      domain: string;
    }
  | {
      type: EErrorHandlerTargetType.default;
    }
) & {
  identifier: string; // for debugging/logging — not used for matching
};

/**
 * A single case in a `handleWith` / `handleWithAsync` call.
 *
 * Construct via `forDomain` or `forIds` — do not build this object directly.
 */
export interface IErrorHandlerConfig<
  ERR extends NiceError<any, any> = NiceError<any, any>,
  RES = unknown,
> {
  /**
   * Duck-typed reference to the domain definition.
   * Needs only `isExact()` and `hydrate()` at runtime — avoids any circular value import.
   * @internal
   */
  // readonly target:
  readonly target: TErrorHandlerTarget;
  readonly _matcher: (action: ERR) => boolean;
  readonly _requester: TBroadErrorHandler<ERR, RES>;
}

export interface IErrorHandleAttempt_Success<RES = void> {
  handled: true;
  result: RES;
  target: TErrorHandlerTarget;
}

export interface IErrorHandleAttempt_Failure {
  handled: false;
  result?: undefined;
  targets: TErrorHandlerTarget[]; // all attempted targets, for debugging/logging
}

export type TErrorHandleAttempt<RES = void> =
  | IErrorHandleAttempt_Success<RES>
  | IErrorHandleAttempt_Failure;

export interface IHandleErrorOptions {
  throwOnUnhandled?: boolean;
}

export type THandleErrorWithPromiseInspection<RES = void> =
  | {
      isPromise: false;
      matched: true;
      target: TErrorHandlerTarget;
      handlerResponse: RES;
    }
  | {
      isPromise: true;
      matched: true;
      target: TErrorHandlerTarget;
      handlerPromise: Promise<RES>;
    }
  | {
      matched: false;
      attemptedTargets: TErrorHandlerTarget[];
    };

export type THandleResponse<RES = unknown> =
  | {
      handled: false;
    }
  | {
      handled: true;
      isPromise: boolean;
      response: RES;
    };
