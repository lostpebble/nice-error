import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import { NiceActionHandler } from "./ActionHandler/NiceActionHandler";
import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";
import { NiceAction } from "./NiceAction";
import type {
  INiceActionDomain,
  INiceActionDomainChildOptions,
  INiceActionDomainDef,
  ISerializedNiceAction,
  ISerializedNiceActionResponse,
  TActionListener,
  TNiceActionDomainChildDef,
} from "./NiceActionDomain.types";
import { NiceActionPrimed } from "./NiceActionPrimed";
import { hydrateNiceActionResponse, NiceActionResponse } from "./NiceActionResponse";

export class NiceActionDomain<ACT_DOM extends INiceActionDomainDef = INiceActionDomainDef>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["schema"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly schema: ACT_DOM["schema"];
  private _listeners: TActionListener[] = [];
  private _handler?: NiceActionHandler | undefined;

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
    return new NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>({
      allDomains: [subDomainDef.domain, ...this.allDomains],
      domain: subDomainDef.domain,
      schema: subDomainDef.schema,
    });
  }

  action<ID extends keyof ACT_DOM["schema"] & string>(
    id: ID,
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

  isExactActionDomain(
    action: unknown,
  ): action is NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>> {
    return (
      action instanceof NiceActionPrimed &&
      this.allDomains.includes(action.coreAction.domain.domain)
    );
  }

  matchAction<ID extends keyof ACT_DOM["schema"] & string>(
    action: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
    id: ID,
  ): NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]> | null {
    if (this.isExactActionDomain(action) && action.coreAction.id === id) {
      return action as NiceActionPrimed<INiceActionDomain, ACT_DOM["schema"][ID]>;
    }
    return null;
  }

  /**
   * Add an observer that is called after every action dispatched through this domain.
   * Returns an unsubscribe function — call it to remove the listener.
   */
  addActionListener(listener: TActionListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  async _dispatchAction(
    primed: NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>>,
  ): Promise<unknown> {
    if (!this._handler) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain: this.domain });
    }
    const result = await this._handler.handleAction(primed);
    for (const listener of this._listeners) {
      await listener(primed);
    }
    return result;
  }

  /**
   * Reconstruct a NiceActionPrimed from its serialized wire format.
   * Runs the schema's deserializeInput if a custom serialization was defined.
   */
  hydrateAction(
    serialized: ISerializedNiceAction,
  ): NiceActionPrimed<INiceActionDomain, NiceActionSchema<any, any, any>> {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.actionId as keyof ACT_DOM["schema"] & string;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.actionId,
      });
    }

    const coreAction = this.action(id);
    const rawInput = coreAction.schema.deserializeInput(serialized.input);
    return new NiceActionPrimed(coreAction, rawInput);
  }

  /**
   * Reconstruct a NiceActionResponse from its serialized wire format.
   * The result is loosely typed — `result.error` is `NiceError<TUnknownNiceErrorDef>`.
   * Use `handleWith` / `forDomain` / `isExact` to route errors on the receiving end.
   */
  hydrateResponse(
    serialized: ISerializedNiceActionResponse,
  ): NiceActionResponse<INiceActionDomain, NiceActionSchema<any, any, any>> {
    if (serialized.domain !== this.domain) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_domain_mismatch, {
        expected: this.domain,
        received: serialized.domain,
      });
    }

    const id = serialized.actionId as keyof ACT_DOM["schema"] & string;
    if (!this.schema[id]) {
      throw err_nice_action.fromId(EErrId_NiceAction.hydration_action_id_not_found, {
        domain: this.domain,
        actionId: serialized.actionId,
      });
    }

    const coreAction = this.action(id);
    return hydrateNiceActionResponse(serialized, coreAction);
  }

  setActionHandler(handler?: NiceActionHandler): NiceActionHandler {
    if (this._handler) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_action_handler_conflict, {
        domain: this.domain,
      });
    }
    const h = handler ?? new NiceActionHandler();
    this._handler = h;
    return h;
  }
}
