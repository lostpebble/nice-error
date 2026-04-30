import { vi } from "vitest";
import type {
  INiceActionPrimed_JsonObject,
  TNiceActionResponse_JsonObject,
} from "../../NiceAction/NiceAction.types";

export function makeMockWs() {
  const _ls: Record<string, ((...a: any[]) => void)[]> = {};
  return {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener(ev: string, h: (...a: any[]) => void) {
      if (_ls[ev] == null) _ls[ev] = [];
      _ls[ev].push(h);
    },
    $open: () => {
      _ls["open"]?.forEach((h) => {
        h({});
      });
    },
    $message: (data: string) => {
      _ls["message"]?.forEach((h) => {
        h({ data });
      });
    },
    $error: (e: object = {}) => {
      _ls["error"]?.forEach((h) => {
        h(e);
      });
    },
    $close: (e: object = {}) => {
      _ls["close"]?.forEach((h) => {
        h(e);
      });
    },
  };
}

export function echoFetch(transform: (input: any) => any) {
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

export function fetchMockHandleAction(
  handlerAction: (
    action: INiceActionPrimed_JsonObject<any> | TNiceActionResponse_JsonObject<any>,
  ) => any,
) {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const result = handlerAction(body);
    return {
      ok: true,
      json: () => Promise.resolve(result),
    };
  });
}
