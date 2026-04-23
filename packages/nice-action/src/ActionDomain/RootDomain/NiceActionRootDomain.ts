import type { IActionHandlerInputs } from "../../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import type { IRuntimeEnvironmentMeta } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment.types";
import { getAssumedRuntimeInfo } from "../../ActionRuntimeEnvironment/utils/getAssumedRuntimeEnvironment";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
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
      tag,
      listeners,
    }: IActionHandlerInputs<P extends NiceActionPrimed<infer DOM, any, any> ? DOM : never> = {},
  ): Promise<unknown> {
    if (this._runtimeEnvironment != null) {
      const handler = this._runtimeEnvironment.getHandlerForAction(primed, tag);

      if (handler != null) {
        const validatedPrimed = primed.validateInput();
        const allListeners = [...(listeners ?? []), ...this._listeners];

        for (const listener of allListeners) {
          listener.execution?.(validatedPrimed, { tag, envMeta: this.getEnvironmentMeta() });
        }

        const response = await handler.dispatchAction(validatedPrimed);
        if (response.result.ok) return response.result.output;
        throw response.result.error;
      }
    }

    if (tag != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_tag_handler_not_found, {
        domain: this.domain,
        matchTag: tag,
      });
    }

    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
  }
}
