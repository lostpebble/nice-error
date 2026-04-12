import { err, err_nice } from "@nice-error/core";

export enum EErrId_NiceAction {
  action_id_not_in_domain = "action_id_not_in_domain",
  domain_action_handler_conflict = "domain_action_handler_conflict",
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
  },
});
