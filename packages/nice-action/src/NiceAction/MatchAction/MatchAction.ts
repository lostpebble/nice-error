import type { INiceActionDomain, TInferOutputFromSchema } from "../../ActionDomain/NiceActionDomain.types";
import type { TInferActionError } from "../../ActionSchema/NiceActionSchema";
import type { INiceAction, TNiceActionResult } from "../NiceAction.types";

type TMatchHandler<A extends INiceAction<any>> = (action: A) => Promise<void>;

type TMatchEntry<ACT extends INiceAction<any>> =
  | { domainStr: string; id: string; handler: TMatchHandler<any> }
  | { domainStr: string; id?: undefined; handler: TMatchHandler<ACT> };

type THandlerForId<
  ACT extends INiceAction<any>,
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
> = (
  action: Omit<ACT, "id" | "result"> & {
    id: ID;
    result: TNiceActionResult<
      TInferOutputFromSchema<DOM["actions"][ID]>["Output"],
      TInferActionError<DOM["actions"][ID]>
    >;
  },
) => Promise<void>;

class MatchAction<
  ACT extends INiceAction<any>,
  DOM extends INiceActionDomain = ACT extends INiceAction<infer DOM> ? DOM : never,
> {
  private _entries: TMatchEntry<ACT>[] = [];
  private _otherwise?: TMatchHandler<ACT>;

  constructor(readonly action: ACT) {}

  with<D extends DOM, ID extends keyof D["actions"] & string>(opts: {
    domain: D;
    id: ID;
    handler: THandlerForId<ACT, D, ID>;
  }): this;
  with<D extends DOM>(opts: { domain: D; handler: TMatchHandler<ACT> }): this;
  with(opts: { domain: DOM; id?: string; handler: TMatchHandler<any> }): this {
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

export const matchAction = <ACT extends INiceAction<any>>(action: ACT) => new MatchAction(action);
