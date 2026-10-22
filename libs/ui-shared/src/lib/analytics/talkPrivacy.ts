/**
 * Third-party measurement on the anonymous talker page (`/talk/*`).
 *
 * A talker reaching out to a helpline must not be followed around the web or
 * recognised on their next visit, so on any `/talk` path:
 *
 * - Google Tag Manager is never loaded. The GTM snippet that vite.config.ts
 *   writes into index.html checks the path first (`buildGtmHeadSnippet`), and
 *   the talker page reloads itself once if it was reached by in-app navigation
 *   from a page that had already loaded GTM (`talkDocumentNeedsReload`).
 * - PostHog runs with in-memory persistence (no cookie, no localStorage id), no
 *   session recording, no autocapture, and sends only the explicit `talker_*`
 *   events — see utils/analytics.ts.
 *
 * Kept free of app imports so utils/analytics.ts can use it without pulling
 * in the @constants barrel.
 */

import { isTalkPath } from "./gtmSnippet";

export { isTalkPath, TALK_PATH_PREFIX } from "./gtmSnippet";

/** True once GTM's loader script is in this document (it never leaves). */
export const isGtmLoaded = (doc: Document = document): boolean =>
  Boolean(doc.querySelector('script[src*="googletagmanager.com"]')) ||
  Boolean(
    (doc.defaultView as (Window & { google_tag_manager?: unknown }) | null)?.google_tag_manager,
  );

/** How this document was loaded: "navigate", "reload", "back_forward" or "prerender". */
const currentNavigationType = (): string | null => {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry?.type ?? null;
  } catch {
    return null;
  }
};

type MarkerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const RELOAD_MARKER_KEY = "allyTalkPrivacyReload";

const sessionStorageOrNull = (): MarkerStorage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Whether the talker page must reload itself to shed measurement that a
 * previous page of this SPA set up: GTM in the document, or PostHog started
 * with persistent storage. A full load of a `/talk` URL sets up neither.
 *
 * Asks at most once per path: a marker records the reload, and the clean load
 * that follows clears it. If the reload didn't clean the document (a browser
 * extension injecting GTM) the marker is still there and we stop, so the
 * talker is never trapped in a reload loop. With storage blocked, a document
 * that is itself the result of a reload is left alone instead.
 */
export const talkDocumentNeedsReload = ({
  pathname,
  posthogPersistent,
  doc = document,
  storage = sessionStorageOrNull(),
  navigationType = currentNavigationType(),
}: {
  pathname: string;
  posthogPersistent: boolean;
  doc?: Document;
  storage?: MarkerStorage | null;
  navigationType?: string | null;
}): boolean => {
  if (!isTalkPath(pathname)) return false;
  const tainted = isGtmLoaded(doc) || posthogPersistent;
  try {
    if (!storage) throw new Error("no storage");
    if (!tainted) {
      storage.removeItem(RELOAD_MARKER_KEY);
      return false;
    }
    if (storage.getItem(RELOAD_MARKER_KEY) === pathname) return false;
    storage.setItem(RELOAD_MARKER_KEY, pathname);
    return true;
  } catch {
    return tainted && navigationType !== "reload";
  }
};
