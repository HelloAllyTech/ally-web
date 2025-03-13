import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Private Routes
  HOME: "/",
  LIVE_CALL: "/live-call",
  CALL_LOGS: "/call-logs",
  AUDIO_CALL: "/audio-call",
  CALLS: "/calls",
  CALENDER: "/calender",
  LEARN: "/learn",
  STRESS_BUSTERS: "/stress_busters",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
} as const;

// Type for route paths
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

// Helper to map TabId to Routes
export const TAB_ROUTES: Record<TabId, RoutePath> = {
  [TabId.HOME]: ROUTES.HOME,
  [TabId.LIVE_CALL]: ROUTES.LIVE_CALL,
  [TabId.CALL_LOGS]: ROUTES.CALL_LOGS,
  [TabId.CALLS]: ROUTES.CALLS,
  [TabId.CALENDER]: ROUTES.CALENDER,
  [TabId.LEARN]: ROUTES.LEARN,
  [TabId.STRESS_BUSTERS]: ROUTES.STRESS_BUSTERS,
  [TabId.ANALYTICS]: ROUTES.ANALYTICS,
  [TabId.SETTINGS]: ROUTES.SETTINGS,
} as const;
