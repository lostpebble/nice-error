import type { NiceActionResponse } from "../..";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type {
  IActionCase,
  INiceActionDomain,
  TActionHandlerForDomain,
  TActionIdHandlerForDomain,
  TBroadActionRequester,
} from "../../ActionDomain/NiceActionDomain.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";

export class NiceActionRequester {
  private cases: IActionCase[] = [];
  private _defaultRequester?: TBroadActionRequester;

  async handleAction<A extends NiceActionPrimed<any, any, any>>(
    action: A,
  ): Promise<
    A extends NiceActionPrimed<infer ACT_DOM, infer ID, infer SCH>
      ? NiceActionResponse<ACT_DOM, ID, SCH>
      : never
  > {
    for (const actionCase of this.cases) {
      if (!actionCase._matcher(action)) continue;
      return await actionCase._requester(action);
    }

    if (this._defaultRequester) {
      return await this._defaultRequester(action);
    }

    throw new Error(
      `No handler found for action "${action.coreAction.id}" in domain "${action.coreAction.domain}"`,
    );
  }

  /**
   * Register a handler that fires for **any** action whose domain matches `domain`.
   * `act.input` is typed as the union of input types for all actions in `domain`.
   * First matching case wins.
   */
  forDomain<FOR_DOM extends INiceActionDomain>(
    domain: NiceActionDomain<FOR_DOM>,
    handler: TActionHandlerForDomain<FOR_DOM>,
  ): this {
    this.cases.push({
      _matcher: (action) => domain.isExactActionDomain(action),
      _requester: handler as unknown as TBroadActionRequester,
    });
    return this;
  }

  /**
   * Register a handler that fires only for the specific action `id`.
   * The handler's `action.input` is narrowed to the schema for that ID.
   * First matching case wins.
   */
  forActionId<ACT_DOM extends INiceActionDomain, ID extends keyof ACT_DOM["schema"] & string>(
    domain: NiceActionDomain<ACT_DOM>,
    id: ID,
    handler: TActionIdHandlerForDomain<ACT_DOM, ID>,
  ): this {
    this.cases.push({
      _matcher: (action) => domain.isExactActionDomain(action) && action.coreAction.id === id,
      _requester: handler as unknown as TBroadActionRequester,
    });
    return this;
  }

  /**
   * Register a handler that fires for any action whose id is in `ids`.
   * The handler's `action.input` is narrowed to the union of those IDs' schemas.
   * First matching case wins.
   */
  forActionIds<
    ACT_DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof ACT_DOM["schema"] & string>,
  >(
    domain: NiceActionDomain<ACT_DOM>,
    ids: IDS,
    handler: TActionIdHandlerForDomain<ACT_DOM, IDS[number]>,
  ): this {
    this.cases.push({
      _matcher: (action) =>
        domain.isExactActionDomain(action) &&
        (ids as readonly string[]).includes(action.coreAction.id),
      _requester: handler as unknown as TBroadActionRequester,
    });
    return this;
  }

  /**
   * Register a fallback handler that fires when no other case matches.
   * Only one default handler can be registered — calling this twice replaces the previous one.
   */
  setDefaultHandler(handler: TBroadActionRequester): this {
    this._defaultRequester = handler;
    return this;
  }
}
