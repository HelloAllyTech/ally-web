import { SearchIcon, LogsIcon, StatsIcon, CommunityIcon, StartSessionIcon } from "@/assets/icons";

import { TabId } from "./tabs";
import { Permissions } from "./permissions";

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
  STRESS_BUSTERS: "/stress_busters",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  SUMMARY: "/summary/:chatId",
  CLIENT: "/client",
  SEARCH: "/search",
  START_SESSION: "/start-session",
} as const;

export const navBarOptions = [
  {
    id: TabId.START_SESSION,
    title: "Start Session",
    Icon: StartSessionIcon,
    path: ROUTES.START_SESSION,
    permission: Permissions.VIEW_NAVBAR_SEARCH,
  },
  {
    id: TabId.CALLS,
    title: "Logs",
    Icon: LogsIcon,
    path: ROUTES.CALLS,
    permission: Permissions.VIEW_NAVBAR_CALLS,
  },
  {
    id: TabId.ANALYTICS,
    title: "Stats",
    Icon: StatsIcon,
    path: ROUTES.ANALYTICS,
    permission: Permissions.VIEW_NAVBAR_ANALYTICS,
  },
  // {
  //   id: TabId.CALENDER,
  //   title: "Calender",
  //   Icon: DateRangeOutlinedIcon,
  //   path: ROUTES.CALENDER,
  //   permission: Permissions.VIEW_NAVBAR_CALENDAR
  // },
  // {
  //   id: TabId.LEARN,
  //   title: "Learn",
  //   Icon: SearchIcon,
  //   path: ROUTES.LEARN,
  //   permission: Permissions.VIEW_NAVBAR_LEARN
  // },
  // {
  //   id: TabId.STRESS_BUSTERS,
  //   title: "Stress Busters",
  //   Icon: SearchIcon,
  //   path: ROUTES.STRESS_BUSTERS,
  //   permission: Permissions.VIEW_NAVBAR_STRESS_BUSTER
  // },
  {
    id: TabId.SEARCH,
    title: "Search",
    Icon: SearchIcon,
    path: ROUTES.SEARCH,
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
  //   id: TabId.SETTINGS,
  //   title: "Settings",
  //   Icon: SettingsOutlinedIcon,
  //   path: ROUTES.SETTINGS,
  //   permission: Permissions.VIEW_NAVBAR_SETTINGS
  // },
];
