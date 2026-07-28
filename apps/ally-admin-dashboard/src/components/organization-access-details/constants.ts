import { DASHBOARD_TABS } from "@src/constants/common";

const SIMULATION_SETTINGS_ITEMS = [
  {
    id: "",
    label: "Simulator Analytics",
    type: DASHBOARD_TABS.SIMULATION_ANALYTICS,
  },
  {
    id: "hideRankInCommunity",
    label: "Hide leaderboard ranking",
  },
];

const SCRIBE_SETTINGS_ITEMS = [
  { id: "enableMicrophoneMode", label: "Microphone Mode" },
  // "Dictation Mode" removed: the live dictation session is retired, the backend
  // always hides it and ignores enableDictationMode.
  { id: "enableAudioUpload", label: "Upload Call Recording" },
  {
    id: "",
    label: "Scribe Analytics",
    type: DASHBOARD_TABS.CALL_LOG_ANALYTICS,
  },
  {
    id: "",
    label: "Org Session Analytics",
    type: DASHBOARD_TABS.ORG_ANALYTICS,
  },
];

export { SIMULATION_SETTINGS_ITEMS, SCRIBE_SETTINGS_ITEMS };
