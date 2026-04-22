/**
 * Diverse error-handler tests for nice-action + nice-error handler integration.
 *
 * Covers:
 *  - handleWithSync with forDomain / forId / forIds / NiceErrorHandler instance
 *  - handleWithAsync (truly awaited, propagates thrown errors)
 *  - setDefaultHandler as fallback + throwOnUnhandled option
 *  - Return value / response union from handlers
 *  - Multi-ID compound errors (fromContext) + forIds subset matching
 *  - Context access inside handlers (getContext, hasId)
 *  - Cross-domain routing: multiple domains in one handler list
 *  - Reusable NiceErrorHandler instance shared across errors
 *  - Wire-transit round-trip: castNiceError from JSON → handleWithSync
 *  - Full pipeline: executeSafe → handleWithSync / handleWithAsync
 */
import {
  castNiceError,
  defineNiceError,
  err,
  forDomain,
  forId,
  forIds,
  NiceErrorHandler,
} from "@nice-code/error";
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// Shared error domains
// ---------------------------------------------------------------------------

const err_system = defineNiceError({
  domain: "err_system",
  schema: {
    unexpected: err({ message: "Unexpected system error", httpStatusCode: 500 }),
    timeout: err({ message: "Request timed out", httpStatusCode: 504 }),
  },
} as const);

const err_order = defineNiceError({
  domain: "err_order",
  schema: {
    not_found: err<{ orderId: string }>({
      message: ({ orderId }) => `Order ${orderId} not found`,
      httpStatusCode: 404,
      context: { required: true },
    }),
    already_shipped: err<{ orderId: string; shippedAt: Date }>({
      message: ({ orderId }) => `Order ${orderId} already shipped`,
      httpStatusCode: 409,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ orderId, shippedAt }) => ({
            orderId,
            shippedAt: shippedAt.toISOString(),
          }),
          fromJsonSerializable: ({ orderId, shippedAt }) => ({
            orderId,
            shippedAt: new Date(shippedAt as string),
          }),
        },
      },
    }),
    payment_required: err({ message: "Payment required", httpStatusCode: 402 }),
    cancelled: err({ message: "Order was cancelled", httpStatusCode: 410 }),
  },
} as const);

const err_inventory = defineNiceError({
  domain: "err_inventory",
  schema: {
    out_of_stock: err<{ sku: string; requested: number }>({
      message: ({ sku }) => `SKU ${sku} is out of stock`,
      httpStatusCode: 409,
      context: { required: true },
    }),
    reserved: err<{ sku: string }>({
      message: ({ sku }) => `SKU ${sku} is reserved`,
      httpStatusCode: 409,
      context: { required: true },
    }),
    discontinued: err({ message: "Item discontinued", httpStatusCode: 410 }),
  },
} as const);

// ---------------------------------------------------------------------------
// Shared action domain factory
// ---------------------------------------------------------------------------

const makeOrderDomain = () =>
  createActionRootDomain({
    domain: "root_order",
  }).createChildDomain({
    domain: "order",
    actions: {
      shipOrder: action()
        .input({ schema: v.object({ orderId: v.string() }) })
        .output({ schema: v.object({ trackingId: v.string() }) })
        .throws(err_order, ["not_found", "already_shipped", "payment_required"] as const)
        .throws(err_inventory),

      cancelOrder: action()
        .input({ schema: v.object({ orderId: v.string() }) })
        .throws(err_order, ["not_found", "cancelled"] as const),
    },
  });

// ---------------------------------------------------------------------------
// 1. handleWithSync — forId (singular exact match)
// ---------------------------------------------------------------------------

