import { SearchIcon, StatsIcon, CommunityIcon, ScribeIcon } from "@assets/icons";

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
  SIMULATION_SUMMARY: "/simulation-summary",
} as const;

export const navBarOptions = [
  {
    id: TabId.CALLS,
    title: "Scribe",
    Icon: ScribeIcon,
    path: ROUTES.CALLS,
    permission: Permissions.VIEW_NAVBAR_CALLS,
  },
  {
    id: TabId.ANALYTICS,
    title: "Statistics",
    Icon: StatsIcon,
    path: ROUTES.ANALYTICS,
    permission: Permissions.VIEW_NAVBAR_ANALYTICS,
  },
  {
    id: TabId.SEARCH,
    title: "Search",
    Icon: SearchIcon,
    path: ROUTES.SEARCH,
    // TODO: Add correct permission for Search once BE implementation is done
    permission: Permissions.VIEW_NAVBAR_SEARCH,
  },
  {
    id: TabId.COMMUNITY,
    title: "Community",
    Icon: CommunityIcon,
    path: "https://community.helloally.ai/",
    permission: "",
  },
  // {
  //   id: TabId.LEARN,
  //   title: "Learn",
  //   // TODO: Add correct permission and icon for Learn once available
  //   Icon: CommunityIcon,
  //   path: ROUTES.LEARN,
  //   permission: "",
  // },
];
