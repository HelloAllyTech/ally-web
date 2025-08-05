import { SearchIcon, LogsIcon, StatsIcon, CommunityIcon, StartSessionIcon } from "@/assets/icons";

import { TabId } from "./tabs";
import { CallType } from "./call";
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
    // TODO: Add correct permission for Start Session once BE implementation is done
    permission: Permissions.VIEW_NAVBAR_SEARCH,
    relatedChatType: CallType.MICROPHONE_CHAT,
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
];
