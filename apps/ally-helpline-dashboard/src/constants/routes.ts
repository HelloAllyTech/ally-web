import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  
  // Private Routes
  HOME: '/',
  DASHBOARD: '/dashboard',
  LIVE_CALL: '/live-call',
  CALL_LOGS: '/call-logs',
} as const;

// Type for route paths
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Helper to map TabId to Routes
export const TAB_ROUTES: Record<TabId, RoutePath> = {
  [TabId.HOME]: ROUTES.HOME,
  [TabId.DASHBOARD]: ROUTES.DASHBOARD,
  [TabId.LIVE_CALL]: ROUTES.LIVE_CALL,
  [TabId.CALL_LOGS]: ROUTES.CALL_LOGS,
} as const; 