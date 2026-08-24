import { FC, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useGetAvailableLanguagesQuery, useGetSimulationSummaryQuery } from "@api";
import { SimulationSummary, useSimulationSummaryPolling } from "@containers";

import { SimulationTranscriptTab } from "../../../calls/components";

interface RoleplaySessionLogPanelProps {
  sessionId: string;
}

/**
 * Inline "full log" for a completed roleplay item — the same Session Review /
 * Annotated Transcript content as the Roleplay Logs drawer, expanded in place
 * under the summary card rather than navigated to.
 */
export const RoleplaySessionLogPanel: FC<RoleplaySessionLogPanelProps> = ({ sessionId }) => {
  const { t, i18n } = useTranslation();

  const { data: summary } = useGetSimulationSummaryQuery({
    sessionId,
    languageCode: i18n.language,
  });
  const { summaryData, retryMaxReached } = useSimulationSummaryPolling(sessionId, i18n.language);

  const { data: availableLanguages } = useGetAvailableLanguagesQuery({});
  const originalLanguageCode = useMemo(() => {
    const languageId = summary?.metadata?.languageId;
    if (!languageId) return "en";
    const matchedLanguage = availableLanguages?.find(
      language => language.language_id === languageId,
    );
    return matchedLanguage?.value?.split("-")[0] ?? "en";
  }, [summary?.metadata?.languageId, availableLanguages]);

  const tabList = [
    {
      id: "transcript",
      label: t("postSim.tabs.annotatedTranscript"),
      content: (
        <SimulationTranscriptTab
          sessionId={sessionId}
          agentName={summary?.scenario?.metadata?.name}
          originalLanguageCode={originalLanguageCode}
        />
      ),
    },
    {
      id: "review",
      label: t("postSim.tabs.sessionReview"),
      content: (
        <SimulationSummary
          sessionId={sessionId}
          summaryData={summaryData}
          retryMaxReached={retryMaxReached}
          className="flex min-h-0 flex-col"
        />
      ),
    },
  ];

  const [selectedTab, setSelectedTab] = useState(tabList[0].id);
  const activeContent = tabList.find(tab => tab.id === selectedTab)?.content;

  return (
    <div className="mt-4 w-full max-w-2xl rounded-2xl border border-border-light bg-white text-left">
      <Tabs
        items={tabList.map(tab => ({ id: tab.id, label: tab.label }))}
        activeId={selectedTab}
        onChange={setSelectedTab}
        className="px-4"
        showCount={false}
      />
      <div className="max-h-[50vh] overflow-y-auto p-4">{activeContent}</div>
    </div>
  );
};
