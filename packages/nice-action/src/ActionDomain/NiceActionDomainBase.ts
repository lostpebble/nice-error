import type { INiceActionDomain, TActionListener } from "./NiceActionDomain.types";

export abstract class NiceActionDomainBase<ACT_DOM extends INiceActionDomain = INiceActionDomain>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["actions"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly actions: ACT_DOM["actions"];

  protected _listeners: TActionListener[] = [];

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.actions = definition.actions;
  }

  // abstract createChildDomain<SUB_DOM extends INiceActionDomainChildOptions>(
  //   subDomainDef: SUB_DOM & {
  //     [K in Exclude<keyof SUB_DOM, keyof INiceActionDomainChildOptions>]: never;
  //   },
  // ): NiceActionDomain<TNiceActionDomainChildDef<ACT_DOM, SUB_DOM>>;

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
}
