import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getGuestTokenStorageKey, LOCAL_STORAGE_KEYS } from "@constants";

const { handleLogoutSpy } = vi.hoisted(() => ({ handleLogoutSpy: vi.fn() }));

// If anything on the talker path ever reached the user API's logout, this spy would see it.
vi.mock("../baseAPI", async importOriginal => ({
  ...(await importOriginal<typeof import("../baseAPI")>()),
  handleLogout: handleLogoutSpy,
}));

import { helplineGuestAPI } from "../helplineGuest";

/**
 * The talker page must never trigger the signed-in app's session handling. The
 * user `baseAPI` treats a 401 without user tokens as an expired session and
 * hard-redirects to /login — for an anonymous talker whose guest token was just
 * revoked (erasure does that), that would land someone who asked for help on a
 * staff sign-in page.
 */
describe("helplineGuestAPI", () => {
  const originalLocation = window.location;
  let fetchMock: ReturnType<typeof vi.fn>;

  const makeStore = () =>
    configureStore({
      reducer: { [helplineGuestAPI.reducerPath]: helplineGuestAPI.reducer },
      middleware: getDefault => getDefault().concat(helplineGuestAPI.middleware),
    });

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "http://localhost/talk/acme", pathname: "/talk/acme" },
      writable: true,
    });
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "staff-access-token");
    sessionStorage.setItem(
      getGuestTokenStorageKey("acme"),
      JSON.stringify({ token: "guest-token", expiresAt: "2099-01-01T00:00:00Z" }),
    );
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ statusCode: 401, message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    handleLogoutSpy.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("hands a 401 back as an ordinary error — no logout, no redirect, staff tokens untouched", async () => {
    const store = makeStore();
    const result = await store.dispatch(
      helplineGuestAPI.endpoints.getGuestChat.initiate({ tenantCode: "acme" }),
    );

    expect(result.error).toMatchObject({ status: 401 });
    expect(handleLogoutSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe("http://localhost/talk/acme");
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)).toBe("staff-access-token");
    // One request: no refresh-token dance, no retry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("authorises with this helpline's guest token, never the signed-in user's access token", async () => {
    const store = makeStore();
    await store.dispatch(
      helplineGuestAPI.endpoints.eraseGuestChat.initiate({ tenantCode: "acme" }),
    );

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("http://api.test/api/v1/helpline/guest/erase");
    expect(request.headers.get("Authorization")).toBe("Bearer guest-token");
  });

  it("sends no Authorization at all on the public endpoints", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ enabled: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const store = makeStore();
    const result = await store.dispatch(
      helplineGuestAPI.endpoints.getPublicStatus.initiate({ tenantCode: "acme", lang: "hi" }),
    );

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe("http://api.test/api/v1/helpline/public/acme/status?lang=hi");
    expect(request.headers.get("Authorization")).toBeNull();
    expect(result.data).toEqual({ enabled: false });
  });
});
