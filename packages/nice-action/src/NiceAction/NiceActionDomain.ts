import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import { NiceAction } from "./NiceAction";
import type {
  IActionHandlerWithId,
  INiceActionDomain,
  INiceActionDomainChildOptions,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";
import type { NiceActionPrimed } from "./NiceActionPrimed";

export class NiceActionDomain<ACT_DOM extends INiceActionDomain = INiceActionDomain> {
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly schema: ACT_DOM["schema"];
  private _actionListeners: IActionHandlerWithId<ACT_DOM>[] = [];
  private _handler?: NiceActionHandler<ACT_DOM> | undefined;

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.schema = definition.schema;
  }

  createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
    subDomainDef: SUB_DOM & {
      [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
    },
  ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>> {
    const child = new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      schema: subDomainDef.schema,
    });
    return child;
  }

  action<ID extends keyof ACT_DOM["schema"] & string>(
    id: ID,
    // input: TInferInputFromSchema<ACT_DOM["schema"][ID]>["Input"],
  ): NiceAction<this, ACT_DOM["schema"][ID]> {
    const actionSchema = this.schema[id];
    if (!actionSchema) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_id_not_in_domain, {
        domain: this.domain,
        actionId: id as string,
      });
    }

    return new NiceAction(this, actionSchema, id);
  }

  isExactActionDomain(action: unknown): action is NiceAction<ACT_DOM, ACT_DOM["schema"][string]> {
    return action instanceof NiceAction && this.allDomains.includes(action.domain.domain);
  }

  matchAction<ID extends keyof ACT_DOM["schema"] & string>(
    action: unknown,
    id: ID,
  ): action is NiceActionPrimed<ACT_DOM, ACT_DOM["schema"][ID]> {
    return this.isExactActionDomain(action) && action.id === id;
  }

  addActionListener(listener: IActionHandlerWithId<ACT_DOM>): void {
    this._actionListeners.push(listener);
  }

  setActionHandler(): NiceActionHandler<ACT_DOM> {
    if (this._handler) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_action_handler_conflict, {
        domain: this.domain,
      });
    }

    const handler = new NiceActionHandler(this);
    this._handler = handler;
    return handler;
  }
}
