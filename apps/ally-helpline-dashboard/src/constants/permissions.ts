import { TabId } from "./tabs";
import { ROUTES } from "./routes";

export enum Permissions {
  VIEW_NAVBAR_CALLS = "view:navbar:calls",
  VIEW_NAVBAR_CALENDAR = "view:navbar:calendar",
  VIEW_NAVBAR_LEARN = "view:navbar:learn",
  VIEW_NAVBAR_STRESS_BUSTER = "view:navbar:stress-buster",
  VIEW_NAVBAR_SETTINGS = "view:navbar:settings",
  VIEW_NAVBAR_ANALYTICS = "view:navbar:analytics",
  EDIT_SUMMARY = "edit:summary",
}

// Map routes to their required permissions
// Cant change string to ROUTE as Route is not enum
// TODO: If possible, change ROUTE to Enum
export const ROUTE_PERMISSIONS: Record<string, Permissions> = {
  [ROUTES.AUDIO_CALL]: Permissions.VIEW_NAVBAR_CALLS,
  [ROUTES.CALLS]: Permissions.VIEW_NAVBAR_CALLS,
  [ROUTES.CALENDER]: Permissions.VIEW_NAVBAR_CALENDAR,
  [ROUTES.LEARN]: Permissions.VIEW_NAVBAR_LEARN,
  [ROUTES.STRESS_BUSTERS]: Permissions.VIEW_NAVBAR_STRESS_BUSTER,
  [ROUTES.SETTINGS]: Permissions.VIEW_NAVBAR_SETTINGS,
  [ROUTES.ANALYTICS]: Permissions.VIEW_NAVBAR_ANALYTICS,
  [ROUTES.SUMMARY]: Permissions.EDIT_SUMMARY,
} as const;

// Map tabs to their required permissions
export const TAB_PERMISSIONS: Record<TabId, Permissions> = {
  [TabId.CALLS]: Permissions.VIEW_NAVBAR_CALLS,
  [TabId.CALENDER]: Permissions.VIEW_NAVBAR_CALENDAR,
  [TabId.LEARN]: Permissions.VIEW_NAVBAR_LEARN,
  [TabId.STRESS_BUSTERS]: Permissions.VIEW_NAVBAR_STRESS_BUSTER,
  [TabId.SETTINGS]: Permissions.VIEW_NAVBAR_SETTINGS,
  [TabId.ANALYTICS]: Permissions.VIEW_NAVBAR_ANALYTICS,
} as const;
