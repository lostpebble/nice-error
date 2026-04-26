import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import type { INiceAction } from "../NiceAction.types";

type TActionMatchHandler<A extends INiceAction<any>> = (action: A) => Promise<void>;
type TDomainMatchHandler<D extends INiceActionDomain> = <A extends INiceAction<D>>(
  action: A,
) => Promise<void>;

class MatchAction {
  constructor(readonly action: INiceAction<any>) {}

  // overload
  with<D extends INiceActionDomain, ID extends keyof D["actions"] & string>({
    domain,
    id,
    handler,
  }: {
    domain: D;
    id: ID;
    handler: TActionMatchHandler<INiceAction<D, ID>>;
  });
  with<D extends INiceActionDomain>({
    domain,
    handler,
  }: {
    domain: D;
    handler: TDomainMatchHandler<D>;
  }) {}
}

export const matchAction = (action: INiceAction<any>) => new MatchAction(action);
