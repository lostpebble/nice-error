import { defineNiceError, err } from "@nice-error/core";
import { action, createActionDomain } from "@nice-error/nice-action";
import * as v from "valibot";

// ---------------------------------------------------------------------------
// Error domain
// ---------------------------------------------------------------------------

export enum EErrId_DemoAction {
  user_not_found = "user_not_found",
  division_by_zero = "division_by_zero",
}

export const err_demo_action = defineNiceError({
  domain: "err_demo_action",
  schema: {
    [EErrId_DemoAction.user_not_found]: err<{ userId: string }>({
      message: ({ userId }) => `User not found: "${userId}"`,
      httpStatusCode: 404,
      context: { required: true },
    }),
    [EErrId_DemoAction.division_by_zero]: err({
      message: "Cannot divide by zero",
      httpStatusCode: 400,
    }),
  },
} as const);

// ---------------------------------------------------------------------------
// Action domain
// ---------------------------------------------------------------------------

export const demoDomain = createActionDomain({
  domain: "demo",
  schema: {
    greet: action()
      .input({ schema: v.object({ name: v.string() }) })
      .output({ schema: v.object({ message: v.string() }) })
      .throws(err_demo_action, [EErrId_DemoAction.user_not_found]),

    add_numbers: action()
      .input({ schema: v.object({ a: v.number(), b: v.number() }) })
      .output({ schema: v.object({ sum: v.number() }) }),

    get_user: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .output({
        schema: v.object({
          id: v.string(),
          username: v.string(),
          email: v.string(),
        }),
      })
      .throws(err_demo_action, [EErrId_DemoAction.user_not_found]),

    divide: action()
      .input({ schema: v.object({ dividend: v.number(), divisor: v.number() }) })
      .output({ schema: v.object({ result: v.number(), isExact: v.boolean() }) })
      .throws(err_demo_action, [EErrId_DemoAction.division_by_zero]),
    addMessage: action()
      .input({ schema: v.object({ message: v.string() }) })
      .output(
        {
          schema: v.object({
            lastFiveMessages: v.array(
              v.object({
                message: v.string(),
                messageTime: v.date(),
              }),
            ),
          }),
        },
        ({ lastFiveMessages }) => ({
          serializedLastFive: lastFiveMessages.map(({ message, messageTime }) => ({
            message,
            messageTime: messageTime.toISOString(),
          })),
        }),
        ({ serializedLastFive }) => ({
          lastFiveMessages: serializedLastFive.map(({ message, messageTime }) => ({
            message,
            messageTime: new Date(messageTime),
          })),
        }),
      ),
  },
});

export type TDemoDomain = typeof demoDomain;
