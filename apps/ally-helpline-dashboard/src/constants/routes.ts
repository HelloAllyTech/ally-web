import {
  SearchIcon,
  StatsIcon,
  ScribeIcon,
  LearnIcon,
  Leaderboard,
  ReviewNavIcon,
  Badge,
} from "@assets";

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
  CASE: "/case/:caseId",
  SIMULATION: "/simulation/:id",
  SIMULATION_SUMMARY: "/simulation-summary",
  SIMULATION_SUMMARY_FULL: "/simulation-summary/:sessionId",
  COMMUNITY_LEADERBOARD: "/community",
  REVIEW: "/review",
  ACHIEVEMENTS_VIEW_ALL: "/achievements",
  REVIEW_DETAILS: "/review/:reviewId",
  ARCHIVES: "/archives",
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
    key: "nav.tabs.learn",
    Icon: LearnIcon,
    path: ROUTES.LEARN,
    activePages: [ROUTES.SCENARIO, ROUTES.PATHWAY, ROUTES.CASE],
    permissions: [Permissions.EDIT_SCENARIO_SESSION],
  },
  {
    id: TabId.REVIEW,
    title: "Review",
    key: "nav.tabs.review",
    Icon: ReviewNavIcon,
    path: ROUTES.REVIEW,
    activePages: [ROUTES.REVIEW_DETAILS],
    permissions: [Permissions.REVIEWER_ACCESS],
  },
  {
    id: TabId.BADGES,
    title: "Badges",
    key: "nav.tabs.badges",
    Icon: Badge,
    path: ROUTES.ACHIEVEMENTS_VIEW_ALL,
    activePages: [],
    permissions: [Permissions.VIEW_BADGES],
  },
  {
    id: TabId.LEADERBOARD,
    title: "Community",
    key: "nav.tabs.community",
    Icon: Leaderboard,
    path: ROUTES.COMMUNITY_LEADERBOARD,
    activePages: [ROUTES.ACHIEVEMENTS_VIEW_ALL],
    permissions: [Permissions.VIEW_LEADERBOARD],
  },
  {
    id: TabId.CALLS,
    title: "Sessions",
    key: "nav.tabs.sessions",
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
    key: "nav.tabs.statistics",
    Icon: StatsIcon,
    path: ROUTES.ANALYTICS,
    activePages: [],
    permissions: [Permissions.VIEW_ANALYTICS_DASHBOARD],
  },
  {
    id: TabId.SEARCH,
    title: "Search",
    key: "nav.tabs.search",
    Icon: SearchIcon,
    path: ROUTES.SEARCH,
    activePages: [],
    permissions: [Permissions.VIEW_REFERNCE_DOCUMENT],
  },
];
