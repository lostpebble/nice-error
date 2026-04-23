import type { TExecutionAndResponseListeners } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler.types";
import type { INiceActionDomain } from "./NiceActionDomain.types";

export abstract class NiceActionDomainBase<ACT_DOM extends INiceActionDomain = INiceActionDomain>
  implements INiceActionDomain<ACT_DOM["allDomains"], ACT_DOM["actions"]>
{
  readonly domain: ACT_DOM["domain"];
  readonly allDomains: ACT_DOM["allDomains"];
  readonly actions: ACT_DOM["actions"];

  protected _listeners: TExecutionAndResponseListeners<ACT_DOM>[] = [];

  constructor(definition: ACT_DOM) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.actions = definition.actions;
  }

  /**
   * Add an observer that is called after every action dispatched through this domain.
   * Returns an unsubscribe function — call it to remove the listener.
   */
  addActionListener(listener: TExecutionAndResponseListeners<ACT_DOM>): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }
}
