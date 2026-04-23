import { err, err_nice } from "@nice-code/error";
import type { EActionState } from "../NiceAction/NiceAction.enums";

export enum EErrId_NiceAction {
  action_id_not_in_domain = "action_id_not_in_domain",
  domain_already_exists_in_hierarchy = "domain_already_exists_in_hierarchy",
  domain_handler_conflict = "domain_handler_conflict",
  domain_no_handler = "domain_no_handler",
  hydration_domain_mismatch = "hydration_domain_mismatch",
  hydration_action_state_mismatch = "hydration_action_state_mismatch",
  hydration_action_id_not_found = "hydration_action_id_not_found",
  no_action_execution_handler = "no_action_execution_handler",
  no_action_response_handler = "no_action_response_handler",
  wire_action_not_primed_or_response = "wire_action_not_primed_or_response",
  wire_not_action_data = "wire_not_action_data",
  action_environment_not_found = "action_environment_not_found",
  environment_already_registered = "environment_already_registered",
  action_input_validation_failed = "action_input_validation_failed",
  action_input_validation_promise = "action_input_validation_promise",
  action_output_validation_failed = "action_output_validation_failed",
  action_output_validation_promise = "action_output_validation_promise",
}

export const err_nice_action = err_nice.createChildDomain({
  domain: "err_nice_action",
  defaultHttpStatusCode: 500,
  schema: {
    [EErrId_NiceAction.action_id_not_in_domain]: err<{ domain: string; actionId: string }>({
      message: ({ actionId, domain }) =>
        `Action with id "${actionId}" does not exist in domain "${domain}".`,
    }),
    [EErrId_NiceAction.domain_handler_conflict]: err<{ domain: string }>({
      message: ({ domain }) =>
        `Domain "${domain}" already has a handler set. Multiple handlers for the same domain are not allowed.`,
    }),
    [EErrId_NiceAction.domain_already_exists_in_hierarchy]: err<{
      domain: string;
      allParentDomains: string[];
      parentDomain: string;
    }>({
      message: ({ domain, allParentDomains, parentDomain }) =>
        `Domain "${domain}" already exists in the hierarchy under the parent "${parentDomain}". All parent domains ["${allParentDomains.join(", ")}"]`,
    }),
    [EErrId_NiceAction.domain_no_handler]: err<{ domain: string }>({
      message: ({ domain }) =>
        `Domain "${domain}" has no action handler registered. Call setActionHandler() before executing actions.`,
    }),
    [EErrId_NiceAction.hydration_domain_mismatch]: err<{
      expected: string;
      received: string;
    }>({
      message: ({ expected, received }) =>
        `Cannot hydrate action: domain mismatch. Expected "${expected}", got "${received}".`,
    }),
    [EErrId_NiceAction.hydration_action_state_mismatch]: err<{
      expected: EActionState;
      received: EActionState;
    }>({
      message: ({ expected, received }) =>
        `Cannot hydrate action: action state type mismatch. Expected "${expected}", got "${received}".`,
    }),
    [EErrId_NiceAction.hydration_action_id_not_found]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `Cannot hydrate action: id "${actionId}" does not exist in domain "${domain}".`,
    }),
    [EErrId_NiceAction.no_action_execution_handler]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `No action handler registered for "${actionId}" in domain "${domain}": no execution handler matched.`,
    }),
    [EErrId_NiceAction.no_action_response_handler]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `No response handler registered for action "${actionId}" in domain "${domain}".`,
    }),
    [EErrId_NiceAction.wire_action_not_primed_or_response]: err<{
      domain: string;
      actionId: string;
      actionState: EActionState | undefined;
    }>({
      message: ({ domain, actionId, actionState }) =>
        `Cannot handle wire for action "${actionId}" in domain "${domain}": expected action type of "primed" or "resolved", got "${actionState}".`,
    }),
    [EErrId_NiceAction.wire_not_action_data]: err({
      message: () =>
        `Cannot handle wire for action: expected an object with a "domain" property of type string and a "type" property of "primed" or "resolved".`,
    }),
    [EErrId_NiceAction.action_environment_not_found]: err<{
      domain: string;
      matchTag: string;
    }>({
      message: ({ domain, matchTag }) =>
        `No handler or resolver registered with environment id "${matchTag}" on domain "${domain}".`,
    }),
    [EErrId_NiceAction.environment_already_registered]: err<{
      domain: string;
      matchTag: string;
    }>({
      message: ({ domain, matchTag }) =>
        `Environment "${matchTag}" is already registered on domain "${domain}". Each environment id may only be registered once.`,
    }),
    [EErrId_NiceAction.action_input_validation_failed]: err<{
      domain: string;
      actionId: string;
      validationMessage: string;
    }>({
      message: ({ domain, actionId, validationMessage }) =>
        `Input validation failed for action "${actionId}" in domain "${domain}":\n${validationMessage}`,
      httpStatusCode: 400,
    }),
    [EErrId_NiceAction.action_input_validation_promise]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `Input validation for action "${actionId}" in domain "${domain}" returned a promise, which is not supported.`,
      httpStatusCode: 400,
    }),
    [EErrId_NiceAction.action_output_validation_failed]: err<{
      domain: string;
      actionId: string;
      validationMessage: string;
    }>({
      message: ({ domain, actionId, validationMessage }) =>
        `Output validation failed for action "${actionId}" in domain "${domain}":\n${validationMessage}`,
      httpStatusCode: 500,
    }),
    [EErrId_NiceAction.action_output_validation_promise]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `Output validation for action "${actionId}" in domain "${domain}" returned a promise, which is not supported.`,
      httpStatusCode: 500,
    }),
  },
});
