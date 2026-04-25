import { ActionHandler } from "@nice-code/action";
import { act_domain_demo, EErrId_DemoAction, err_demo_action } from "demo-shared";

// ---------------------------------------------------------------------------
// Simulated DB
// ---------------------------------------------------------------------------

const USERS: Record<string, { id: string; username: string; email: string }> = {
  user1: { id: "user1", username: "alice", email: "alice@example.com" },
  user2: { id: "user2", username: "bob", email: "bob@example.com" },
  user3: { id: "user3", username: "carol", email: "carol@example.com" },
};

// ---------------------------------------------------------------------------
// In-memory message store (last 5 messages)
// ---------------------------------------------------------------------------

const messageStore: Array<{ message: string; messageTime: Date }> = [];

// ---------------------------------------------------------------------------
// Register demo resolvers on any ActionHandler (or subclass)
// ---------------------------------------------------------------------------

export function registerDemoActionHandler<T extends ActionHandler>(handler: T): T {
  return handler
    .forDomainActionCases(act_domain_demo, {
      greet: {
        execution: async (action) => {
          return { message: `Hello, ${action.input.name}! Greetings from the server.` };
        },
      },
    })
    .forAction(act_domain_demo, "add_numbers", {
      execution: async ({ input: { a, b } }) => {
        return { sum: a + b };
      },
    })
    .forAction(act_domain_demo, "get_user", {
      execution: async ({ input: { userId } }) => {
        const user = USERS[userId];
        if (user == null) {
          throw err_demo_action.fromId(EErrId_DemoAction.user_not_found, { userId });
        }
        return user;
      },
    })
    .forAction(act_domain_demo, "divide", {
      execution: async ({ input: { dividend, divisor } }) => {
        if (divisor === 0) {
          throw err_demo_action.fromId(EErrId_DemoAction.division_by_zero);
        }
        const result = dividend / divisor;
        return { result, isExact: Number.isInteger(result) };
      },
    })
    .forAction(act_domain_demo, "add_message", {
      execution: async ({ input: { message } }) => {
        messageStore.push({ message, messageTime: new Date() });
        const lastFiveMessages = messageStore.slice(-5);
        return { lastFiveMessages };
      },
    });
}

// ---------------------------------------------------------------------------
// Shared handler for HTTP endpoint (Hono / Cloudflare Worker)
// ---------------------------------------------------------------------------

const state: {
  actionHandler?: ActionHandler;
} = {};

export const getDemoBackendHandler = () => {
  if (!state.actionHandler) {
    state.actionHandler = registerDemoActionHandler(new ActionHandler());
  }
  return state.actionHandler;
};
