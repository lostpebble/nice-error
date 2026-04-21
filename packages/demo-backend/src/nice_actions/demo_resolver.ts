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

export function registerDemoResolvers<T extends ActionHandler>(handler: T): T {
  return handler
    .resolve(act_domain_demo, "greet", async ({ name }) => {
      return { message: `Hello, ${name}! Greetings from the server.` };
    })
    .resolve(act_domain_demo, "add_numbers", async ({ a, b }) => {
      return { sum: a + b };
    })
    .resolve(act_domain_demo, "get_user", async ({ userId }) => {
      const user = USERS[userId];
      if (user == null) {
        throw err_demo_action.fromId(EErrId_DemoAction.user_not_found, { userId });
      }
      return user;
    })
    .resolve(act_domain_demo, "divide", async ({ dividend, divisor }) => {
      if (divisor === 0) {
        throw err_demo_action.fromId(EErrId_DemoAction.division_by_zero);
      }
      const result = dividend / divisor;
      return { result, isExact: Number.isInteger(result) };
    })
    .resolve(act_domain_demo, "add_message", async ({ message }) => {
      messageStore.push({ message, messageTime: new Date() });
      const lastFiveMessages = messageStore.slice(-5);
      return { lastFiveMessages };
    });
}

// ---------------------------------------------------------------------------
// Shared handler for HTTP endpoint (Hono / Cloudflare Worker)
// ---------------------------------------------------------------------------

export const demoActionHandler = registerDemoResolvers(new ActionHandler());
