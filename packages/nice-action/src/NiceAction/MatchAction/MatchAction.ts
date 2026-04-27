import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { INiceAction } from "../NiceAction.types";
import type { TNarrowActionType } from "../NiceActionCombined.types";

type TMatchHandler<A extends INiceAction<any>> = (action: A) => Promise<void>;

type TMatchEntry<ACT extends INiceAction<any>> =
  | { domainStr: string; id: string; handler: TMatchHandler<any> }
  | { domainStr: string; id?: undefined; handler: TMatchHandler<ACT> };

type THandlerForId<ACT extends INiceAction<any>> = (action: ACT) => Promise<void>;

// type TOnSuccessForAction<ACT extends INiceAction<any>> =
//   ACT extends NiceActionResponse<any>
//     ? (output: TInferOutputFromSchema<ACT["schema"]>) => Promise<void>
//     : never;

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

  async run(): Promise<boolean> {
    const { action } = this;

    for (const entry of this._entries) {
      const domainMatches = action.domain === entry.domainStr;
      const idMatches = entry.id == null || action.id === entry.id;

      if (domainMatches && idMatches) {
        if (entry.handler != null) {
          await entry.handler(action);
        }
        return true;
      }
    }

    if (this._otherwise != null) {
      await this._otherwise(action);
      return true;
    }

    return false;
  }
}

export const matchAction = <ACT extends INiceAction<any>>(action: ACT) => new MatchAction(action);
