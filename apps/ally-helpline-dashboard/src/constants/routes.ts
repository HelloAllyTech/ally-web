import { Book, Relax } from "@/assets/icons";

import { TabId } from "./tabs";

export const ROUTES = {
  // Public Routes
  LOGIN: "/login",
  SIGNUP: "/signup",

  // Private Routes
  HOME: "/",
  LIVE_CALL: "/live-call",
  CALL_LOGS: "/call-logs",
  AUDIO_CALL: "/audio-call",
  CALLS: "/calls",
  CALENDER: "/calender",
  LEARN: "/learn",
  STRESS_BUSTERS: "/stress_busters",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  SUMMARY: "/summary",
} as const;

import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

export const navBarOptions = [
    {
      id: TabId.CALLS,
      title: "Calls",
      Icon: PhoneOutlinedIcon,
      path: ROUTES.CALLS,
      
    },
    {
      id: TabId.CALENDER,
      title: "Calender",
      Icon: DateRangeOutlinedIcon,
      path: ROUTES.CALENDER
    },
    {
      id: TabId.LEARN,
      title: "Learn",
      Icon: Book,
      path: ROUTES.LEARN
    },
    {
      id: TabId.STRESS_BUSTERS,
      title: "Stress Busters",
      Icon: Relax,
      path: ROUTES.STRESS_BUSTERS
    },
    {
      id:  TabId.ANALYTICS,
      title: "Analytics",
      Icon: LeaderboardOutlinedIcon,
      path: ROUTES.ANALYTICS
    },
    {
      id: TabId.SETTINGS,
      title: "Settings",
      Icon: SettingsOutlinedIcon,
      path: ROUTES.SETTINGS
    },
  ];
