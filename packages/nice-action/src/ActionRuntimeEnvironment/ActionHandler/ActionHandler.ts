import { nanoid } from "nanoid";
import type { NiceActionDomain } from "../../ActionDomain/NiceActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import { EErrId_NiceAction, err_nice_action } from "../../errors/err_nice_action";
import { EActionState } from "../../NiceAction/NiceAction.enums";
import type {
  INiceAction,
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../../NiceAction/NiceActionResponse";
import { isActionResponseJsonObject } from "../../utils/isActionResponseJsonObject";
import {
  EActionHandlerType,
  type IActionHandler,
  type IActionHandlerInputs,
  type TExecutionAndResponseHandlers,
  type THandleActionResult,
  type TMatchHandlerKey,
  type TStoredHandlers,
} from "./ActionHandler.types";

export class ActionHandler implements IActionHandler {
  readonly tag: string | "_";
  readonly handlerType: EActionHandlerType = EActionHandlerType.custom;
  readonly cuid: string;

  readonly _domains = new Map<string, NiceActionDomain<any>>();

  private _handlersByKey = new Map<TMatchHandlerKey, TStoredHandlers>();

  constructor(config: IActionHandlerInputs["actionMeta"] = {}) {
    this.tag = config.tag ?? "_";
    this.cuid = nanoid();
  }

  get allHandlerKeys(): TMatchHandlerKey[] {
    return [...this._handlersByKey.keys()];
  }

  private getHandlersForAction(
    action: INiceAction<any, any>,
    matchTag: string = "_",
  ): TStoredHandlers | undefined {
    if (matchTag !== this.tag) {
      return undefined;
    }

    const keys: TMatchHandlerKey[] = [
      `${matchTag}::${action.domain}::${action.id}`,
      `${matchTag}::${action.domain}::_`,
    ];

    for (const key of keys) {
      const handler = this._handlersByKey.get(key);
      if (handler != null) {
        return handler;
      }
    }
  }

  /**
   * Register a handler for all actions in a domain.
   * Receives the full primed action — use `domain.matchAction()` to narrow by id.
   * Useful for forwarding all domain actions to a remote endpoint.
   * Lower priority than `forAction`.
   */
  forDomain<FOR_DOM extends INiceActionDomain>(
    domain: NiceActionDomain<FOR_DOM>,
    handlers: TExecutionAndResponseHandlers<
      INiceAction<FOR_DOM, keyof FOR_DOM["actions"] & string>
    >,
  ): this {
    this._domains.set(domain.domain, domain);
    const matchKey: TMatchHandlerKey = `${this.tag}::${domain.domain}::_`;
    this._handlersByKey.set(matchKey, handlers);
    return this;
  }

  /**
   * Register a typed handler for a specific action ID.
   * The handler receives the full primed action with narrowed input type.
   * Takes priority over `forDomain` for the same domain.
   */
  forAction<ACT_DOM extends INiceActionDomain, ID extends keyof ACT_DOM["actions"] & string>(
    domain: NiceActionDomain<ACT_DOM>,
    id: ID,
    handlers: TExecutionAndResponseHandlers<INiceAction<ACT_DOM, ID>>,
  ): this {
    this._domains.set(domain.domain, domain);
    const matchKey: TMatchHandlerKey = `${this.tag}::${domain.domain}::${id}`;
    this._handlersByKey.set(matchKey, handlers);
    return this;
  }

  /**
   * Register a handler for multiple action IDs (first-match-wins among cases).
   * Receives the full primed action narrowed to the union of those IDs.
   * Use `act.coreAction.id` to branch on which action was dispatched.
   */
  forActionIds<
    ACT_DOM extends INiceActionDomain,
    IDS extends ReadonlyArray<keyof ACT_DOM["actions"] & string>,
  >(
    domain: NiceActionDomain<ACT_DOM>,
    ids: IDS,
    handlers: TExecutionAndResponseHandlers<INiceAction<ACT_DOM, IDS[number]>>,
  ): this {
    this._domains.set(domain.domain, domain);
    for (const id of ids) {
      this.forAction(domain, id, handlers);
    }
    return this;
  }

  /**
   * Register per-action handlers for a domain using a single map, without needing
   * separate `forAction` calls. Unregistered action IDs are unaffected.
   *
   * @example
   * ```ts
   * handler.forDomainActionCases(userDomain, {
   *   getUser:    { execution: (primed) => db.getUser(primed.input.userId) },
   *   deleteUser: { execution: (primed) => db.deleteUser(primed.input.userId) },
   * });
   * ```
   */
  forDomainActionCases<FOR_DOM extends INiceActionDomain>(
    domain: NiceActionDomain<FOR_DOM>,
    cases: {
      [ID in keyof FOR_DOM["actions"] & string]?: TExecutionAndResponseHandlers<
        INiceAction<FOR_DOM, ID>
      >;
    },
  ): this {
    this._domains.set(domain.domain, domain);
    for (const id of Object.keys(cases) as Array<keyof FOR_DOM["actions"] & string>) {
      const handlers = cases[id];
      if (handlers != null) {
        const matchKey: TMatchHandlerKey = `${this.tag}::${domain.domain}::${id}`;
        this._handlersByKey.set(matchKey, handlers);
      }
    }
    return this;
  }

  private async _tryHandleResponse(
    response: NiceActionResponse<any, any>,
  ): Promise<THandleActionResult> {
    const handlers = this.getHandlersForAction(response.primed.coreAction, this.tag);
    if (handlers?.response) {
      const result = await handlers.response(response, {
        tag: this.tag,
        runtime: response.getEnvironmentMeta(),
      });
      if (result === undefined) {
        return { handled: true, response };
      }
      if (result instanceof NiceActionResponse) {
        return { handled: true, response: result };
      }
      const domain = this._domains.get(response.domain);
      if (domain == null) {
        throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, {
          domain: response.domain,
        });
      }
      return { handled: true, response: domain.hydrateResponse(result) };
    }
    return { handled: false };
  }

  protected async _tryExecute(
    primed: NiceActionPrimed<any, any, any>,
  ): Promise<THandleActionResult> {
    const handlers = this.getHandlersForAction(primed.coreAction, this.tag);
    if (handlers?.execution == null) {
      return { handled: false };
    }

    const rawResult = await handlers.execution(primed, {
      tag: this.tag,
      runtime: primed.getEnvironmentMeta(),
    });

    let response: NiceActionResponse<any, any>;
    if (rawResult instanceof NiceActionResponse) {
      response = rawResult;
    } else if (rawResult != null && isActionResponseJsonObject(rawResult)) {
      const domain = this._domains.get(primed.domain);
      if (domain == null) {
        throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, {
          domain: primed.domain,
        });
      }
      response = domain.hydrateResponse(rawResult);
    } else {
      response = primed.setResponse(rawResult);
    }

    return { handled: true, response };
  }

  /**
   * Dispatch a primed action. Throws if no execution handler matches.
   */
  async dispatchAction(primed: NiceActionPrimed<any, any>): Promise<NiceActionResponse<any, any>> {
    const result = await this._tryExecute(primed);
    if (result.handled) return result.response;
    throw err_nice_action.fromId(EErrId_NiceAction.no_action_execution_handler, {
      domain: primed.domain,
      actionId: primed.id,
    });
  }

  /**
   * Dispatch a wire-format action (primed or resolved).
   *
   * Returns `{ handled: true, response }` when a handler matched, or
   * `{ handled: false }` when no handler is registered for the action.
   *
   * Throws for structural errors only:
   * - `domain_no_handler` — domain not known to this handler
   * - `hydration_*` — the wire payload is malformed
   * - `handle_wire_not_primed_or_response` — unknown wire type
   *
   * Execution errors thrown by handlers propagate as-is.
   *
   * @example
   * ```ts
   * app.post("/actions", async (req, res) => {
   *   const result = await handler.handleWire(req.body);
   *   if (result.handled) res.json(result.response.toJsonObject());
   *   else res.status(404).end();
   * });
   * ```
   */
  async handleWire(wire: unknown): Promise<THandleActionResult> {
    if (
      typeof wire !== "object" ||
      wire == null ||
      typeof (wire as Record<string, unknown>)["domain"] !== "string"
    ) {
      throw err_nice_action.fromId(EErrId_NiceAction.wire_not_action_data);
    }

    const typedWire = wire as INiceActionPrimed_JsonObject | TNiceActionResponse_JsonObject;
    const domain = this._domains.get(typedWire.domain);

    if (domain == null) {
      throw err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, {
        domain: typedWire.domain,
      });
    }

    if (typedWire.type === EActionState.primed) {
      const primed = domain.hydratePrimed(typedWire);
      return await this._tryExecute(primed);
    }

    if (typedWire.type === EActionState.resolved) {
      const response = domain.hydrateResponse(typedWire);
      return await this._tryHandleResponse(response);
    }

    const unknownWire = typedWire as any;
    throw err_nice_action.fromId(EErrId_NiceAction.wire_action_not_primed_or_response, {
      domain: unknownWire.domain,
      actionId: unknownWire.id,
      actionState: unknownWire.type,
    });
  }
}

export const createHandler = (config: IActionHandlerInputs["actionMeta"] = {}) => {
  return new ActionHandler(config);
};
