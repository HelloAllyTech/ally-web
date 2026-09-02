import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiEndpoints, LOCAL_STORAGE_KEYS } from "@constants";

/**
 * Regression for the getPracticeStreak 401 spike (shared with getCallTags/
 * getCallLogs): several queries mounted on the same page — e.g. the
 * practice-streak bar and the nav pill on /learn — hit an expired access
 * token at the same moment. Each independent 401 used to kick off its own
 * refresh call with the same refresh token; since the backend rotates
 * refresh tokens on use, the loser of that race got a 401 back from
 * /auth/refresh and treated a session the winner had *just* renewed as dead,
 * logging out a still-valid session.
 */

let refreshCalls = 0;
const attemptCounts: Record<string, number> = {};

const mockBaseQuery = vi.fn(async (args: string | { url: string }) => {
  const url = typeof args === "string" ? args : args.url;

  if (url === ApiEndpoints.AUTH.REFRESH) {
    refreshCalls += 1;
    // Backend rotates refresh tokens: only the first caller to reach it gets
    // fresh tokens back, exactly like a real rotating-refresh-token setup.
    if (refreshCalls === 1) {
      return { data: { accessToken: "fresh-access-token", refreshToken: "fresh-refresh-token" } };
    }
    return { error: { status: 401, data: { message: "refresh token already used" } } };
  }

  // Each resource's first attempt carries the stale token and 401s; a retry
  // (which only happens after a refresh) succeeds.
  attemptCounts[url] = (attemptCounts[url] ?? 0) + 1;
  if (attemptCounts[url] === 1) {
    return { error: { status: 401, data: { message: "unauthorized" } } };
  }
  return { data: { url } };
});

vi.mock("@reduxjs/toolkit/query/react", async importOriginal => {
  const actual = await importOriginal<typeof import("@reduxjs/toolkit/query/react")>();
  return { ...actual, fetchBaseQuery: () => mockBaseQuery };
});

const { baseQueryWithReauth } = await import("../baseAPI");

const fakeApi = {} as Parameters<typeof baseQueryWithReauth>[1];

describe("baseAPI concurrent 401s", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    refreshCalls = 0;
    for (const key of Object.keys(attemptCounts)) delete attemptCounts[key];
    mockBaseQuery.mockClear();
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "stale-access-token");
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, "stale-refresh-token");

    // Avoid jsdom's "not implemented: navigation" throw if the (buggy) code
    // under test calls handleLogout(), same approach as baseAPI.sessionExpiry.test.ts.
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, pathname: "/learn", search: "", href: "/learn" },
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("shares one refresh across two requests that 401 at the same moment", async () => {
    const [streak, summary] = await Promise.all([
      baseQueryWithReauth({ url: "/v1/community/practice-streak" }, fakeApi, {}),
      baseQueryWithReauth({ url: "/v1/community/practice-streak/summary" }, fakeApi, {}),
    ]);

    expect(streak.error).toBeUndefined();
    expect(summary.error).toBeUndefined();
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)).toBe("fresh-access-token");
  });
});
