import type { NiceActionDomain } from "../NiceActionDomain";
import type {
  IActionCase,
  INiceActionDomain,
  TActionHandlerForDomain,
  TInferOutputFromSchema,
} from "../NiceActionDomain.types";
import type { NiceActionPrimed } from "../NiceActionPrimed";

export class NiceActionHandler<ACT_DOM extends INiceActionDomain> {
  private cases: IActionCase<INiceActionDomain>[] = [];

  constructor(protected readonly domain: NiceActionDomain<ACT_DOM>) {}

  async handleAction<
    ID extends keyof ACT_DOM["schema"] & string,
    ACT extends NiceActionPrimed<ACT_DOM, ACT_DOM["schema"][ID]>,
  >(action: ACT): Promise<TInferOutputFromSchema<ACT_DOM["schema"][ID]>["Output"] | undefined> {
    for (const actionCase of this.cases) {
      if (actionCase._domain.isExactActionDomain(action)) {
        return await actionCase._handler(action);
      }
    }

    throw new Error(
      `No handler found for action "${action.coreAction.id}" in domain "${this.domain.domain}"`,
    );
  }

  forDomain<FOR_DOM extends INiceActionDomain>(
    domain: NiceActionDomain<FOR_DOM>,
    handler: TActionHandlerForDomain<FOR_DOM>,
  ): this {
    this.cases.push({
      _domain: domain,
      _ids: undefined,
      _handler: handler as TActionHandlerForDomain<INiceActionDomain>,
    });
    return this;
  }
}
