export const USER_MANAGEMENT_TABS = [
  { id: "basic_information", label: "Basic Information" },
  { id: "settings", label: "Settings" },
];

export const DASHBOARD_TABS = {
  ORG_ANALYTICS: "ORG_ANALYTICS",
  CALL_LOG_ANALYTICS: "CALL_LOG_ANALYTICS",
  SIMULATION_ANALYTICS: "SIMULATION_ANALYTICS",
};

export const USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_1 = [
  {
    id: "",
    label: "Scribe Analytics",
    type: DASHBOARD_TABS.CALL_LOG_ANALYTICS,
  },
  {
    id: "",
    label: "Simulator Analytics",
    type: DASHBOARD_TABS.SIMULATION_ANALYTICS,
  },
  {
    id: "",
    label: "Org.Section Analytics",
    type: DASHBOARD_TABS.ORG_ANALYTICS,
  },
];

export const USER_MANAGEMENT_TAB_SETTINGS_OPTIONS_2 = [
  { id: "enableMicrophoneMode", label: "Microphone Mode" },
  { id: "enableAudioUpload", label: "Upload Call Recording" },
  { id: "hideRankInLeaderboard", label: "Hide Rank in Leaderboard" },
];
