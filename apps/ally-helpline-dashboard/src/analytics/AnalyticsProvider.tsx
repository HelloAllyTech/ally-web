import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

import { useSelector } from "react-redux";

import { ANALYTICS_PROPS, type AnalyticsEventName } from "@constants/analyticsEvents";
import type { RootState } from "@store";
import {
  captureEvent,
  capturePageview,
  identifyUser,
  isFeatureEnabled,
  resetUser,
} from "@utils/analytics";

import type { Properties } from "posthog-js";

// ─── Context shape ─────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  capture: (event: AnalyticsEventName, props?: Properties) => void;
  capturePageview: (path: string, title?: string) => void;
  isFeatureEnabled: (flag: string) => boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const user = useSelector((s: RootState) => s.user.user);
  const isAuthenticated = useSelector((s: RootState) => s.user.isAuthenticated);

  // Sync PostHog identity with Redux auth state automatically
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyUser(String(user.id), {
        [ANALYTICS_PROPS.USER_ROLE]: user.role ?? "unknown",
        email: user.email,
        name: user.name,
      });
    } else if (!isAuthenticated) {
      // Clear PostHog identity when user logs out
      resetUser();
    }
  }, [isAuthenticated, user]);

  const capture = useCallback(
    (event: AnalyticsEventName, props?: Properties) => captureEvent(event, props),
    [],
  );

  const capturePageviewCb = useCallback(
    (path: string, title?: string) => capturePageview(path, title),
    [],
  );

  const isFeatureEnabledCb = useCallback((flag: string) => isFeatureEnabled(flag), []);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      capture,
      capturePageview: capturePageviewCb,
      isFeatureEnabled: isFeatureEnabledCb,
    }),
    [capture, capturePageviewCb, isFeatureEnabledCb],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

// ─── Internal accessor (used only by useAnalytics) ─────────────────────────

export function useAnalyticsContext(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalyticsContext must be used within <AnalyticsProvider>");
  }
  return ctx;
}
