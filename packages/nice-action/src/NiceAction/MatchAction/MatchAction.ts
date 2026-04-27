import type { INiceActionDomain, MaybePromise } from "../../ActionDomain/NiceActionDomain.types";
import type { INiceAction } from "../NiceAction.types";
import type { TNarrowActionType } from "../NiceActionCombined.types";

type TMatchHandler<A extends INiceAction<any>> = (action: A) => MaybePromise<void>;

type TMatchEntry<ACT extends INiceAction<any>> =
  | { domainStr: string; id: string; handler: TMatchHandler<any> }
  | { domainStr: string; id?: undefined; handler: TMatchHandler<ACT> };

type THandlerForId<ACT extends INiceAction<any>> = (action: ACT) => MaybePromise<void>;

class MatchAction<ACT extends INiceAction<any>> {
  private _entries: TMatchEntry<ACT>[] = [];
  private _otherwise?: TMatchHandler<ACT>;

  constructor(readonly action: ACT) {}

  with<D extends INiceActionDomain, ID extends keyof D["actions"] & string>(opts: {
    domain: D;
    id: ID;
    handler: THandlerForId<TNarrowActionType<ACT, D, ID>>;
  }): this;
  with<D extends INiceActionDomain>(opts: {
    domain: D;
    handler: TMatchHandler<TNarrowActionType<ACT, D, keyof D["actions"] & string>>;
  }): this;
  with(opts: { domain: INiceActionDomain; id?: string; handler: TMatchHandler<any> }): this {
    this._entries.push({ domainStr: opts.domain.domain, id: opts.id, handler: opts.handler });
    return this;
  }

  otherwise(handler: TMatchHandler<ACT>): this {
    this._otherwise = handler;
    return this;
  }

  private _findMatch():
    | {
        matched: true;
        handler: TMatchHandler<ACT>;
      }
    | {
        matched: false;
      } {
    const { action } = this;

    for (const entry of this._entries) {
      const domainMatches = action.domain === entry.domainStr;
      const idMatches = entry.id == null || action.id === entry.id;

      if (domainMatches && idMatches) {
        return { matched: true, handler: entry.handler };
      }
    }

    if (this._otherwise != null) {
      return { matched: true, handler: this._otherwise };
    }

    return { matched: false };
  }

  run(): boolean {
    const result = this._findMatch();

    if (result.matched) {
      result.handler(this.action);
    }

    return result.matched;
  }

  async runAsync(): Promise<boolean> {
    const result = this._findMatch();

    if (result.matched) {
      await result.handler(this.action);
      return true;
    }

    return false;
  }
}

export const matchAction = <ACT extends INiceAction<any>>(action: ACT) => new MatchAction(action);
