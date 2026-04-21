export enum EActionState {
  empty = "empty",
  primed = "primed",
  resolved = "resolved",
}

export enum EActionRouteStep {
  start_request = "start_request",
  found_requester = "found_requester",
  request_sent = "request_sent",
  request_received = "request_received",
  found_resolver = "found_resolver",
  resolving = "resolving",
  resolved = "resolved",
  found_responder = "found_responder",
  response_sent = "response_sent",
  response_received = "response_received",
  completed = "completed",
}

export enum EActionRequestExpectation {
  response = "response",
  no_response = "no_response",
}
