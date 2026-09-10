import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiEndpoints, LOCAL_STORAGE_KEYS } from "@constants";

/**
 * Access tokens live 15 minutes, so waiting for a 401 means every open
 * surface trips over one on that cadence and has to be rescued by the reauth
 * path. Renewing shortly *before* expiry removes the cliff instead: the
 * request goes out with a token that is still valid when the server reads
 * it, and nothing downstream ever sees the failure.
 */

let refreshCalls = 0;
const requestedTokens: string[] = [];

const jwtExpiringIn = (ms: number) => {
  const claims = { exp: Math.floor((Date.now() + ms) / 1000), name: "Dhanashree Moré" };
  const body = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${body}.signature`;
};

const mockBaseQuery = vi.fn(async (args: string | { url: string }) => {
  const url = typeof args === "string" ? args : args.url;

  if (url === ApiEndpoints.AUTH.REFRESH) {
    refreshCalls += 1;
    return {
      data: { accessToken: jwtExpiringIn(15 * 60_000), refreshToken: "rotated-refresh-token" },
    };
  }

  // Record which access token the request would have carried, so a test can
  // assert the renewal happened before the request rather than after it.
  requestedTokens.push(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN) ?? "");
  return { data: { url } };
});

vi.mock("@reduxjs/toolkit/query/react", async importOriginal => {
  const actual = await importOriginal<typeof import("@reduxjs/toolkit/query/react")>();
  return { ...actual, fetchBaseQuery: () => mockBaseQuery };
});

const { baseQueryWithReauth, getTokenExpiryMs } = await import("../baseAPI");

const fakeApi = {} as Parameters<typeof baseQueryWithReauth>[1];

describe("baseAPI proactive refresh", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    refreshCalls = 0;
    requestedTokens.length = 0;
    mockBaseQuery.mockClear();
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, "refresh-token");
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, pathname: "/scribe-logs", search: "", href: "/scribe-logs" },
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("renews a token that is about to expire, before sending the request", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, jwtExpiringIn(20_000));

    const result = await baseQueryWithReauth({ url: "/v1/chats/call-logs" }, fakeApi, {});

    expect(result.error).toBeUndefined();
    expect(refreshCalls).toBe(1);
    // The request carried the renewed token, not the one about to lapse.
    expect(requestedTokens).toEqual([localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)]);
  });

  it("leaves a token with plenty of life alone", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, jwtExpiringIn(10 * 60_000));

    await baseQueryWithReauth({ url: "/v1/chats/call-logs" }, fakeApi, {});

    expect(refreshCalls).toBe(0);
  });

  it("renews once for a burst of requests crossing the boundary together", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, jwtExpiringIn(20_000));

    await Promise.all([
      baseQueryWithReauth({ url: "/v1/chats/call-logs" }, fakeApi, {}),
      baseQueryWithReauth({ url: "/v1/chats/call-logs-summary" }, fakeApi, {}),
      baseQueryWithReauth({ url: "/v1/notifications/unread-count" }, fakeApi, {}),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it("sends the request anyway when an opaque token cannot be read", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "not-a-jwt");

    const result = await baseQueryWithReauth({ url: "/v1/chats/call-logs" }, fakeApi, {});

    expect(result.error).toBeUndefined();
    expect(refreshCalls).toBe(0);
  });

  it("does not renew, or log out, when there is no session at all", async () => {
    localStorage.clear();

    await baseQueryWithReauth({ url: "/v1/auth/login" }, fakeApi, {});

    expect(refreshCalls).toBe(0);
    expect(window.location.href).toBe("/scribe-logs");
  });

  describe("getTokenExpiryMs", () => {
    it("reads exp out of a payload carrying non-ASCII claims", () => {
      const expected = Date.now() + 60_000;
      const actual = getTokenExpiryMs(jwtExpiringIn(60_000));
      expect(actual).not.toBeNull();
      expect(Math.abs((actual as number) - expected)).toBeLessThan(1_500);
    });

    it("returns null rather than throwing on junk", () => {
      expect(getTokenExpiryMs("not-a-jwt")).toBeNull();
      expect(getTokenExpiryMs("header.@@@notbase64@@@.sig")).toBeNull();
      expect(getTokenExpiryMs(`header.${btoa('{"sub":"1"}')}.sig`)).toBeNull();
    });
  });
});
