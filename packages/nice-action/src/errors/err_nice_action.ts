import { err, err_nice } from "@nice-error/core";

export enum EErrId_NiceAction {
  action_id_not_in_domain = "action_id_not_in_domain",
  domain_action_handler_conflict = "domain_action_handler_conflict",
  domain_no_handler = "domain_no_handler",
  hydration_domain_mismatch = "hydration_domain_mismatch",
  hydration_action_id_not_found = "hydration_action_id_not_found",
}

export const err_nice_action = err_nice.createChildDomain({
  domain: "err_nice_action",
  defaultHttpStatusCode: 500,
  schema: {
    [EErrId_NiceAction.action_id_not_in_domain]: err<{ domain: string; actionId: string }>({
      message: ({ actionId, domain }) =>
        `Action with id "${actionId}" does not exist in domain "${domain}".`,
    }),
    [EErrId_NiceAction.domain_action_handler_conflict]: err<{ domain: string }>({
      message: ({ domain }) =>
        `Domain "${domain}" already has a handler set. Multiple handlers for the same domain are not allowed.`,
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
    [EErrId_NiceAction.hydration_action_id_not_found]: err<{
      domain: string;
      actionId: string;
    }>({
      message: ({ domain, actionId }) =>
        `Cannot hydrate action: id "${actionId}" does not exist in domain "${domain}".`,
    }),
  },
});
