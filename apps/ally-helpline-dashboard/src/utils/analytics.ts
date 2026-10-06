import posthog, { type Properties } from "posthog-js";

import type { AnalyticsEventName } from "@constants/analyticsEvents";

import { isTalkPath } from "../analytics/talkPrivacy";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string;
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED === "true";

/**
 * Which configuration PostHog was started with in this document. "talk" on the
 * anonymous talker page (`/talk/*`, decided from the URL at load time), where a
 * person reaching a helpline must not get a persistent id; "standard"
 * everywhere else; null when PostHog is off.
 */
type AnalyticsMode = "standard" | "talk";
let analyticsMode: AnalyticsMode | null = null;

/** The only events the talker page may send (see ANALYTICS_EVENTS.TALKER_*). */
const TALKER_EVENT_PREFIX = "talker_";

const onTalkPath = () => typeof window !== "undefined" && isTalkPath(window.location.pathname);

/**
 * True when PostHog was started for the signed-in app (persistent id, replay,
 * autocapture). The talker page reloads itself once if it finds this, so it
 * gets a document set up with `talk` mode instead — see talkPrivacy.ts.
 */
export const isAnalyticsPersistent = (): boolean => analyticsMode === "standard";

// ─── Initialisation ────────────────────────────────────────────────────────

/**
 * The talker page's PostHog: an anonymous in-memory id that dies with the tab
 * (no cookie, no localStorage), no session recording, no autocapture, dead
 * clicks, heatmaps, exceptions, page-leave, surveys or remote scripts, no
 * person profile, no referrer or campaign params. Only the explicit
 * `talker_*` events get through (captureEvent), and those carry no content.
 */
const TALK_CONFIG = {
  persistence: "memory",
  disable_session_recording: true,
  autocapture: false,
  capture_dead_clicks: false,
  rageclick: false,
  capture_heatmaps: false,
  capture_exceptions: false,
  capture_pageleave: false,
  capture_performance: false,
  disable_surveys: true,
  disable_product_tours: true,
  disable_web_experiments: true,
  advanced_disable_feature_flags: true,
  disable_external_dependency_loading: true,
  person_profiles: "identified_only",
  save_referrer: false,
  save_campaign_params: false,
} as const;

export function initAnalytics(): void {
  if (!POSTHOG_ENABLED || !POSTHOG_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Analytics] PostHog disabled — VITE_POSTHOG_ENABLED is not true or key is missing.",
    );
    return;
  }

  if (onTalkPath()) {
    analyticsMode = "talk";
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_HOST,
      capture_pageview: false,
      respect_dnt: true,
      ...TALK_CONFIG,
    });
    return;
  }

  analyticsMode = "standard";
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
    // Uncaught errors and unhandled promise rejections, as `$exception`
    // events. Off by default in posthog-js — without it Bug Hunter's planned
    // web-error finder has nothing to read for this app.
    capture_exceptions: true,
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

/**
 * On a `/talk` path only `talker_*` events are sent, and only from a PostHog
 * started in talk mode — a standard instance there (in-app navigation into the
 * talker page, before its reload) sends nothing. This app pushes nothing to
 * GTM's dataLayer, so there is no GTM call to guard here.
 */
export function captureEvent(event: AnalyticsEventName, properties?: Properties): void {
  if (!POSTHOG_ENABLED) return;
  if (onTalkPath() || analyticsMode === "talk") {
    if (analyticsMode !== "talk" || !event.startsWith(TALKER_EVENT_PREFIX)) return;
  }
  posthog.capture(event, properties);
}

// ─── Pageview ──────────────────────────────────────────────────────────────

export function capturePageview(path: string, title?: string): void {
  if (!POSTHOG_ENABLED || onTalkPath() || analyticsMode === "talk") return;
  posthog.capture("$pageview", {
    $current_url: window.location.origin + path,
    page_title: title ?? document.title,
  });
}

// ─── User Identity ─────────────────────────────────────────────────────────

/** Never on the talker page: a signed-in colleague testing it must not be linked to it. */
export function identifyUser(userId: string, traits?: Properties): void {
  if (!POSTHOG_ENABLED || onTalkPath() || analyticsMode === "talk") return;
  posthog.identify(userId, traits);
}

export function setUserProperties(properties: Properties): void {
  if (!POSTHOG_ENABLED || onTalkPath() || analyticsMode === "talk") return;
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
