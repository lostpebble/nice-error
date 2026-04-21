import type { EActionRequestExpectation, EActionRouteStep } from "./NiceAction.enums";

export interface IActionRouteEntry<E extends EActionRouteStep = EActionRouteStep> {
  runtime: string;
  step: E;
  time: number;
  // Handle Target (an identifier for the requester or resolver involved in this step, if applicable)
  ht?: string;
}

export interface IActionRouteEntry_RequestStart
  extends IActionRouteEntry<EActionRouteStep.start_request> {
  step: EActionRouteStep.start_request;
  expectation: EActionRequestExpectation;
}
