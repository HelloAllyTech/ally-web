import posthog, { type Properties } from "posthog-js";

import type { AnalyticsEventName } from "@constants/analyticsEvents";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string;
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED === "true";

// ─── Initialisation ────────────────────────────────────────────────────────

export function initAnalytics(): void {
  if (!POSTHOG_ENABLED || !POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Analytics] PostHog disabled — VITE_POSTHOG_ENABLED is not true or key is missing.",
    );
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_HOST,
    capture_pageview: false, // Tracked manually via PageviewTracker (React Router)
    capture_pageleave: true,
    // Autocapture IS on. (The comment here used to read "opt-in only", which
    // described the opposite of the value and predates the UX Signals scan.)
    // Its $rageclick events are what the rage-click detector reads.
    autocapture: true,
    // Clicks on things that look interactive and are not. Off by default in
    // posthog-js, and the dead-click detector has nothing to read without it.
    capture_dead_clicks: true,
    session_recording: {
      maskAllInputs: true, // PII protection — masks all inputs in session recordings
      blockClass: "ph-no-capture", // This class blocks entire section
      maskTextClass: "ph-mask", // This class block text
    },
    persistence: "localStorage",
    respect_dnt: true, // Honour browser "Do Not Track" header
    loaded: ph => {
      if (import.meta.env.DEV) ph.debug();
    },
  });
}

// ─── Event Capture ─────────────────────────────────────────────────────────

export function captureEvent(event: AnalyticsEventName, properties?: Properties): void {
  if (!POSTHOG_ENABLED) return;
  posthog.capture(event, properties);
}

// ─── Pageview ──────────────────────────────────────────────────────────────

export function capturePageview(path: string, title?: string): void {
  if (!POSTHOG_ENABLED) return;
  posthog.capture("$pageview", {
    $current_url: window.location.origin + path,
    page_title: title ?? document.title,
  });
}

// ─── User Identity ─────────────────────────────────────────────────────────

export function identifyUser(userId: string, traits?: Properties): void {
  if (!POSTHOG_ENABLED) return;
  posthog.identify(userId, traits);
}

export function setUserProperties(properties: Properties): void {
  if (!POSTHOG_ENABLED) return;
  posthog.people.set(properties);
}

export function resetUser(): void {
  if (!POSTHOG_ENABLED) return;
  posthog.reset();
}

// ─── Feature Flags ─────────────────────────────────────────────────────────

export function isFeatureEnabled(flag: string): boolean {
  if (!POSTHOG_ENABLED) return false;
  return posthog.isFeatureEnabled(flag) === true;
}
