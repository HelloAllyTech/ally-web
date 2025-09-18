import { SearchIcon, StatsIcon, CommunityIcon, ScribeIcon, LearnIcon } from "@assets/icons";

import { Permissions } from "./permissions";
import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  HEALTH: "/health",

  // Private Routes
  HOME: "/",
  CALL_LOGS: "/call-logs",
  AUDIO_CALL: "/audio-call",
  CALLS: "/calls",
  CALENDER: "/calender",
  STRESS_BUSTER: "/stress-buster",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  SUMMARY: "/summary/:chatId",
  CLIENT: "/client",
  SEARCH: "/search",
  LEARN: "/learn",
  SCENARIO: "/scenario/:scenarioId",
  SIMULATION: "/simulation/:id",
  SIMULATION_SUMMARY: "/simulation-summary",
  SIMULATION_SUMMARY_FULL: "/simulation-summary/:sessionId",
} as const;

export const excludeNavBar = [
  ROUTES.AUDIO_CALL,
  ROUTES.SUMMARY,
  ROUTES.STRESS_BUSTER,
  ROUTES.SIMULATION,
  ROUTES.SIMULATION_SUMMARY_FULL,
] as string[];

export const excludeCallPicker = [
  ROUTES.AUDIO_CALL,
  ROUTES.SUMMARY,
  ROUTES.STRESS_BUSTER,
  ROUTES.SIMULATION,
  ROUTES.SIMULATION_SUMMARY,
] as string[];

export const navBarOptions = [
  {
    id: TabId.CALLS,
    title: "Scribe",
    Icon: ScribeIcon,
    path: ROUTES.CALLS,
    permissions: [
      Permissions.VIEW_NAVBAR_CALLS,
      Permissions.VIEW_SCENARIO_SESSION,
      Permissions.VIEW_ADMIN_SCENARIO_SESSION,
    ],
  },
  {
    id: TabId.ANALYTICS,
    title: "Statistics",
    Icon: StatsIcon,
    path: ROUTES.ANALYTICS,
    permissions: [Permissions.VIEW_NAVBAR_ANALYTICS],
  },
  {
    id: TabId.SEARCH,
    title: "Search",
    Icon: SearchIcon,
    path: ROUTES.SEARCH,
    // TODO: Add correct permission for Search once BE implementation is done
    permissions: [Permissions.VIEW_NAVBAR_CALLS],
  },
  {
    id: TabId.LEARN,
    title: "Learn",
    Icon: LearnIcon,
    path: ROUTES.LEARN,
    permissions: [Permissions.VIEW_NAVBAR_LEARN],
  },
  {
    id: TabId.COMMUNITY,
    title: "Community",
    Icon: CommunityIcon,
    path: "https://community.helloally.ai/",
    permissions: [Permissions.VIEW_NAVBAR_COMMUNITY],
  },
];
