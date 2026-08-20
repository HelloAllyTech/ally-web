import {
  StatsIcon,
  ScribeIcon,
  ScenarioIcon,
  LearnIcon,
  Leaderboard,
  ReviewNavIcon,
  Badge,
  ManageAccount,
  CharacterLibraryIcon,
} from "@assets";

import { Permissions } from "./permissions";
import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",
  HEALTH: "/health",
  MAGIC_VERIFY: "/auth/verify",
  SUSPENDED_USER: "/suspended-user",
  IMPERSONATE: "/impersonate",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  BLOG: "/blog",
  BLOG_POST: "/blog/:slug",

  // Private Routes
  HOME: "/",
  CALL_LOGS: "/call-logs",
  AUDIO_CALL: "/audio-call",
  SCRIBE_LOGS: "/scribe-logs",
  ROLEPLAY_LOGS: "/roleplay-logs",
  CALENDER: "/calender",
  STRESS_BUSTER: "/stress-buster",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  ORGANIZATION_SETTINGS: "/organization-settings",
  CHARACTER_LIBRARY: "/character-library",
  CHARACTER_LIBRARY_INTERVIEW: "/character-library/interview",
  SUMMARY: "/summary/:chatId",
  SEARCH: "/search",
  LEARN: "/learn",
  SCENARIO: "/scenario/:scenarioId",
  PATHWAY: "/pathway/:pathwayId",
  CASE: "/case/:caseId",
  // Track 2.0 (multi-component learning tracks)
  TRACK: "/track/:trackId",
  TRACK_ITEM: "/track/:trackId/item/:itemId",
  SIMULATION: "/simulation/:id/:scenarioTitle",
  SIMULATION_SUMMARY: "/simulation-summary",
  SIMULATION_SUMMARY_FULL: "/simulation-summary/:sessionId",
  COMMUNITY_LEADERBOARD: "/community",
  REVIEW: "/review",
  ACHIEVEMENTS_VIEW_ALL: "/achievements",
  SIMULATION_REVIEW_DETAILS: "/simulation-review/:reviewId",
  SCRIBE_REVIEW_DETAILS: "/scribe-review/:reviewId",
  ARCHIVES: "/archives",
} as const;

// Route builders for the Track 2.0 parameterised routes (string-only — this
// file must not gain component/icon imports, see @assets mock note below).
export const buildTrackRoute = (trackId: string) => `/track/${trackId}`;
export const buildTrackItemRoute = (trackId: string, itemId: string) =>
  `/track/${trackId}/item/${itemId}`;

export const excludeNavBar = [
  ROUTES.AUDIO_CALL,
  ROUTES.SUMMARY,
  ROUTES.STRESS_BUSTER,
  ROUTES.SIMULATION,
  ROUTES.SIMULATION_SUMMARY_FULL,
  // Full-screen track player (page-turner) hides the nav bar
  ROUTES.TRACK_ITEM,
] as string[];

export const navBarOptions = [
  {
    id: TabId.LEARN,
    title: "Learn",
    key: "nav.tabs.learn",
    Icon: LearnIcon,
    path: ROUTES.LEARN,
    activePages: [ROUTES.SCENARIO, ROUTES.PATHWAY, ROUTES.CASE, ROUTES.TRACK, ROUTES.TRACK_ITEM],
    permissions: [Permissions.EDIT_SCENARIO_SESSION],
  },
  {
    id: TabId.REVIEW,
    title: "Review",
    key: "nav.tabs.review",
    Icon: ReviewNavIcon,
    path: ROUTES.REVIEW,
    activePages: [ROUTES.REVIEW, ROUTES.SIMULATION_REVIEW_DETAILS, ROUTES.SCRIBE_REVIEW_DETAILS],
    permissions: [Permissions.VIEW_SIMULATION_REVIEWS, Permissions.VIEW_SCRIBE_REVIEWS],
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
    id: TabId.SCRIBE_LOGS,
    title: "Scribe Logs",
    key: "nav.tabs.scribeLogs",
    Icon: ScribeIcon,
    path: ROUTES.SCRIBE_LOGS,
    activePages: [ROUTES.ARCHIVES],
    permissions: [Permissions.VIEW_CALL_LOGS, Permissions.VIEW_CONSOLIDATED_LOGS],
  },
  {
    id: TabId.ROLEPLAY_LOGS,
    title: "Roleplay Logs",
    key: "nav.tabs.roleplayLogs",
    Icon: ScenarioIcon,
    path: ROUTES.ROLEPLAY_LOGS,
    activePages: [],
    permissions: [Permissions.VIEW_SCENARIO_SESSION, Permissions.VIEW_ADMIN_SCENARIO_SESSION],
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
    id: TabId.ORGANIZATION_SETTINGS,
    title: "Org. Settings",
    key: "nav.tabs.organizationSettings",
    // Temporary "Testing" pill flagging that this tab is still gated/in-testing.
    tagKey: "nav.tabs.organizationSettingsTag",
    Icon: ManageAccount,
    path: ROUTES.ORGANIZATION_SETTINGS,
    activePages: [],
    // Not permission-gated: visibility is decided by canViewOrganizationSettings
    // (ADMIN role + temporary email allowlist), handled in NavSideBar.
    permissions: [] as Permissions[],
  },
  {
    id: TabId.CHARACTER_LIBRARY,
    title: "Character Library",
    key: "nav.tabs.characterLibrary",
    Icon: CharacterLibraryIcon,
    path: ROUTES.CHARACTER_LIBRARY,
    activePages: [ROUTES.CHARACTER_LIBRARY_INTERVIEW],
    // Not permission-array-gated (same escape hatch as Organization Settings):
    // visibility needs the view:scenario-character permission AND the tenant's
    // CHARACTER_LIBRARY_ENABLED org toggle, so useCanViewCharacterLibrary
    // handles it in NavSideBar instead.
    permissions: [] as Permissions[],
  },
];
