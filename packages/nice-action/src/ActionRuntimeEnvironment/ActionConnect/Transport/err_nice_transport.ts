import { err } from "@nice-code/error";
import { err_nice_connect } from "../err_nice_connect";

export enum EErrId_NiceTransport {
  transport_timeout = "transport_timeout",
  transport_not_found = "transport_not_found",
  transport_send_failed = "transport_send_failed",
  transport_invalid_action_response = "transport_invalid_action_response",
  transport_ws_disconnected = "transport_ws_disconnected",
  transport_ws_send_failed = "transport_ws_send_failed",
  transport_ws_create_failed = "transport_ws_create_failed",
}

export const err_nice_transport = err_nice_connect.createChildDomain({
  domain: "err_nice_transport",
  schema: {
    [EErrId_NiceTransport.transport_timeout]: err<{ timeout: number }>({
      message: ({ timeout }) => `ActionConnect transport timed out after ${timeout}ms.`,
    }),
    [EErrId_NiceTransport.transport_not_found]: err<{
      actionId: string;
      routeKey?: string;
      tag?: string;
    }>({
      message: ({ actionId, routeKey, tag }) =>
        `No connected transport found for action "${actionId}"${routeKey ? ` with route key "${routeKey}"` : ``}${tag ? ` and action tag "${tag}"` : ""}.`,
    }),
    [EErrId_NiceTransport.transport_send_failed]: err<{
      actionId: string;
      httpStatusCode?: number;
      message?: string;
    }>({
      message: ({ actionId, httpStatusCode, message }) =>
        `Failed to send action "${actionId}" [${httpStatusCode ?? "Unknown status"}]: ${message ?? "Unknown error"}.`,
      httpStatusCode: ({ httpStatusCode }) => httpStatusCode ?? 500,
    }),
    [EErrId_NiceTransport.transport_invalid_action_response]: err<{
      actionId: string;
    }>({
      message: ({ actionId }) => `Invalid action response JSON structure for action "${actionId}"`,
    }),
    [EErrId_NiceTransport.transport_ws_disconnected]: err<Record<string, never>>({
      message: () => `WebSocket transport disconnected.`,
    }),
    [EErrId_NiceTransport.transport_ws_send_failed]: err({
      message: () => `Failed to send message over WebSocket transport.`,
    }),
    [EErrId_NiceTransport.transport_ws_create_failed]: err<{
      originalError?: Error;
    }>({
      message: ({ originalError }) =>
        `Failed to create WebSocket transport.${originalError ? ` Original error: ${originalError.message}` : ""}`,
    }),
  },
});
