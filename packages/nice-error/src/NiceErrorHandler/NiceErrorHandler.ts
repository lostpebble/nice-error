import type { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDomainProps, TDomainNiceErrorId } from "../NiceError/NiceError.types";
import type { NiceErrorDomain } from "../NiceErrorDefined/NiceErrorDefined";
import {
  EErrorHandlerTargetType,
  type IErrorHandlerConfig,
  type IHandleErrorOptions,
  type TBroadErrorHandler,
  type THandleErrorWithPromiseInspection,
} from "./NiceErrorHandler.types";

export class NiceErrorHandler<RES_DEF = never, RES = never> {
  private handlerConfigs: IErrorHandlerConfig<any, RES>[] = [];
  private _defaultRequester?: TBroadErrorHandler<NiceError<any, any>, RES_DEF>;

  /* handleError(
    error: NiceError<any, any>,
    options?: IHandleErrorOptions,
  ): MaybePromise<TErrorHandleAttempt<RES>> {
    for (const handlerConfig of this.handlerConfigs) {
      if (!handlerConfig._matcher(error)) continue;
      const errorResult = handlerConfig._requester(error);

      if (errorResult instanceof Promise) {
        return errorResult.then((result) => ({
          handled: true,
          result,
          target: handlerConfig.target,
        }));
      }

      return {
        handled: true,
        result: errorResult as RES,
        target: handlerConfig.target,
      };
    }

    if (this._defaultRequester) {
      const defaultResult = this._defaultRequester(error);

      if (defaultResult instanceof Promise) {
        return defaultResult.then((result) => ({
          handled: true,
          result: result as RES,
          target: {
            type: EErrorHandlerTargetType.default,
          },
        }));
      }

      return {
        handled: true,
        result: defaultResult as RES,
        target: { type: EErrorHandlerTargetType.default },
      };
    }

    if (options?.throwOnUnhandled === true) {
      throw error;
    }

    return {
      handled: false,
      targets: this.handlerConfigs.map((config) => config.target),
    };
  } */

  handleErrorWithPromiseInspection(
    error: NiceError<any, any>,
    options?: IHandleErrorOptions,
  ): THandleErrorWithPromiseInspection<RES | RES_DEF> {
    for (const handlerConfig of this.handlerConfigs) {
      if (!handlerConfig._matcher(error)) continue;
      const errorResult = handlerConfig._requester(error);

      if (errorResult instanceof Promise) {
        return {
          isPromise: true,
          matched: true,
          target: handlerConfig.target,
          handlerPromise: errorResult,
        };
      }

      return {
        isPromise: false,
        matched: true,
        target: handlerConfig.target,
        handlerResponse: errorResult as RES,
      };
    }

    if (this._defaultRequester) {
      const defaultResult = this._defaultRequester(error);

      if (defaultResult instanceof Promise) {
        return {
          isPromise: true,
          matched: true,
          target: {
            type: EErrorHandlerTargetType.default,
          },
          handlerPromise: defaultResult,
        };
      }

      return {
        isPromise: false,
        matched: true,
        target: { type: EErrorHandlerTargetType.default },
        handlerResponse: defaultResult,
      };
    }

    if (options?.throwOnUnhandled === true) {
      throw error;
    }

    return {
      matched: false,
      attemptedTargets: this.handlerConfigs.map((config) => config.target),
    };
  }

  /**
   * Register a handler that fires for **any** action whose domain matches `domain`.
   * `act.input` is typed as the union of input types for all actions in `domain`.
   * First matching case wins.
   */
  forDomain<DEF extends INiceErrorDomainProps>(
    domain: NiceErrorDomain<DEF>,
    handler: (error: NiceError<DEF, TDomainNiceErrorId<DEF>>) => void | Promise<void>,
  ): NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>> {
    (this as NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.domain,
        domain: domain.domain,
      },
      _matcher: (error) => domain.isExact(error),
      _requester: handler,
    });
    return this;
  }

  forId<DEF extends INiceErrorDomainProps, ID extends TDomainNiceErrorId<DEF>>(
    domain: NiceErrorDomain<DEF>,
    id: ID,
    handler: (error: NiceError<DEF, ID>) => void | Promise<void>,
  ): NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>> {
    (this as NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.ids,
        domain: domain.domain,
        ids: [id],
      },
      _matcher: (error) => domain.isExact(error) && error.hasId(id),
      _requester: handler,
    });
    return this;
  }

  forIds<DEF extends INiceErrorDomainProps, IDS extends TDomainNiceErrorId<DEF>[]>(
    domain: NiceErrorDomain<DEF>,
    ids: IDS,
    handler: (error: NiceError<DEF, IDS[number]>) => void | Promise<void>,
  ): NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>> {
    (this as NiceErrorHandler<RES_DEF, RES | ReturnType<typeof handler>>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.ids,
        domain: domain.domain,
        ids: ids,
      },
      _matcher: (error) => domain.isExact(error) && ids.some((id) => error.hasId(id)),
      _requester: handler,
    });
    return this;
  }

  /**
   * Register a fallback handler that fires when no other case matches.
   * Only one default handler can be registered — calling this twice replaces the previous one.
   */
  setDefaultHandler<H extends TBroadErrorHandler<NiceError<any, any>, unknown>>(
    handler: H,
  ): H extends TBroadErrorHandler<NiceError<any, any>, infer _RES_DEF>
    ? NiceErrorHandler<_RES_DEF, RES>
    : NiceErrorHandler<unknown, RES | ReturnType<H>> {
    (
      this as H extends TBroadErrorHandler<NiceError<any, any>, infer _RES_DEF>
        ? NiceErrorHandler<_RES_DEF, RES>
        : NiceErrorHandler<unknown, RES | ReturnType<H>>
    )._defaultRequester = handler;

    return this as NiceErrorHandler<ReturnType<H> extends void ? void : ReturnType<H>, RES>;
  }
}
