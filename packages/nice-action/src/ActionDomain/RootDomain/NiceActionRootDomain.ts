import type { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
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
      this as any,
    );
  }

  setRuntimeEnvironment(runtime: ActionRuntimeEnvironment): this {
    if (this._runtimeEnvironment != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.environment_already_registered, {
        domain: this.domain,
        envId: this._runtimeEnvironment.envId,
      });
    }

    this._runtimeEnvironment = runtime;
    return this;
  }

  async _dispatchAction<P extends NiceActionPrimed<any, any, any>>(
    primed: P,
    matchTag?: string,
  ): Promise<unknown> {
    // const handler = this._runtimeEnvironment.
    // envId-specific handler takes first priority when registered.
    if (matchTag != null) {
      const envHandler = this._runtimeEnvironment?.handlers(matchTag);
      if (envHandler) {
        const validatedPrimed = await this._withValidatedInput(primed);
        const result = await envHandler.dispatchAction(validatedPrimed);
        for (const listener of this._listeners) await listener(validatedPrimed);
        return result;
      }
      // No envId-specific handler found — fall through to this domain's default handler
      // so that a domain's own default handler always serves as the fallback.
    }

    const defaultHandler = this._handlers.get(undefined);
    if (defaultHandler) {
      const validatedPrimed = await this._withValidatedInput(primed);
      const result = await defaultHandler.dispatchAction(validatedPrimed);
      for (const listener of this._listeners) await listener(validatedPrimed);
      return result;
    }

    if (matchTag != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_environment_not_found, {
        domain: this.domain,
        envId: matchTag,
      });
    }
    throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
  }
}
