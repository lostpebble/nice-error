import type { NiceActionSchema } from "../ActionSchema/NiceActionSchema";
import type { NiceActionDomain } from "../NiceActionDomain";
import type {
  IActionCase,
  INiceActionDomain,
  INiceActionDomainDef,
  TActionHandlerForDomain,
  TActionIdHandlerForDomain,
} from "../NiceActionDomain.types";
import type { NiceActionPrimed } from "../NiceActionPrimed";

export class NiceActionHandler<ACT_DOM extends INiceActionDomainDef> {
  private cases: IActionCase<INiceActionDomainDef>[] = [];

  constructor(protected readonly domain: NiceActionDomain<ACT_DOM>) {}

  async handleAction(
    action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
  ): Promise<unknown> {
    for (const actionCase of this.cases) {
      if (!actionCase._domain.isExactActionDomain(action)) continue;
      if (actionCase._ids !== undefined && !actionCase._ids.includes(action.coreAction.id)) continue;
      return await actionCase._handler(action);
    }

    throw new Error(
      `No handler found for action "${action.coreAction.id}" in domain "${this.domain.domain}"`,
    );
  }

  /**
   * Register a handler that fires for **any** action whose domain matches `domain`.
   * First matching case wins.
   */
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

  /**
   * Register a handler that fires only for the specific action `id`.
   * The handler's `action.input` is narrowed to the schema for that ID.
   * First matching case wins.
   */
  forActionId<ID extends keyof ACT_DOM["schema"] & string>(
    domain: NiceActionDomain<ACT_DOM>,
    id: ID,
    handler: TActionIdHandlerForDomain<ACT_DOM, ID>,
  ): this {
    this.cases.push({
      _domain: domain,
      _ids: [id],
      _handler: handler as TActionHandlerForDomain<INiceActionDomainDef>,
    });
    return this;
  }

  /**
   * Register a handler that fires for any action whose id is in `ids`.
   * The handler's `action.input` is narrowed to the union of those IDs' schemas.
   * First matching case wins.
   */
  forActionIds<IDS extends ReadonlyArray<keyof ACT_DOM["schema"] & string>>(
    domain: NiceActionDomain<ACT_DOM>,
    ids: IDS,
    handler: TActionIdHandlerForDomain<ACT_DOM, IDS[number]>,
  ): this {
    this.cases.push({
      _domain: domain,
      _ids: ids as unknown as string[],
      _handler: handler as TActionHandlerForDomain<INiceActionDomainDef>,
    });
    return this;
  }
}
