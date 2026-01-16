import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { SearchIcon, StatsIcon, ScribeIcon, LearnIcon, Leaderboard, ReviewNavIcon } from "@assets";

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
  LEADERBOARD: "/leaderboard",
  REVIEW: "/review",
  ACHIEVEMENTS_VIEW_ALL: "/achievements-view-all",
  REVIEW_DETAILS: "/review/:reivewId",
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
    id: TabId.LEARN,
    title: "Learn",
    Icon: LearnIcon,
    path: ROUTES.LEARN,
    activePages: [ROUTES.SCENARIO, ROUTES.PATHWAY],
    permissions: [Permissions.EDIT_SCENARIO_SESSION],
  },
  ...(FEATURE_FLAGS_MAP.PEER_REVIEW_FLAG
    ? [
        {
          id: TabId.REVIEW,
          title: "Review",
          Icon: ReviewNavIcon,
          path: ROUTES.REVIEW,
          activePages: [],
          //TODO: Add permission for review
        },
      ]
    : []),
  ...(FEATURE_FLAGS_MAP.LEADERBOARD_FLAG
    ? [
        {
          id: TabId.LEADERBOARD,
          title: "Leaderboard",
          Icon: Leaderboard,
          path: ROUTES.LEADERBOARD,
          activePages: [ROUTES.ACHIEVEMENTS_VIEW_ALL],
          permissions: [Permissions.VIEW_LEADERBOARD],
        },
      ]
    : []),
  {
    id: TabId.REVIEW,
    title: "Review",
    Icon: ScribeIcon,
    path: ROUTES.REVIEW,
    activePages: [ROUTES.REVIEW_DETAILS],
    permissions: [Permissions.VIEW_REVIEW],
  },
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
];
