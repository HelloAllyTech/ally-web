export enum PostSimulationSummaryTab {
  SUMMARY = "summary",
  TRANSCRIPTION = "transcription",
}

// Helper to generate localized tabs using i18n keys
export const getPostSimTabs = (t: (key: string) => string) => [
  {
    label: t("postSim.tabs.summary"),
    value: PostSimulationSummaryTab.SUMMARY,
  },
  {
    label: t("postSim.tabs.transcription"),
    value: PostSimulationSummaryTab.TRANSCRIPTION,
  },
];
