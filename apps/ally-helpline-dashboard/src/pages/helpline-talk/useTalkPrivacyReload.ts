import { useEffect, useState } from "react";

import { isAnalyticsPersistent } from "@utils/analytics";

import { talkDocumentNeedsReload } from "../../analytics/talkPrivacy";

/**
 * The talker page is meant to be opened as a full page load, which sets up no
 * GTM and an in-memory PostHog (see analytics/talkPrivacy.ts). Reached by
 * in-app navigation from a page that already loaded GTM or a persistent
 * PostHog, it reloads itself once so neither is used here. Returns true while
 * that reload is pending, so nothing talker-facing renders or fetches first.
 */
export const useTalkPrivacyReload = (): boolean => {
  const [mustReload] = useState(() =>
    talkDocumentNeedsReload({
      pathname: window.location.pathname,
      posthogPersistent: isAnalyticsPersistent(),
    }),
  );
  useEffect(() => {
    if (mustReload) window.location.reload();
  }, [mustReload]);
  return mustReload;
};
