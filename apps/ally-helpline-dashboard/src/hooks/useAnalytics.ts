import { useCallback } from "react";

import { useSelector } from "react-redux";

import {
  ANALYTICS_EVENTS,
  ANALYTICS_PROPS,
  type AnalyticsEventName,
} from "@constants/analyticsEvents";
import type { RootState } from "@store";

import { useAnalyticsContext } from "../analytics/AnalyticsProvider";

import type { Properties } from "posthog-js";

/**
 * Primary analytics hook for feature components.
 *
 * - Never import posthog-js in components — use this hook instead
 * - Automatically injects user_role into every tracked event
 * - Provides typed convenience wrappers for common auth flows
 */
export function useAnalytics() {
  const { capture, capturePageview, isFeatureEnabled } = useAnalyticsContext();
  const userRole = useSelector((s: RootState) => s.user.user?.role);

  const track = useCallback(
    (event: AnalyticsEventName, properties?: Properties) => {
      capture(event, {
        [ANALYTICS_PROPS.USER_ROLE]: userRole ?? "unknown",
        ...properties,
      });
    },
    [capture, userRole],
  );

  const trackLogin = useCallback(
    (method: "otp" | "password" | "google" | "magic_link" = "otp") => {
      track(ANALYTICS_EVENTS.USER_LOGGED_IN, { auth_method: method });
    },
    [track],
  );

  const trackLogout = useCallback(() => {
    track(ANALYTICS_EVENTS.USER_LOGGED_OUT);
  }, [track]);

  return {
    track,
    trackLogin,
    trackLogout,
    capturePageview,
    isFeatureEnabled,
  };
}
