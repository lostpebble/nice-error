import type { NiceActionRequester } from "../ActionRequestResponse/ActionRequester/NiceActionRequester";

interface IActionHandlerConfig {
  defaultTarget?: string;
}

export class ActionHandler {
  readonly defaultTarget?: string;

  constructor(config: IActionHandlerConfig = {}) {
    this.defaultTarget = config.defaultTarget;
  }

  addRequester(): NiceActionRequester {
    const requester = new NiceActionRequester();
  }
}
