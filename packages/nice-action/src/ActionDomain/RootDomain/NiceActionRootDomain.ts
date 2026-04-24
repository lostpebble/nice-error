import type { IActionHandlerInputs } from "../../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import type { IRuntimeEnvironmentMeta } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment.types";
import { getAssumedRuntimeInfo } from "../../ActionRuntimeEnvironment/utils/getAssumedRuntimeEnvironment";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import { isActionResponseJsonObject } from "../../utils/isActionResponseJsonObject";
import { NiceActionDomain } from "../NiceActionDomain";
import type {
  INiceActionDomainChildOptions,
  INiceActionRootDomain,
  TNiceActionDomainChildDef,
} from "../NiceActionDomain.types";
import { NiceActionDomainBase } from "../NiceActionDomainBase";

export class NiceActionRootDomain<
  ROOT_DOM extends INiceActionRootDomain = INiceActionRootDomain,
> extends NiceActionDomainBase<ROOT_DOM> {
  private _runtimeEnvironment?: ActionRuntimeEnvironment;

  constructor(
    readonly domainDefinition: {
      domain: ROOT_DOM["domain"];
    },
  ) {
    const domainId = domainDefinition.domain;

    super({
      domain: domainId,
      allDomains: [domainId],
      actions: {},
    } as ROOT_DOM);
  }

  getEnvironmentMeta(): IRuntimeEnvironmentMeta {
    return {
      envId: this._runtimeEnvironment?.envId,
      runtimeInfo: this._runtimeEnvironment?.runtimeInfo ?? getAssumedRuntimeInfo(),
    };
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ROOT_DOM, SUB_DOM>> {
    if (this.allDomains.includes(subDomainDef.domain)) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_already_exists_in_hierarchy, {
        domain: subDomainDef.domain,
        allParentDomains: this.allDomains,
        parentDomain: this.domain,
      });
    }

    return new NiceActionDomain<TNiceActionDomainChildDef<ROOT_DOM, SUB_DOM>>(
      {
        allDomains: [subDomainDef.domain, ...this.allDomains],
        domain: subDomainDef.domain,
        actions: subDomainDef.actions,
      },
      { rootDomain: this as any },
    );
  }

  setRuntimeEnvironment(runtime: ActionRuntimeEnvironment): this {
    if (this._runtimeEnvironment != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
        domain: this.domain,
        matchTag: this._runtimeEnvironment.envId,
      });
    }

    this._runtimeEnvironment = runtime;
    return this;
  }

  async _executeAction<P extends NiceActionPrimed<any, any, any>>(
    primed: P,
    {
      actionMeta,
      listeners,
    }: IActionHandlerInputs<P extends NiceActionPrimed<infer DOM, any, any> ? DOM : never>,
  ): Promise<unknown> {
    if (this._runtimeEnvironment != null) {
      const handler = this._runtimeEnvironment.getHandlerForAction(primed, actionMeta?.tag);

      if (handler != null) {
        const validatedPrimed = primed.validateInput();
        const allListeners = [...(listeners ?? []), ...this._listeners];

        for (const listener of allListeners) {
          listener.execution?.(validatedPrimed, {
            tag: actionMeta?.tag,
            meta: actionMeta?.meta,
            runtime: this.getEnvironmentMeta(),
          });
        }

        const response = await handler.dispatchAction(validatedPrimed);

        for (const listener of allListeners) {
          listener.response?.(response as any, {
            tag: actionMeta?.tag,
            meta: actionMeta?.meta,
            runtime: this.getEnvironmentMeta(),
          });
        }

        if (response.result.ok) return response.result.output;
        throw response.result.error;
      }

      const defaultHandler = this._runtimeEnvironment.getDefaultHandler();

      if (defaultHandler != null && defaultHandler.execution != null) {
        const validatedPrimed = primed.validateInput();
        const allListeners = [...(listeners ?? []), ...this._listeners];

        for (const listener of allListeners) {
          listener.execution?.(validatedPrimed, {
            tag: actionMeta?.tag,
            meta: actionMeta?.meta,
            runtime: this.getEnvironmentMeta(),
          });
        }

        const rawResult = await defaultHandler.execution(validatedPrimed, {
          tag: actionMeta?.tag,
          meta: actionMeta?.meta,
          runtime: this.getEnvironmentMeta(),
        });

        let response: NiceActionResponse<any, any>;
        if (rawResult instanceof NiceActionResponse) {
          response = rawResult;
        } else if (rawResult != null && isActionResponseJsonObject(rawResult)) {
          const domain = primed.coreAction.actionDomain;
          response = domain.hydrateResponse(rawResult);
        } else {
          response = primed.setResponse(rawResult as any);
        }

        for (const listener of allListeners) {
          listener.response?.(response as any, {
            tag: actionMeta?.tag,
            meta: actionMeta?.meta,
            runtime: this.getEnvironmentMeta(),
          });
        }

        if (response.result.ok) return response.result.output;
        throw response.result.error;
      }
    }

    if (actionMeta.tag != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_tag_handler_not_found, {
        domain: this.domain,
        matchTag: actionMeta.tag,
      });
    }

    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
  }
}
