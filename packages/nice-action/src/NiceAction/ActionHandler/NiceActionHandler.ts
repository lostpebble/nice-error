import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type { NiceActionDomain } from "../NiceActionDomain";
import type {
  IActionCase,
  INiceActionDomain,
  INiceActionDomainDef,
  TActionHandlerForDomain,
} from "../NiceActionDomain.types";
import type { NiceActionPrimed } from "../NiceActionPrimed";

export class NiceActionHandler<ACT_DOM extends INiceActionDomainDef> {
  private cases: IActionCase<INiceActionDomainDef>[] = [];

  constructor(protected readonly domain: NiceActionDomain<ACT_DOM>) {}

  async handleAction(
    action: NiceActionPrimed<INiceActionDomain, NiceActionSchema>,
  ): Promise<unknown> {
    for (const actionCase of this.cases) {
      if (actionCase._domain.isExactActionDomain(action)) {
        return await actionCase._handler(action);
      }
    }

    throw new Error(
      `No handler found for action "${action.coreAction.id}" in domain "${this.domain.domain}"`,
    );
  }

  forDomain<FOR_DOM extends INiceActionDomainDef>(
    domain: NiceActionDomain<FOR_DOM>,
    handler: TActionHandlerForDomain<FOR_DOM>,
  ): this {
    this.cases.push({
      _domain: domain,
      _ids: undefined,
      _handler: handler as TActionHandlerForDomain<INiceActionDomainDef>,
    });
    return this;
  }
}
