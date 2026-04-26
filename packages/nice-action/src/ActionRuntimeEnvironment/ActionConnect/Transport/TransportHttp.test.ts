import * as v from "valibot";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../../../ActionDomain/helpers/createRootActionDomain";
import { action } from "../../../ActionSchema/action";
import { ETransportStatus, ETransportType } from "./Transport.types";
import { TransportHttp } from "./TransportHttp";

let _n = 0;
function makeDomain() {
  const n = ++_n;
  const root = createActionRootDomain({ domain: `http_root_${n}` });
  const domain = root.createChildDomain({
    domain: `http_dom_${n}`,
    actions: {
      run: action()
        .input({ schema: v.object({ x: v.number() }) })
        .output({ schema: v.object({ result: v.number() }) }),
    },
  });
  return { domain };
}

function echoFetch(transform: (input: any) => any) {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return {
      ok: true,
      json: () =>
        Promise.resolve({
          ...body,
          type: "resolved",
          ok: true,
          output: transform(body.input),
          timeResponded: Date.now(),
        }),
    };
  });
}

describe("TransportHttp", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("status is always ready", () => {
    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    expect(t.status.status).toBe(ETransportStatus.ready);
    expect(t.checkAndPrepare().status).toBe(ETransportStatus.ready);
  });

  it("makeRequest sends POST with JSON content-type to the configured URL", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });
    const fetchMock = echoFetch((i) => ({ result: i.x }));
    vi.stubGlobal("fetch", fetchMock);

    const t = new TransportHttp({ type: ETransportType.http, url: "http://api/run" });
    await t.makeRequest(primed, 5_000);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api/run",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }),
    );
  });

  it("makeRequest resolves with the response output", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 4 });
    vi.stubGlobal("fetch", echoFetch((i) => ({ result: i.x * 3 })));

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    const response = await t.makeRequest(primed, 5_000);

    expect(response.result.ok).toBe(true);
    if (response.result.ok) expect(response.result.output).toEqual({ result: 12 });
  });

  it("makeRequest rejects with transport_send_failed on non-ok HTTP with unparseable body", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("bad json")),
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    await expect(t.makeRequest(primed, 5_000)).rejects.toThrow(/failed to send/i);
  });

  it("makeRequest rejects with transport_invalid_action_response when response shape is wrong", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ wrong: "shape" }),
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    await expect(t.makeRequest(primed, 5_000)).rejects.toThrow(/invalid action response/i);
  });

  it("makeRequest rejects with transport_timeout when the timeout expires", async () => {
    vi.useFakeTimers();
    try {
      const { domain } = makeDomain();
      const primed = domain.action("run").prime({ x: 1 });
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

      const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
      const p = t.makeRequest(primed, 1_000);
      vi.advanceTimersByTime(1_001);

      await expect(p).rejects.toThrow(/timed out/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disconnect aborts all in-flight requests via AbortController", () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });

    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return new Promise(() => {});
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    t.makeRequest(primed, 5_000).catch(() => {});

    expect(capturedSignal?.aborted).toBe(false);
    t.disconnect();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
