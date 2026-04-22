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
  resolver_domain_not_registered = "resolver_domain_not_registered",
  resolver_action_not_registered = "resolver_action_not_registered",
  action_environment_not_found = "action_environment_not_found",
  environment_already_registered = "environment_already_registered",
  action_input_validation_failed = "action_input_validation_failed",
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
    [EErrId_NiceAction.resolver_domain_not_registered]: err<{ domain: string }>({
      message: ({ domain }) =>
        `No resolver registered for domain "${domain}". Add a NiceActionDomainResolver for this domain to the environment.`,
    }),
    [EErrId_NiceAction.resolver_action_not_registered]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `No resolver registered for action "${actionId}" in domain "${domain}". Call .resolve("${actionId}", fn) on the domain resolver.`,
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
  },
});
