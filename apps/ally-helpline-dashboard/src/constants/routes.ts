import { SearchIcon, StatsIcon, CommunityIcon, ScribeIcon, LearnIcon } from "@assets/icons";

import { Permissions } from "./permissions";
import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  HEALTH: "/health",
  SUSPENDED_USER: "/suspended-user",

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
  SEARCH: "/search",
  LEARN: "/learn",
  SCENARIO: "/scenario/:scenarioId",
  PATHWAY: "/pathway/:pathwayId",
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

export const navBarOptions = [
  {
    id: TabId.CALLS,
    title: "Sessions",
    Icon: ScribeIcon,
    path: ROUTES.CALLS,
    activePages: [],
    permissions: [
      Permissions.VIEW_CALL_LOGS,
      Permissions.VIEW_CONSOLIDATED_LOGS,
      Permissions.VIEW_SCENARIO_SESSION,
      Permissions.VIEW_ADMIN_SCENARIO_SESSION,
    ],
  },
  {
    id: TabId.ANALYTICS,
    title: "Statistics",
    Icon: StatsIcon,
    path: ROUTES.ANALYTICS,
    activePages: [],
    permissions: [Permissions.VIEW_ANALYTICS_DASHBOARD],
  },
  {
    id: TabId.SEARCH,
    title: "Search",
    Icon: SearchIcon,
    path: ROUTES.SEARCH,
    activePages: [],
    permissions: [Permissions.VIEW_REFERNCE_DOCUMENT],
  },
  {
    id: TabId.LEARN,
    title: "Learn",
    Icon: LearnIcon,
    path: ROUTES.LEARN,
    activePages: [ROUTES.SCENARIO, ROUTES.PATHWAY],
    permissions: [Permissions.EDIT_SCENARIO_SESSION],
  },
  {
    id: TabId.COMMUNITY,
    title: "Community",
    Icon: CommunityIcon,
    path: "https://community.helloally.ai/",
    activePages: [],
    permissions: [Permissions.VIEW_COMMUNITY],
  },
];