describe("handleWithSync — forId (singular)", () => {
  it("fires when the exact id is active", () => {
    const error = err_order.fromId("not_found", { orderId: "ord-1" });
    const spy = vi.fn(() => "matched");

    const result = error.handleWithSync([forId(err_order, "not_found", spy)]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toBe("matched");
  });

  it("does not fire for a different active id", () => {
    const error = err_order.fromId("payment_required");
    const spy = vi.fn();

    const result = error.handleWithSync([forId(err_order, "not_found", spy)]);

    expect(spy).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("handler receives context for the matched id", () => {
    const error = err_order.fromId("not_found", { orderId: "ord-42" });
    let captured: string | undefined;

    error.handleWithSync([
      forId(err_order, "not_found", (h) => {
        captured = h.getContext("not_found").orderId;
      }),
    ]);

    expect(captured).toBe("ord-42");
  });

  it("forId before forDomain wins for that specific id", () => {
    const calls: string[] = [];
    const error = err_order.fromId("cancelled");

    error.handleWithSync([
      forId(err_order, "cancelled", () => {
        calls.push("specific");
      }),
      forDomain(err_order, () => {
        calls.push("domain");
      }),
    ]);

    expect(calls).toEqual(["specific"]);
  });
});

// ---------------------------------------------------------------------------
// 2. handleWithSync — NiceErrorHandler instance with setDefaultHandler
// ---------------------------------------------------------------------------

describe("handleWithSync — NiceErrorHandler instance + setDefaultHandler", () => {
  it("setDefaultHandler fires when no forDomain/forId case matches", () => {
    const error = err_inventory.fromId("discontinued");
    const defaultSpy = vi.fn(() => "default-fired");

    const handler = new NiceErrorHandler()
      .forDomain(err_order, () => "order")
      .setDefaultHandler(defaultSpy);

    const result = error.handleWithSync(handler);

    expect(defaultSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe("default-fired");
  });

  it("setDefaultHandler does not fire when a prior case matches", () => {
    const error = err_order.fromId("cancelled");
    const defaultSpy = vi.fn();

    const handler = new NiceErrorHandler()
      .forDomain(err_order, () => "matched")
      .setDefaultHandler(defaultSpy);

    error.handleWithSync(handler);

    expect(defaultSpy).not.toHaveBeenCalled();
  });

  it("shared NiceErrorHandler instance routes correctly across different errors", () => {
    const results: string[] = [];

    const handler = new NiceErrorHandler()
      .forDomain(err_order, () => {
        results.push("order");
      })
      .forDomain(err_inventory, () => {
        results.push("inventory");
      });

    err_order.fromId("not_found", { orderId: "x" }).handleWithSync(handler);
    err_inventory.fromId("discontinued").handleWithSync(handler);
    err_order.fromId("cancelled").handleWithSync(handler);

    expect(results).toEqual(["order", "inventory", "order"]);
  });

  it("NiceErrorHandler passed directly (not in array) is equivalent to array wrapping", () => {
    const error = err_inventory.fromId("reserved", { sku: "SKU-1" });
    const spy = vi.fn(() => 42);

    const handler = new NiceErrorHandler().forDomain(err_inventory, spy);

    const r1 = error.handleWithSync(handler);
    const r2 = error.handleWithSync([handler]);

    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 3. handleWithSync — throwOnUnhandled option
// ---------------------------------------------------------------------------

describe("handleWithSync — throwOnUnhandled", () => {
  it("throws the original error when no case matches and throwOnUnhandled is true", () => {
    const error = err_inventory.fromId("discontinued");

    expect(() => {
      error.handleWithSync([forDomain(err_order, () => {})], { throwOnUnhandled: true });
    }).toThrow();
  });

  it("does not throw when throwOnUnhandled is false (default)", () => {
    const error = err_inventory.fromId("discontinued");

    expect(() => {
      error.handleWithSync([forDomain(err_order, () => {})]);
    }).not.toThrow();
  });

  it("does not throw when a case matches, even with throwOnUnhandled", () => {
    const error = err_order.fromId("payment_required");

    expect(() => {
      error.handleWithSync([forDomain(err_order, () => "ok")], { throwOnUnhandled: true });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. handleWithSync — return value union
// ---------------------------------------------------------------------------

describe("handleWithSync — return value / response union", () => {
  it("returns the exact value from the matching handler", () => {
    const error = err_order.fromId("payment_required");
    const result = error.handleWithSync([forDomain(err_order, (h) => h.httpStatusCode)]);
    expect(result).toBe(402);
  });

  it("returns undefined when no case matches", () => {
    const error = err_order.fromId("cancelled");
    const result = error.handleWithSync([forDomain(err_inventory, () => "nope")]);
    expect(result).toBeUndefined();
  });

  it("returns union type from multi-domain handler", () => {
    const handler = new NiceErrorHandler()
      .forDomain(err_order, () => "order-error" as const)
      .forDomain(err_inventory, () => 409 as const);

    const r1 = err_order.fromId("cancelled").handleWithSync(handler);
    const r2 = err_inventory.fromId("discontinued").handleWithSync(handler);

    expect(r1).toBe("order-error");
    expect(r2).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 5. handleWithSync — multi-ID compound errors (fromContext)
// ---------------------------------------------------------------------------

describe("handleWithSync — multi-ID compound errors", () => {
  it("forDomain fires once for a compound error with multiple ids", () => {
    const spy = vi.fn();
    const error = err_order.fromContext({
      not_found: { orderId: "ord-99" },
      payment_required: undefined,
    });

    error.handleWithSync([forDomain(err_order, spy)]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("forIds fires when any of its ids is active in the compound error", () => {
    const calls: string[] = [];
    const error = err_order.fromContext({
      not_found: { orderId: "ord-99" },
      payment_required: undefined,
    });

    error.handleWithSync([
      forIds(err_order, ["payment_required", "cancelled"], () => {
        calls.push("payment_or_cancelled");
      }),
    ]);

    expect(calls).toEqual(["payment_or_cancelled"]);
  });

  it("forIds does not fire when none of its ids are active", () => {
    const error = err_order.fromContext({
      not_found: { orderId: "ord-99" },
      payment_required: undefined,
    });

    const result = error.handleWithSync([
      forIds(err_order, ["already_shipped", "cancelled"], () => "matched"),
    ]);

    expect(result).toBeUndefined();
  });

  it("handler can inspect all active ids on the compound error", () => {
    const error = err_order.fromContext({
      not_found: { orderId: "ord-5" },
      payment_required: undefined,
    });

    let activeIds: string[] = [];

    error.handleWithSync([
      forDomain(err_order, (h) => {
        activeIds = h.getIds();
      }),
    ]);

    expect(activeIds).toContain("not_found");
    expect(activeIds).toContain("payment_required");
  });
});

// ---------------------------------------------------------------------------
// 6. Cross-domain routing
// ---------------------------------------------------------------------------

describe("handleWithSync — cross-domain routing", () => {
  it("routes each error to the correct domain handler in a shared handler list", () => {
    const calls: string[] = [];

    const cases = [
      forDomain(err_order, () => {
        calls.push("order");
      }),
      forDomain(err_inventory, () => {
        calls.push("inventory");
      }),
    ];

    err_order.fromId("cancelled").handleWithSync(cases);
    err_inventory.fromId("out_of_stock", { sku: "SKU-A", requested: 5 }).handleWithSync(cases);
    err_order.fromId("payment_required").handleWithSync(cases);

    expect(calls).toEqual(["order", "inventory", "order"]);
  });

  it("forDomain(err_order) does not match err_inventory errors", () => {
    const error = err_inventory.fromId("discontinued");
    const spy = vi.fn();

    const result = error.handleWithSync([forDomain(err_order, spy)]);

    expect(spy).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("multi-domain handler with forIds finds the right domain+id pair", () => {
    const orderErr = err_order.fromId("not_found", { orderId: "ord-3" });
    const inventoryErr = err_inventory.fromId("out_of_stock", { sku: "SKU-B", requested: 2 });
    const captured: string[] = [];

    const cases = [
      forIds(err_order, ["not_found"], (h) => {
        captured.push(`order-nf:${h.getContext("not_found").orderId}`);
      }),
      forIds(err_inventory, ["out_of_stock"], (h) => {
        captured.push(`inv-oos:${h.getContext("out_of_stock").sku}`);
      }),
    ];

    orderErr.handleWithSync(cases);
    inventoryErr.handleWithSync(cases);

    expect(captured).toEqual(["order-nf:ord-3", "inv-oos:SKU-B"]);
  });
});

// ---------------------------------------------------------------------------
// 7. handleWithAsync
// ---------------------------------------------------------------------------

describe("handleWithAsync", () => {
  it("truly awaits an async handler (side effects visible after await)", async () => {
    const results: string[] = [];
    const error = err_order.fromId("payment_required");

    await error.handleWithAsync([
      forDomain(err_order, async () => {
        await Promise.resolve();
        results.push("async-done");
      }),
    ]);

    expect(results).toEqual(["async-done"]);
  });

  it("returns the awaited handler result", async () => {
    const error = err_order.fromId("cancelled");

    const result = await error.handleWithAsync([
      forDomain(err_order, async () => {
        await Promise.resolve();
        return "async-value";
      }),
    ]);

    expect(result).toBe("async-value");
  });

  it("returns undefined when no case matches", async () => {
    const error = err_inventory.fromId("discontinued");

    const result = await error.handleWithAsync([forDomain(err_order, async () => "nope")]);

    expect(result).toBeUndefined();
  });

  it("propagates errors thrown inside async handler", async () => {
    const error = err_order.fromId("payment_required");

    await expect(
      error.handleWithAsync([
        forDomain(err_order, async () => {
          throw new Error("handler-boom");
        }),
      ]),
    ).rejects.toThrow("handler-boom");
  });

  it("works correctly with synchronous handlers in the async path", async () => {
    const error = err_inventory.fromId("reserved", { sku: "SKU-C" });

    const result = await error.handleWithAsync([
      forDomain(err_inventory, (h) => {
        if (h.hasId("reserved")) return h.getContext("reserved").sku;
      }),
    ]);

    expect(result).toBe("SKU-C");
  });
});

// ---------------------------------------------------------------------------
// 8. Wire-transit round-trip: castNiceError → handleWithSync
// ---------------------------------------------------------------------------

describe("castNiceError + handleWithSync — wire round-trip", () => {
  function wireTransit(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  it("routes a serialized error to the correct domain handler", () => {
    const original = err_order.fromId("not_found", { orderId: "ord-wire" });
    const casted = castNiceError(wireTransit(original.toJsonObject()));
    const spy = vi.fn();

    casted.handleWithSync([forDomain(err_order, spy)]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("context is available on hydrated error from castNiceError", () => {
    const original = err_order.fromId("not_found", { orderId: "ord-ctx" });
    const casted = castNiceError(wireTransit(original.toJsonObject()));
    let captured: string | undefined;

    casted.handleWithSync([
      forDomain(err_order, (h) => {
        if (h.hasId("not_found")) {
          captured = h.getContext("not_found").orderId;
        }
      }),
    ]);

    expect(captured).toBe("ord-ctx");
  });

  it("routes a non-domain payload (wasntNice) to default handler only", () => {
    const casted = castNiceError(wireTransit({ message: "boom", status: 500 }));
    const domainSpy = vi.fn();
    const defaultSpy = vi.fn(() => "default");

    const result = casted.handleWithSync(
      new NiceErrorHandler()
        .forDomain(err_order, domainSpy)
        .forDomain(err_inventory, domainSpy)
        .setDefaultHandler(defaultSpy),
    );

    expect(domainSpy).not.toHaveBeenCalled();
    expect(defaultSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe("default");
  });

  it("multi-id wire-transited error: forIds still matches the active subset", () => {
    const original = err_order
      .fromId("not_found", { orderId: "ord-multi" })
      .addId("payment_required");

    const casted = castNiceError(wireTransit(original.toJsonObject()));
    let matched = false;

    casted.handleWithSync([
      forIds(err_order, ["payment_required"], (h) => {
        matched = h.hasId("payment_required");
      }),
    ]);

    expect(matched).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. executeSafe + handleWithSync / handleWithAsync — full pipeline
// ---------------------------------------------------------------------------

describe("executeSafe + handler — full pipeline", () => {
  it("handleWithSync routes a domain error from executeSafe result", async () => {
    const dom = makeOrderDomain();
    const calls: string[] = [];

    dom.setHandler(
      new ActionHandler().forAction(dom, "shipOrder", { execution: () => {
        throw err_order.fromId("not_found", { orderId: "ord-pipe" });
      } }),
    );

    const result = await dom.action("shipOrder").executeSafe({ orderId: "ord-pipe" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWithSync([
        forId(err_order, "not_found", (h) => {
          calls.push(`nf:${h.getContext("not_found").orderId}`);
        }),
        forDomain(err_order, () => {
          calls.push("order-fallback");
        }),
      ]);
    }

    expect(calls).toEqual(["nf:ord-pipe"]);
  });

  it("handleWithAsync awaits an async handler after executeSafe", async () => {
    const dom = makeOrderDomain();
    const log: string[] = [];

    dom.setHandler(
      new ActionHandler().forAction(dom, "cancelOrder", { execution: () => {
        throw err_order.fromId("cancelled");
      } }),
    );

    const result = await dom.action("cancelOrder").executeSafe({ orderId: "ord-async" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      await result.error.handleWithAsync([
        forDomain(err_order, async (h) => {
          await Promise.resolve();
          log.push(`status:${h.httpStatusCode}`);
        }),
      ]);
    }

    expect(log).toEqual(["status:410"]);
  });

  it("inventory error from action routes via cross-domain handler", async () => {
    const dom = makeOrderDomain();
    const calls: string[] = [];

    dom.setHandler(
      new ActionHandler().forAction(dom, "shipOrder", { execution: () => {
        throw err_inventory.fromId("out_of_stock", { sku: "SKU-X", requested: 3 });
      } }),
    );

    const result = await dom.action("shipOrder").executeSafe({ orderId: "ord-inv" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWithSync([
        forDomain(err_order, () => {
          calls.push("order");
        }),
        forDomain(err_inventory, (h) => {
          if (h.hasId("out_of_stock")) {
            calls.push(`oos:${h.getContext("out_of_stock").sku}`);
          }
        }),
      ]);
    }

    expect(calls).toEqual(["oos:SKU-X"]);
  });

  it("NiceErrorHandler with setDefaultHandler catches unregistered-domain error from executeSafe", async () => {
    const dom = makeOrderDomain();
    const calls: string[] = [];

    dom.setHandler(
      new ActionHandler().forAction(dom, "shipOrder", { execution: () => {
        throw err_system.fromId("unexpected");
      } }),
    );

    const result = await dom.action("shipOrder").executeSafe({ orderId: "ord-sys" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWithSync(
        new NiceErrorHandler()
          .forDomain(err_order, () => {
            calls.push("order");
          })
          .forDomain(err_inventory, () => {
            calls.push("inventory");
          })
          .setDefaultHandler(() => {
            calls.push("default");
          }),
      );
    }

    expect(calls).toEqual(["default"]);
  });

  it("compound error from action: forIds fires for any active id", async () => {
    const dom = makeOrderDomain();
    const calls: string[] = [];

    dom.setHandler(
      new ActionHandler().forAction(dom, "shipOrder", { execution: () => {
        throw err_order.fromContext({
          payment_required: undefined,
          not_found: { orderId: "ord-compound" },
        });
      } }),
    );

    const result = await dom.action("shipOrder").executeSafe({ orderId: "ord-compound" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWithSync([
        forIds(err_order, ["payment_required", "cancelled"], () => {
          calls.push("pay-or-cancel");
        }),
        forDomain(err_order, () => {
          calls.push("order-any");
        }),
      ]);
    }

    expect(calls).toEqual(["pay-or-cancel"]);
  });
});

// ---------------------------------------------------------------------------
// 10. Custom-serializer context survives wire transit + handleWithAsync
// ---------------------------------------------------------------------------

describe("custom serializer + handleWithAsync — round-trip", () => {
  function wireTransit(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  it("Date context is deserialized via hydrate and accessible in async handler", async () => {
    const shippedAt = new Date("2024-06-15T10:00:00.000Z");
    const original = err_order.fromId("already_shipped", { orderId: "ord-ship", shippedAt });

    const casted = castNiceError(wireTransit(original.toJsonObject()));

    let capturedDate: Date | undefined;

    await casted.handleWithAsync([
      forId(err_order, "already_shipped", async (h) => {
        await Promise.resolve();
        capturedDate = h.getContext("already_shipped").shippedAt;
      }),
    ]);

    expect(capturedDate).toBeInstanceOf(Date);
    expect(capturedDate?.toISOString()).toBe("2024-06-15T10:00:00.000Z");
  });
});
