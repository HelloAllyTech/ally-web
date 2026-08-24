import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

import { buildReturnTo, handleLogout } from "../baseAPI";

/**
 * Covers item 4 of the graceful-failure audit: a session-expiry logout used
 * to be a silent `window.location.href = "/login"` reload with no
 * explanation and no way back to what the learner was doing. `handleLogout`
 * now tells Login.tsx why (via `sessionExpired=1`) and where to send the
 * learner back to (via `returnTo`).
 */
describe("baseAPI session expiry", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, "access-token");
    localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, "refresh-token");
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  const setLocation = (pathname: string, search = "") => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, pathname, search, href: `${pathname}${search}` },
      writable: true,
    });
  };

  it("captures the current path+search as returnTo", () => {
    setLocation("/tracks/abc123/items/q1", "?foo=bar");
    expect(buildReturnTo()).toBe("/tracks/abc123/items/q1?foo=bar");
  });

  it("never returns the login page itself as a returnTo target", () => {
    setLocation("/login", "?sessionExpired=1");
    expect(buildReturnTo()).toBeNull();
  });

  it("clears tokens and redirects to login with sessionExpired and returnTo set", () => {
    setLocation("/tracks/abc123/items/q1");
    handleLogout();

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();

    const redirectedTo = new URL(window.location.href, "http://localhost");
    expect(redirectedTo.pathname).toBe("/login");
    expect(redirectedTo.searchParams.get("sessionExpired")).toBe("1");
    expect(redirectedTo.searchParams.get("returnTo")).toBe("/tracks/abc123/items/q1");
  });

  it("omits returnTo when there is nowhere meaningful to return to", () => {
    setLocation("/login");
    handleLogout();

    const redirectedTo = new URL(window.location.href, "http://localhost");
    expect(redirectedTo.searchParams.get("returnTo")).toBeNull();
  });
});
