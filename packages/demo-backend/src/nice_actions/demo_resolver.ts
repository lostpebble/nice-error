import { createDomainResolver, createResolverEnvironment } from "@nice-error/nice-action";
import { demoDomain, EErrId_DemoAction, err_demo_action } from "demo-shared";

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
// Domain resolver
// ---------------------------------------------------------------------------

export const demoDomainResolver = createDomainResolver(demoDomain)
  .resolve("greet", async ({ name }) => {
    return { message: `Hello, ${name}! Greetings from the server.` };
  })
  .resolve("add_numbers", async ({ a, b }) => {
    return { sum: a + b };
  })
  .resolve("get_user", async ({ userId }) => {
    const user = USERS[userId];
    if (user == null) {
      throw err_demo_action.fromId(EErrId_DemoAction.user_not_found, { userId });
    }
    return user;
  })
  .resolve("divide", async ({ dividend, divisor }) => {
    if (divisor === 0) {
      throw err_demo_action.fromId(EErrId_DemoAction.division_by_zero);
    }
    const result = dividend / divisor;
    return { result, isExact: Number.isInteger(result) };
  })
  .resolve("addMessage", async ({ message }) => {
    messageStore.push({ message, messageTime: new Date() });
    const lastFiveMessages = messageStore.slice(-5);
    return { lastFiveMessages };
  });

// ---------------------------------------------------------------------------
// Resolver environment (handles multi-domain routing by wire.domain)
// ---------------------------------------------------------------------------

export const demoResolverEnvironment = createResolverEnvironment([demoDomainResolver]);
