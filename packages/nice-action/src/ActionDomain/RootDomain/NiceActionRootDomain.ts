import type { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import type { INiceActionRootDomain } from "../NiceActionDomain.types";
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
}
