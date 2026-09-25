import { BaseQueryApi } from "@reduxjs/toolkit/query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
const { baseQuery } = await import("../baseAPI");

/**
 * `GET /settings/chat-types` is NOT public: ally-be guards it with
 * VIEW_SETTINGS_CHAT_TYPES and resolves the tenant from the token. #690 dropped
 * the Authorization header for `getChatTypes`, every call 401'd, the available
 * chat types came back empty, and Start Scribe Mode / Upload Audio vanished for
 * every counsellor. Every endpoint carries the token.
 */
describe("baseQuery Authorization header", () => {
  const fetchMock = vi.fn();

  const apiFor = (endpoint: string) =>
    ({
      signal: new AbortController().signal,
      abort: vi.fn(),
      dispatch: vi.fn(),
      getState: () => ({}),
      extra: undefined,
      endpoint,
      type: "query" as const,
      forced: false,
    }) as unknown as BaseQueryApi;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () =>
        new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it.each(["getChatTypes", "getCallLogs"])("sends the bearer token for %s", async endpoint => {
    await baseQuery("/settings/chat-types", apiFor(endpoint), {});

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.headers.get("authorization")).toBe("Bearer access-token");
  });
});
