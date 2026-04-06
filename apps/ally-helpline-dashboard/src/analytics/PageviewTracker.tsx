import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import { useAnalytics } from "@hooks/useAnalytics";

/**
 * Fires a $pageview PostHog event on every React Router v6 route transition.
 * Renders nothing — mount as a direct child of <BrowserRouter> in RouteLayout.
 *
 * Why: React Router v6 does not fire native browser navigation events, so
 * PostHog's built-in capture_pageview is disabled and we track manually here.
 */
export function PageviewTracker() {
  const location = useLocation();
  const { capturePageview } = useAnalytics();

  useEffect(() => {
    capturePageview(location.pathname + location.search);
  }, [location.pathname, location.search, capturePageview]);

  return null;
}
