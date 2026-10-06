import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PostHog on the anonymous talker page: in-memory id, no replay, no
 * autocapture, only `talker_*` events. posthog-js is mocked globally in
 * test-setup.ts; the module reads its env at import, so each test imports a
 * fresh copy after stubbing it.
 */
let posthog: typeof import("posthog-js").default;

const loadAnalytics = async (pathname: string) => {
  window.history.pushState({}, "", pathname);
  vi.resetModules();
  posthog = (await import("posthog-js")).default;
  vi.mocked(posthog.init).mockClear();
  vi.mocked(posthog.capture).mockClear();
  vi.mocked(posthog.identify).mockClear();
  return import("../analytics");
};

describe("analytics on /talk", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_POSTHOG_ENABLED", "true");
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://ph.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/");
  });

  it("starts PostHog in memory, without replay or autocapture, on a /talk load", async () => {
    const analytics = await loadAnalytics("/talk/acme");
    analytics.initAnalytics();

    expect(posthog.init).toHaveBeenCalledTimes(1);
    const config = vi.mocked(posthog.init).mock.calls[0][1] as Record<string, unknown>;
    expect(config).toMatchObject({
      persistence: "memory",
      disable_session_recording: true,
      autocapture: false,
      capture_dead_clicks: false,
      capture_pageleave: false,
      capture_exceptions: false,
      person_profiles: "identified_only",
      save_referrer: false,
    });
    expect(config).not.toHaveProperty("session_recording");
    expect(analytics.isAnalyticsPersistent()).toBe(false);
  });

  it("sends only the explicit talker events there — no pageviews, no identify", async () => {
    const analytics = await loadAnalytics("/talk/acme");
    analytics.initAnalytics();

    analytics.captureEvent("talker_session_started", { chat_id: "c-1" });
    analytics.captureEvent("helpline_chat_claimed", { chat_id: "c-1" });
    analytics.capturePageview("/talk/acme");
    analytics.identifyUser("42", { email: "someone@example.test" });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith("talker_session_started", { chat_id: "c-1" });
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it("keeps the standard, persistent setup everywhere else", async () => {
    const analytics = await loadAnalytics("/learn");
    analytics.initAnalytics();

    const config = vi.mocked(posthog.init).mock.calls[0][1] as Record<string, unknown>;
    expect(config).toMatchObject({ persistence: "localStorage", autocapture: true });
    expect(analytics.isAnalyticsPersistent()).toBe(true);
    analytics.captureEvent("helpline_chat_claimed", { chat_id: "c-1" });
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it("a standard instance sends nothing once in-app navigation reaches /talk", async () => {
    const analytics = await loadAnalytics("/learn");
    analytics.initAnalytics();
    window.history.pushState({}, "", "/talk/acme");

    analytics.captureEvent("talker_session_started", { chat_id: "c-1" });
    analytics.capturePageview("/talk/acme");
    analytics.identifyUser("42");

    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});
