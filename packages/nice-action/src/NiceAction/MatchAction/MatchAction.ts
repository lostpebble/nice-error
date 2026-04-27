import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { INiceAction } from "../NiceAction.types";

type TMatchHandler<A extends INiceAction<any>> = (action: A) => Promise<void>;

type TMatchEntry =
  | { domainStr: string; id: string; handler: TMatchHandler<INiceAction<any>> }
  | { domainStr: string; id?: undefined; handler: TMatchHandler<INiceAction<any>> };

class MatchAction {
  private _entries: TMatchEntry[] = [];
  private _otherwise?: TMatchHandler<INiceAction<any>>;

  constructor(readonly action: INiceAction<any>) {}

  with<D extends INiceActionDomain, ID extends keyof D["actions"] & string>(opts: {
    domain: D;
    id: ID;
    handler: TMatchHandler<INiceAction<D, ID>>;
  }): this;
  with<D extends INiceActionDomain>(opts: {
    domain: D;
    handler: TMatchHandler<INiceAction<D>>;
  }): this;
  with(opts: { domain: INiceActionDomain; id?: string; handler: TMatchHandler<any> }): this {
    this._entries.push({ domainStr: opts.domain.domain, id: opts.id, handler: opts.handler });
    return this;
  }

  otherwise(handler: TMatchHandler<INiceAction<any>>): this {
    this._otherwise = handler;
    return this;
  }

  async run(): Promise<boolean> {
    const { action } = this;

    for (const entry of this._entries) {
      const domainMatches = action.domain === entry.domainStr;
      const idMatches = entry.id == null || action.id === entry.id;

      if (domainMatches && idMatches) {
        await entry.handler(action);
        return true;
      }
    }

    if (this._otherwise != null) {
      await this._otherwise(action);
    }

    return false;
  }
}

export const matchAction = (action: INiceAction<any>) => new MatchAction(action);
