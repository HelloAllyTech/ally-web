import { Book, Relax } from "@/assets/icons";

import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

import { TabId } from "./tabs";
import { Permissions } from "./permissions";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Private Routes
  HOME: "/",
  CALL_LOGS: "/call-logs",
  AUDIO_CALL: "/audio-call",
  CALLS: "/calls",
  CALENDER: "/calender",
  LEARN: "/learn",
  STRESS_BUSTERS: "/stress_busters",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  SUMMARY: "/summary/:chatId",
  CLIENT: "/client",
  SEARCH: "/search",
} as const;

export const navBarOptions = [
    {
      id: TabId.CALLS,
      title: "Calls",
      Icon: PhoneOutlinedIcon,
      path: ROUTES.CALLS,
      permission: Permissions.VIEW_NAVBAR_CALLS
    },
    {
      id: TabId.CALENDER,
      title: "Calender",
      Icon: DateRangeOutlinedIcon,
      path: ROUTES.CALENDER,
      permission: Permissions.VIEW_NAVBAR_CALENDAR
    },
    {
      id: TabId.LEARN,
      title: "Learn",
      Icon: Book,
      path: ROUTES.LEARN,
      permission: Permissions.VIEW_NAVBAR_LEARN
    },
    {
      id: TabId.STRESS_BUSTERS,
      title: "Stress Busters",
      Icon: Relax,
      path: ROUTES.STRESS_BUSTERS,
      permission: Permissions.VIEW_NAVBAR_STRESS_BUSTER
    },
    {
      id:  TabId.ANALYTICS,
      title: "Analytics",
      Icon: LeaderboardOutlinedIcon,
      path: ROUTES.ANALYTICS,
      permission: Permissions.VIEW_NAVBAR_ANALYTICS
    },
    {
      id:  TabId.COMMUNITY,
      title: "Community",
      Icon: PublicOutlinedIcon,
      path: "https://community.helloally.ai/",
      permission: ""
    },
    {
      id: TabId.SETTINGS,
      title: "Settings",
      Icon: SettingsOutlinedIcon,
      path: ROUTES.SETTINGS,
      permission: Permissions.VIEW_NAVBAR_SETTINGS
    },
    {
      id: TabId.SEARCH,
      title: "Search",
      Icon: SearchOutlinedIcon,
      path: ROUTES.SEARCH,
      permission: ""
    }
  ];
