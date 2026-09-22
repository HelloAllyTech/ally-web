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

  // ui not available yet
  const trackUpgradePromptShown = useCallback(
    (props: { orgId?: string; triggerSource: string; currentPlan?: string }) => {
      track(ANALYTICS_EVENTS.UPGRADE_PROMPT_SHOWN, {
        [ANALYTICS_PROPS.ORG_ID]: props.orgId,
        [ANALYTICS_PROPS.TRIGGER_SOURCE]: props.triggerSource,
        [ANALYTICS_PROPS.CURRENT_PLAN]: props.currentPlan,
      });
    },
    [track],
  );

  // ui not available yet
  const trackUpgradeClicked = useCallback(
    (props: { orgId?: string; currentPlan?: string; targetPlan?: string }) => {
      track(ANALYTICS_EVENTS.UPGRADE_CLICKED, {
        [ANALYTICS_PROPS.ORG_ID]: props.orgId,
        [ANALYTICS_PROPS.CURRENT_PLAN]: props.currentPlan,
        [ANALYTICS_PROPS.TARGET_PLAN]: props.targetPlan,
      });
    },
    [track],
  );

  return {
    track,
    trackLogin,
    trackLogout,
    trackUpgradePromptShown,
    trackUpgradeClicked,
    capturePageview,
    isFeatureEnabled,
  };
}
