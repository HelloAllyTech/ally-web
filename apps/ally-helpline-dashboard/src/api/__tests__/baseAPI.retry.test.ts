import { BaseQueryApi } from "@reduxjs/toolkit/query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpMethod, LOCAL_STORAGE_KEYS } from "@constants";

// `baseAPI` reads VITE_API_BASE_URL at module load and hands it to
// fetchBaseQuery as the base URL. Unset, every request dies on "Failed to
// parse URL from undefined/api/..." before fetch is reached — which looks
// exactly like the FETCH_ERROR these tests are about. Stub it first, then
// import, so the module closes over a real origin.
vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
const { baseQueryWithRetry } = await import("../baseAPI");

/**
 * A counsellor reported "Unable to load call logs" on 2026-09-15; the request
 * had died at the gateway during one of the several ally-be rollouts that
 * happen in a working day. Nothing was wrong with her, her tenant or her data
 * — but `baseQueryWithReauth` special-cased only 401, so a 502 went straight
 * through to a full-screen wall with a manual Retry button that worked first
 * time.
 *
 * These tests pin the two halves of the rule: a failure of *delivery* on a
 * *read* is replayed, and nothing else is.
 */
describe("baseQueryWithRetry", () => {
  const fetchMock = vi.fn();

  // RTK Query merges per-call extraOptions over the enhancer's own options, so
  // this collapses the real (jittered, exponential) backoff to nothing without
  // touching the retry rule under test.
  const noBackoff = { backoff: async () => {} };

  const api = {
    signal: new AbortController().signal,
    abort: vi.fn(),
    dispatch: vi.fn(),
    getState: () => ({}),
    extra: undefined,
    endpoint: "test",
    type: "query" as const,
    forced: false,
  } as unknown as BaseQueryApi;

  const jsonResponse = (status: number, body: unknown = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "access-token");
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, "refresh-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("recovers a read that is dropped mid-rollout and then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 1 }], count: 1 }));

    const result = await baseQueryWithRetry("/v1/chats/call-logs", api, noBackoff);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ data: [{ id: 1 }], count: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a dropped connection, where no response arrived at all", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { data: [], count: 0 }));

    const result = await baseQueryWithRetry("/v1/chats/call-logs", api, noBackoff);

    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after three attempts rather than spinning forever", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(504));

    const result = await baseQueryWithRetry("/v1/chats/call-logs", api, noBackoff);

    expect(result.error).toMatchObject({ status: 504 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([400, 403, 404, 500])(
    "does not repeat a request the server actually answered (%i)",
    async status => {
      fetchMock.mockImplementation(async () => jsonResponse(status, { message: "nope" }));

      const result = await baseQueryWithRetry("/v1/chats/call-logs", api, noBackoff);

      expect(result.error).toMatchObject({ status });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE])(
    "never replays a %s, which could apply twice",
    async method => {
      fetchMock.mockImplementation(async () => jsonResponse(503));

      const result = await baseQueryWithRetry(
        { url: "/v1/chats/notes", method, body: { note: "x" } },
        api,
        noBackoff,
      );

      expect(result.error).toMatchObject({ status: 503 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("treats a FetchArgs with no method as the GET it is", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(502))
      .mockResolvedValueOnce(jsonResponse(200, { count: 0 }));

    const result = await baseQueryWithRetry({ url: "/v1/chats/call-logs" }, api, noBackoff);

    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves 401 to the refresh path, and does not retry on top of it", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(
        jsonResponse(200, { accessToken: "new-access", refreshToken: "new-refresh" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: [], count: 0 }));

    const result = await baseQueryWithRetry("/v1/chats/call-logs", api, noBackoff);

    expect(result.error).toBeUndefined();
    // original -> refresh -> replay, and no fourth attempt from the enhancer.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)).toBe("new-access");
  });
});
