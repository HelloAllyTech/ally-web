# PostHog Analytics Integration — `ally-helpline-dashboard`

Complete step-by-step guide for wiring PostHog into the Vite + React + Redux app.
All code snippets show the **exact diff** against the current codebase.

---

## Table of Contents

1. [Install the SDK](#step-1-install-the-sdk)
2. [Environment Variables](#step-2-environment-variables)
3. [Expose Env Vars via Constants](#step-3-expose-env-vars-via-constants)
4. [Event Names & Property Keys](#step-4-event-names--property-keys)
5. [Analytics Utility Module](#step-5-analytics-utility-module)
6. [AnalyticsProvider (React Context)](#step-6-analyticsprovider-react-context)
7. [PageviewTracker Component](#step-7-pageviewtracker-component)
8. [Analytics Barrel Export](#step-8-analytics-barrel-export)
9. [useAnalytics Hook](#step-9-useanalytics-hook)
10. [Update Barrel Exports](#step-10-update-barrel-exports)
11. [Wire into `main.tsx`](#step-11-wire-into-maintsx)
12. [Wire into `RouteLayout.tsx`](#step-12-wire-into-routelayouttsx)
13. [Add Analytics Middleware to Redux Store](#step-13-add-analytics-middleware-to-redux-store)
14. [Mock PostHog in Tests](#step-14-mock-posthog-in-tests)
15. [Feature-Level Tracking Examples](#step-15-feature-level-tracking-examples)
16. [Architecture Overview](#step-16-architecture-overview)
17. [Best Practices & Scalability Notes](#step-17-best-practices--scalability-notes)

---

## Step 1 — Install the SDK

Run from the **workspace root** (pnpm monorepo):

```bash
pnpm add --filter ally-helpline-dashboard posthog-js
```

Verify it appears under `dependencies` in
`apps/ally-helpline-dashboard/package.json`.

---

## Step 2 — Environment Variables

### `apps/ally-helpline-dashboard/.env` (local only, never commit)

```env
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_ENABLED=true
```

### `apps/ally-helpline-dashboard/.env.example` (committed)

Add these three lines to the existing file:

```diff
  VITE_API_BASE_URL=https://sample-url.com
  # Optional: LiveKit WebRTC URL (for voice/video rooms)
  VITE_LIVEKIT_URL=wss://your-livekit-url.com
  # Optional: Google OAuth client ID
  VITE_GOOGLE_AUTH_CLIENT_ID=
+
+ # PostHog analytics
+ VITE_POSTHOG_KEY=
+ VITE_POSTHOG_HOST=https://us.i.posthog.com
+ VITE_POSTHOG_ENABLED=true
```

> Get your `VITE_POSTHOG_KEY` from **PostHog → Project Settings → Project API Key**.

---

## Step 3 — Expose Env Vars via Constants

All `import.meta.env` access lives in one file.

### `src/constants/envVariables.ts`

```diff
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

+ export const POSTHOG_KEY     = import.meta.env.VITE_POSTHOG_KEY as string;
+ export const POSTHOG_HOST    = import.meta.env.VITE_POSTHOG_HOST as string;
+ export const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED === "true";

  export { apiBaseUrl };
```

### `src/constants/index.ts`

Add one line at the top:

```diff
+ export * from "./analyticsEvents";
  export * from "./audio-upload";
  // ... rest unchanged
```

---

## Step 4 — Event Names & Property Keys

**Create** `src/constants/analyticsEvents.ts` — the single source of truth for every
PostHog event name and property key. Using constants prevents typos, makes refactoring
safe (one string to change), and serves as living documentation.

Naming convention: `<noun>_<past_tense_verb>`, lowercase with underscores.

```typescript
// src/constants/analyticsEvents.ts

export const ANALYTICS_EVENTS = {
  // Auth
  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
  USER_LOGIN_FAILED: "user_login_failed",

  // Navigation
  PAGE_VIEWED: "page_viewed",

  // Calls
  CALL_STARTED: "call_started",
  CALL_ENDED: "call_ended",
  CALL_FEEDBACK_SUBMITTED: "call_feedback_submitted",

  // Simulation
  SIMULATION_STARTED: "simulation_started",
  SIMULATION_COMPLETED: "simulation_completed",
  SIMULATION_CREDITS_USED: "simulation_credits_used",

  // Audio
  AUDIO_UPLOADED: "audio_uploaded",
  AUDIO_PLAYBACK_STARTED: "audio_playback_started",

  // AI / Enhance
  AI_ENHANCEMENT_TRIGGERED: "ai_enhancement_triggered",
  AI_ENHANCEMENT_COMPLETED: "ai_enhancement_completed",

  // Search
  SEARCH_PERFORMED: "search_performed",
  SEARCH_RESULT_CLICKED: "search_result_clicked",

  // Analytics Page
  ANALYTICS_REPORT_VIEWED: "analytics_report_viewed",
  ANALYTICS_FILTER_APPLIED: "analytics_filter_applied",

  // Settings
  SETTINGS_UPDATED: "settings_updated",

  // Learn
  LEARN_MODULE_OPENED: "learn_module_opened",
  PATHWAY_STARTED: "pathway_started",

  // Errors
  API_ERROR_OCCURRED: "api_error_occurred",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// Shared property keys — prevents key-name drift across callers
export const ANALYTICS_PROPS = {
  USER_ROLE: "user_role",
  USER_ID: "user_id",
  CALL_ID: "call_id",
  CALL_DURATION_SEC: "call_duration_seconds",
  CALL_TYPE: "call_type",
  SIMULATION_ID: "simulation_id",
  SCENARIO_ID: "scenario_id",
  CREDITS_CONSUMED: "credits_consumed",
  PAGE_PATH: "page_path",
  PAGE_TITLE: "page_title",
  SEARCH_QUERY: "search_query",
  RESULT_COUNT: "result_count",
  ERROR_CODE: "error_code",
  ERROR_MESSAGE: "error_message",
  ENDPOINT: "endpoint",
} as const;
```

---

## Step 5 — Analytics Utility Module

**Create** `src/utils/analytics.ts` — a pure, framework-agnostic wrapper over
`posthog-js`. No React in this file. It is the only place that imports `posthog-js`
directly, so the rest of the app never needs to know which analytics vendor is in use.

```typescript
// src/utils/analytics.ts
import posthog, { type Properties } from "posthog-js";

import { POSTHOG_ENABLED, POSTHOG_HOST, POSTHOG_KEY } from "@constants/envVariables";
import type { AnalyticsEventName } from "@constants/analyticsEvents";

// ─── Initialisation ────────────────────────────────────────────────────────

export function initAnalytics(): void {
  if (!POSTHOG_ENABLED || !POSTHOG_KEY) {
    console.warn(
      "[Analytics] PostHog disabled — VITE_POSTHOG_ENABLED is not true or key is missing.",
    );
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // Tracked manually via PageviewTracker (React Router)
    capture_pageleave: true,
    autocapture: false, // Opt-in only — reduces noise, prevents accidental PII capture
    session_recording: {
      maskAllInputs: true, // PII protection — masks all inputs in session recordings
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
```

### `src/utils/index.ts`

```diff
+ export * from "./analytics";
  export * from "./common";
  // ... rest unchanged
```

---

## Step 6 — AnalyticsProvider (React Context)

**Create** `src/analytics/AnalyticsProvider.tsx`.

This provider:

- Gives the component tree typed access to analytics without prop-drilling
- Automatically calls `posthog.identify` when the user logs in (by watching Redux state)
- Automatically calls `posthog.reset` when the user logs out

```typescript
// src/analytics/AnalyticsProvider.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useSelector } from "react-redux";
import type { Properties } from "posthog-js";

import { ANALYTICS_PROPS, type AnalyticsEventName } from "@constants/analyticsEvents";
import type { RootState } from "@store";
import {
  captureEvent,
  capturePageview,
  identifyUser,
  isFeatureEnabled,
  resetUser,
} from "@utils/analytics";

// ─── Context shape ─────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  capture:          (event: AnalyticsEventName, props?: Properties) => void;
  capturePageview:  (path: string, title?: string) => void;
  isFeatureEnabled: (flag: string) => boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const user            = useSelector((s: RootState) => s.user.user);
  const isAuthenticated = useSelector((s: RootState) => s.user.isAuthenticated);

  // Sync PostHog identity with Redux auth state automatically
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyUser(String(user.id), {
        [ANALYTICS_PROPS.USER_ROLE]: user.role ?? "unknown",
        email: user.email,
        name:  user.name,
      });
    } else if (!isAuthenticated) {
      resetUser(); // Clear PostHog identity when user logs out
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

  const isFeatureEnabledCb = useCallback(
    (flag: string) => isFeatureEnabled(flag),
    [],
  );

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      capture,
      capturePageview:  capturePageviewCb,
      isFeatureEnabled: isFeatureEnabledCb,
    }),
    [capture, capturePageviewCb, isFeatureEnabledCb],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ─── Internal accessor (used only by useAnalytics) ─────────────────────────

export function useAnalyticsContext(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalyticsContext must be used within <AnalyticsProvider>");
  }
  return ctx;
}
```

> **Why inside `<Provider>`?** `AnalyticsProvider` reads from Redux (`s.user.isAuthenticated`,
> `s.user.user`). It must be placed _inside_ `<Provider store={store}>` in `main.tsx`.

---

## Step 7 — PageviewTracker Component

**Create** `src/analytics/PageviewTracker.tsx`.

React Router v6 does not fire native browser navigation events, so PostHog's built-in
`capture_pageview: false` is set (see Step 5). This render-nothing component fires
`$pageview` on every route change instead.

```typescript
// src/analytics/PageviewTracker.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useAnalytics } from "@hooks/useAnalytics";

/**
 * Fires a $pageview PostHog event on every React Router v6 route transition.
 * Renders nothing — mount it as a direct child of <BrowserRouter>.
 */
export function PageviewTracker() {
  const location = useLocation();
  const { capturePageview } = useAnalytics();

  useEffect(() => {
    capturePageview(location.pathname + location.search);
  }, [location.pathname, location.search, capturePageview]);

  return null;
}
```

---

## Step 8 — Analytics Barrel Export

**Create** `src/analytics/index.ts`:

```typescript
// src/analytics/index.ts
export { AnalyticsProvider, useAnalyticsContext } from "./AnalyticsProvider";
export { PageviewTracker } from "./PageviewTracker";
```

---

## Step 9 — `useAnalytics` Hook

**Create** `src/hooks/useAnalytics.ts`.

The one hook all feature components use. Components never import `posthog-js` or
`AnalyticsContext` directly — they only use this hook.

Key feature: **auto-injects `user_role` into every event** so no call site needs to
repeat it.

```typescript
// src/hooks/useAnalytics.ts
import { useCallback } from "react";
import { useSelector } from "react-redux";
import type { Properties } from "posthog-js";

import {
  ANALYTICS_EVENTS,
  ANALYTICS_PROPS,
  type AnalyticsEventName,
} from "@constants/analyticsEvents";
import type { RootState } from "@store";
import { useAnalyticsContext } from "../analytics/AnalyticsProvider";

/**
 * Primary analytics hook for feature components.
 *
 * - Never import posthog-js in components — use this hook instead
 * - Automatically injects user_role into every tracked event
 * - Provides typed convenience wrappers for common flows
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
```

---

## Step 10 — Update Barrel Exports

### `src/hooks/index.ts`

```diff
+ export * from "./useAnalytics";
  export * from "./useClickOutside";
  export * from "./useSocket";
  // ... rest unchanged
```

---

## Step 11 — Wire into `main.tsx`

Two changes:

1. Call `initAnalytics()` **before** `createRoot` — one-time PostHog initialisation
2. Wrap `<App>` in `<AnalyticsProvider>` — must be inside `<Provider store={store}>`
   but can go anywhere else in the tree

```diff
  import { Suspense } from "react";
  import { StyledEngineProvider } from "@mui/material/styles";
  import { LocalizationProvider } from "@mui/x-date-pickers";
  import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
  import { GoogleOAuthProvider } from "@react-oauth/google";
  import { createRoot } from "react-dom/client";
  import { I18nextProvider } from "react-i18next";
  import { Provider } from "react-redux";
  import { PersistGate } from "redux-persist/integration/react";

  import "./index.css";
  import App from "./App.tsx";
+ import { AnalyticsProvider } from "./analytics";
  import i18n from "./i18n";
  import { store, persistor } from "./store";
+ import { initAnalytics } from "@utils/analytics";

  const GOOGLE_AUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID || "";

+ // Initialise PostHog before the React tree mounts
+ initAnalytics();

  createRoot(document.getElementById("root")!).render(
    <StyledEngineProvider injectFirst>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <GoogleOAuthProvider clientId={GOOGLE_AUTH_CLIENT_ID}>
              <I18nextProvider i18n={i18n}>
+               {/* AnalyticsProvider must be inside <Provider> to read Redux auth state */}
+               <AnalyticsProvider>
                  <Suspense fallback={null}>
                    <App />
                  </Suspense>
+               </AnalyticsProvider>
              </I18nextProvider>
            </GoogleOAuthProvider>
          </LocalizationProvider>
        </PersistGate>
      </Provider>
    </StyledEngineProvider>,
  );
```

---

## Step 12 — Wire into `RouteLayout.tsx`

Add `<PageviewTracker />` as a direct child of `<BrowserRouter>`.
It must be inside the router so it can call `useLocation()`.

```diff
  import { Route, Routes, BrowserRouter } from "react-router-dom";
  import { ROUTES } from "@constants";
  import {
    Health, Login, Learn, MagicLinkVerify, Scenario, CaseTrackDetails, SuspendedUser,
  } from "@pages";
+ import { PageviewTracker } from "../analytics";
  import HybridRouteLayout from "./HybridRouteLayout";
  import PrivateRouteLayout from "./PrivateRouteLayout";
  import PublicLayout from "./PublicRouteLayout";

  const RouteLayout = () => {
    return (
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
+       {/* Fires $pageview to PostHog on every route transition */}
+       <PageviewTracker />
        <Routes>
          {/* ... all existing routes unchanged ... */}
        </Routes>
      </BrowserRouter>
    );
  };
```

---

## Step 13 — Add Analytics Middleware to Redux Store

Adding a middleware to `store/index.ts` captures every failed RTK Query request as
an `api_error_occurred` event automatically — no per-component try/catch needed.

```diff
- import { configureStore } from "@reduxjs/toolkit";
+ import { configureStore, isRejectedWithValue } from "@reduxjs/toolkit";
  import { persistStore, persistReducer } from "redux-persist";
  import storage from "redux-persist/lib/storage";

  import { baseAPI } from "@api/baseAPI";
+ import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
  import callsSlice from "@reducer/callsReducer";
  import chatHistorySlice from "@reducer/chatHistoryReducer";
  import chatStreamSlice from "@reducer/chatStreamReducer";
  import userSlice from "@reducer/userReducer";
+ import { captureEvent } from "@utils/analytics";

+ // Centralises API error tracking — fires once per failed RTK Query request
+ const analyticsMiddleware =
+   () =>
+   (next: (action: unknown) => unknown) =>
+   (action: unknown) => {
+     if (isRejectedWithValue(action)) {
+       const rejected = action as {
+         payload?: { status?: number; data?: { message?: string } };
+         meta?: { arg?: { endpointName?: string } };
+       };
+       captureEvent(ANALYTICS_EVENTS.API_ERROR_OCCURRED, {
+         [ANALYTICS_PROPS.ERROR_CODE]:    rejected.payload?.status,
+         [ANALYTICS_PROPS.ERROR_MESSAGE]: rejected.payload?.data?.message ?? "Unknown error",
+         [ANALYTICS_PROPS.ENDPOINT]:      rejected.meta?.arg?.endpointName,
+       });
+     }
+     return next(action);
+   };

  // ... persist config unchanged ...

  export const store = configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
      user:        persistedUserReducer,
      calls:       callsSlice.reducer,
      chatHistory: chatHistorySlice.reducer,
      chatStream:  chatStreamSlice.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
-     }).concat(baseAPI.middleware),
+     }).concat(baseAPI.middleware).concat(analyticsMiddleware),
  });
```

---

## Step 14 — Mock PostHog in Tests

The app uses Vitest. Add a global `posthog-js` mock to `src/test-setup.ts` so no test
accidentally sends real events, and PostHog calls can be asserted with `vi.fn()`.

```diff
  import "@testing-library/jest-dom";
  import { beforeAll, expect, vi } from "vitest";
  import path from "path";
  import i18n from "./i18n";

+ // Mock posthog-js globally — no network calls in tests, all methods are spies
+ vi.mock("posthog-js", () => ({
+   default: {
+     init:             vi.fn(),
+     capture:          vi.fn(),
+     identify:         vi.fn(),
+     reset:            vi.fn(),
+     group:            vi.fn(),
+     isFeatureEnabled: vi.fn(() => false),
+     people:           { set: vi.fn() },
+     debug:            vi.fn(),
+   },
+ }));

  // ... rest of test-setup.ts unchanged ...
```

### Writing tests

```typescript
// src/hooks/__tests__/useAnalytics.test.ts
import { renderHook, act } from "@testing-library/react";
import posthog from "posthog-js";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useAnalytics } from "../useAnalytics";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

describe("useAnalytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires capture with user_role injected automatically", () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createTestWrapper({ userRole: "COUNSELOR" }),
    });

    act(() => {
      result.current.track(ANALYTICS_EVENTS.CALL_STARTED, {
        [ANALYTICS_PROPS.CALL_ID]: "call-123",
      });
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "call_started",
      expect.objectContaining({
        call_id: "call-123",
        user_role: "COUNSELOR",
      }),
    );
  });

  it("trackLogin fires user_logged_in with auth_method", () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: createTestWrapper(),
    });

    act(() => result.current.trackLogin("google"));

    expect(posthog.capture).toHaveBeenCalledWith(
      "user_logged_in",
      expect.objectContaining({ auth_method: "google" }),
    );
  });
});
```

```typescript
// src/analytics/__tests__/PageviewTracker.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import posthog from "posthog-js";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { PageviewTracker } from "../PageviewTracker";

describe("PageviewTracker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires $pageview on initial render", () => {
    render(
      <MemoryRouter initialEntries={["/calls"]}>
        <PageviewTracker />
      </MemoryRouter>,
      { wrapper: createTestWrapper() },
    );

    expect(posthog.capture).toHaveBeenCalledWith(
      "$pageview",
      expect.objectContaining({
        $current_url: expect.stringContaining("/calls"),
      }),
    );
  });

  it("fires $pageview again when route changes", async () => {
    render(
      <MemoryRouter initialEntries={["/calls"]}>
        <PageviewTracker />
        <Routes>
          <Route path="/calls"  element={<Link to="/search">Go</Link>} />
          <Route path="/search" element={<span>Search</span>} />
        </Routes>
      </MemoryRouter>,
      { wrapper: createTestWrapper() },
    );

    await userEvent.click(screen.getByText("Go"));

    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenLastCalledWith(
      "$pageview",
      expect.objectContaining({
        $current_url: expect.stringContaining("/search"),
      }),
    );
  });
});
```

---

## Step 15 — Feature-Level Tracking Examples

### Auth — track login method

```typescript
// src/pages/auth/Login.tsx  (add to existing submit handler)
import { useAnalytics } from "@hooks";

const { trackLogin } = useAnalytics();

const handleOtpSuccess = () => {
  trackLogin("otp");
  // existing navigation logic
};

const handleGoogleSuccess = () => {
  trackLogin("google");
};

const handleMagicLinkSuccess = () => {
  trackLogin("magic_link");
};
```

### Calls — track start & end with duration

```typescript
// src/pages/audio-call/AudioCallPage.tsx
import { useRef } from "react";
import { useAnalytics } from "@hooks";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

const { track } = useAnalytics();
const callStartTime = useRef<number | null>(null);

const handleCallStart = (callId: string, callType: string) => {
  callStartTime.current = Date.now();
  track(ANALYTICS_EVENTS.CALL_STARTED, {
    [ANALYTICS_PROPS.CALL_ID]: callId,
    [ANALYTICS_PROPS.CALL_TYPE]: callType,
  });
};

const handleCallEnd = (callId: string) => {
  const durationSec = callStartTime.current
    ? Math.round((Date.now() - callStartTime.current) / 1000)
    : undefined;

  track(ANALYTICS_EVENTS.CALL_ENDED, {
    [ANALYTICS_PROPS.CALL_ID]: callId,
    [ANALYTICS_PROPS.CALL_DURATION_SEC]: durationSec,
  });
};
```

### Simulation — track start inside `useStartSimulation`

```typescript
// src/hooks/useStartSimulation.ts  (add to existing hook)
import { useAnalytics } from "./useAnalytics";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

const { track } = useAnalytics();

const startSimulation = async (scenarioId: string) => {
  track(ANALYTICS_EVENTS.SIMULATION_STARTED, {
    [ANALYTICS_PROPS.SCENARIO_ID]: scenarioId,
  });
  // existing simulation logic unchanged
};
```

### Search — debounced query tracking

Reuse the existing `useDebounce` hook so rapid keystrokes don't spam PostHog:

```typescript
// src/pages/search/SearchPage.tsx
import { useEffect, useState } from "react";
import { useAnalytics, useDebounce } from "@hooks";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";

const { track } = useAnalytics();
const [query, setQuery] = useState("");
const debouncedQuery = useDebounce(query, 500);

useEffect(() => {
  if (!debouncedQuery) return;
  track(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
    [ANALYTICS_PROPS.SEARCH_QUERY]: debouncedQuery,
  });
}, [debouncedQuery, track]);
```

### Analytics page — filter interactions

```typescript
// src/pages/analytics/AnalyticsPage.tsx
import { useAnalytics } from "@hooks";
import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";

const { track } = useAnalytics();

const handleFilterChange = (filterName: string, filterValue: string) => {
  track(ANALYTICS_EVENTS.ANALYTICS_FILTER_APPLIED, {
    filter_name: filterName,
    filter_value: filterValue,
  });
};
```

### AI Enhancement — track trigger & completion

```typescript
// src/hooks/useEnhance.tsx  (add to existing hook)
import { useAnalytics } from "./useAnalytics";
import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";

const { track } = useAnalytics();

const triggerEnhancement = async (type: string) => {
  track(ANALYTICS_EVENTS.AI_ENHANCEMENT_TRIGGERED, { enhancement_type: type });
  // existing logic
  track(ANALYTICS_EVENTS.AI_ENHANCEMENT_COMPLETED, { enhancement_type: type });
};
```

---

## Step 16 — Architecture Overview

```
main.tsx
 ├── initAnalytics()                  ← Step 5: one-time posthog.init()
 └── <AnalyticsProvider>              ← Step 6: context + Redux identity sync
      └── <App>
           └── <RouteLayout>
                └── <BrowserRouter>
                     ├── <PageviewTracker />   ← Step 7: $pageview on every route
                     └── pages / components
                          └── useAnalytics()   ← Step 9: consumed in features
                               ├── track(event, props)
                               ├── capturePageview()
                               └── isFeatureEnabled()

src/
├── analytics/
│   ├── AnalyticsProvider.tsx    ← React context + identity lifecycle
│   ├── PageviewTracker.tsx      ← route-change $pageview
│   └── index.ts                 ← barrel
├── constants/
│   └── analyticsEvents.ts       ← ALL event names + property keys
├── utils/
│   └── analytics.ts             ← posthog-js wrapper (no React)
├── hooks/
│   └── useAnalytics.ts          ← the ONE hook for all components
└── store/
    └── index.ts                 ← analyticsMiddleware for API errors
```

**Data flow:**

```
component calls track()
  → useAnalytics injects user_role
    → AnalyticsProvider.capture()
      → captureEvent() in utils/analytics.ts
        → posthog.capture()
          → PostHog Cloud
```

---

## Step 17 — Best Practices & Scalability Notes

| Practice                                    | Rationale                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Single `initAnalytics()` in `main.tsx`      | Prevents double-initialisation across HMR reloads or multiple renders                   |
| `capture_pageview: false`                   | React Router v6 controls navigation; native browser events fire incorrectly in SPAs     |
| `autocapture: false`                        | Opt-in only — reduces PostHog noise and prevents accidental PII capture from DOM clicks |
| `maskAllInputs: true` in session recording  | Counsellor and caller data is sensitive — mask everything, unmask explicitly if needed  |
| Constants for every event name              | Typo-safe and refactor-safe — one string change propagates everywhere                   |
| `analyticsMiddleware` in Redux store        | Centralises API error tracking — no per-component try/catch or error boundaries needed  |
| `useAnalytics` auto-injects `user_role`     | Every event enriched automatically — no repetition at individual call sites             |
| `respect_dnt: true`                         | Automatically opts out users whose browser sends the Do Not Track header                |
| Debounce search events                      | Reuses existing `useDebounce` hook — avoids bursting PostHog quota during typing        |
| Global `posthog-js` mock in `test-setup.ts` | All tests stay network-free; no accidental data sent from CI pipelines                  |

### Adding a new event — checklist

1. Add the name to `ANALYTICS_EVENTS` in `src/constants/analyticsEvents.ts`
2. Add any new property keys to `ANALYTICS_PROPS` (same file)
3. Call `track(ANALYTICS_EVENTS.YOUR_EVENT, { ... })` in the component or hook
4. Write a test: assert `posthog.capture` was called with the right event name and properties
5. Done — no other files need to change

---
