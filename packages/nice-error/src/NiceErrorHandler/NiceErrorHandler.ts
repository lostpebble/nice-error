import type { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDomainProps, TDomainNiceErrorId } from "../NiceError/NiceError.types";
import type { NiceErrorHydrated } from "../NiceError/NiceErrorHydrated";
import type { NiceErrorDomain } from "../NiceErrorDefined/NiceErrorDefined";
import {
  EErrorHandlerTargetType,
  type IErrorHandlerConfig,
  type IHandleErrorOptions,
  type MaybePromise,
  type TBroadErrorHandler,
  type THandleErrorWithPromiseInspection,
} from "./NiceErrorHandler.types";

export class NiceErrorHandler<RES_DEF = never, RES = never> {
  private handlerConfigs: IErrorHandlerConfig<any, RES>[] = [];
  private _defaultRequester?: TBroadErrorHandler<NiceError<any, any>, RES_DEF>;

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
            identifier: "[matched:default]",
          },
          handlerPromise: defaultResult,
        };
      }

      return {
        isPromise: false,
        matched: true,
        target: { type: EErrorHandlerTargetType.default, identifier: "[matched:default]" },
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
   * Register a handler that fires for **any** error whose domain matches `domain`.
   * The handler receives a fully hydrated error — `getContext`, `addId`, and `addContext`
   * are all available. First matching case wins.
   */
  forDomain<DEF extends INiceErrorDomainProps, H_RES = void>(
    domain: NiceErrorDomain<DEF>,
    handler: (error: NiceErrorHydrated<DEF, TDomainNiceErrorId<DEF>>) => MaybePromise<H_RES>,
  ): NiceErrorHandler<RES_DEF, RES | H_RES> {
    (this as NiceErrorHandler<RES_DEF, RES | H_RES>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.domain,
        domain: domain.domain,
        identifier: `[matched:domain:${domain.domain}]`,
      },
      _matcher: (error) => domain.isExact(error),
      _requester: (error) =>
        handler(domain.hydrate(error as unknown as NiceError<DEF, TDomainNiceErrorId<DEF>>)),
    });
    return this;
  }

  forId<DEF extends INiceErrorDomainProps, ID extends TDomainNiceErrorId<DEF>, H_RES = void>(
    domain: NiceErrorDomain<DEF>,
    id: ID,
    handler: (error: NiceErrorHydrated<DEF, ID>) => MaybePromise<H_RES>,
  ): NiceErrorHandler<RES_DEF, RES | H_RES> {
    (this as NiceErrorHandler<RES_DEF, RES | H_RES>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.ids,
        domain: domain.domain,
        ids: [id],
        identifier: `[matched:ids:${domain.domain}:${id}]`,
      },
      _matcher: (error) => domain.isExact(error) && error.hasId(id),
      _requester: (error) =>
        handler(
          domain.hydrate(
            error as unknown as NiceError<DEF, TDomainNiceErrorId<DEF>>,
          ) as NiceErrorHydrated<DEF, ID>,
        ),
    });
    return this;
  }

  forIds<DEF extends INiceErrorDomainProps, IDS extends TDomainNiceErrorId<DEF>[], H_RES = void>(
    domain: NiceErrorDomain<DEF>,
    ids: IDS,
    handler: (error: NiceErrorHydrated<DEF, IDS[number]>) => MaybePromise<H_RES>,
  ): NiceErrorHandler<RES_DEF, RES | H_RES> {
    (this as NiceErrorHandler<RES_DEF, RES | H_RES>).handlerConfigs.push({
      target: {
        type: EErrorHandlerTargetType.ids,
        domain: domain.domain,
        ids: ids,
        identifier: `[matched:ids:${domain.domain}:${ids.join(",")}]`,
      },
      _matcher: (error) => domain.isExact(error) && ids.some((id) => error.hasId(id)),
      _requester: (error) =>
        handler(
          domain.hydrate(
            error as unknown as NiceError<DEF, TDomainNiceErrorId<DEF>>,
          ) as NiceErrorHydrated<DEF, IDS[number]>,
        ),
    });
    return this;
  }

  /**
   * Register a fallback handler that fires when no other case matches.
   * Only one default handler can be registered — calling this twice replaces the previous one.
   */
  setDefaultHandler<H_RES>(
    handler: (error: NiceError<any, any>) => MaybePromise<H_RES>,
  ): NiceErrorHandler<H_RES, RES> {
    (this as unknown as NiceErrorHandler<H_RES, RES>)._defaultRequester = handler;
    return this as unknown as NiceErrorHandler<H_RES, RES>;
  }
}
