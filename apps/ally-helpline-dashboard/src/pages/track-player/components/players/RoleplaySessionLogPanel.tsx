import { FC, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { useGetAvailableLanguagesQuery, useGetSimulationSummaryQuery } from "@api";
import { DebriefTab } from "@components";
import { useSimulationSummaryPolling } from "@containers";
import { resolveFeedbackTabs } from "@utils";

import { SimulationTranscriptTab } from "../../../calls/components";

interface RoleplaySessionLogPanelProps {
  sessionId: string;
}

/**
 * Inline "full log" for a completed roleplay item — the same Debrief /
 * Transcript content as the Roleplay Logs drawer, expanded in place under the
 * summary card rather than navigated to.
 *
 * A revisit surface like that drawer, so the debrief note shows without the
 * conversation it opened (see DebriefTab's `readOnly`).
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

  // Which tabs this roleplay shows, resolved by the backend; both default on.
  const feedbackTabs = resolveFeedbackTabs(summary?.scenario?.metadata);

  const tabList = [
    // Read-only here as in the Roleplay Logs drawer: this is the note being read
    // back, not the moment it was written, and there is no reply thread on a log.
    ...(feedbackTabs.debrief
      ? [
          {
            id: "debrief",
            label: t("postSim.tabs.debrief"),
            content: (
              <DebriefTab
                sessionId={sessionId}
                summaryData={summaryData}
                retryMaxReached={retryMaxReached}
                readOnly
              />
            ),
          },
        ]
      : []),
    ...(feedbackTabs.transcript
      ? [
          {
            id: "transcript",
            label: t("postSim.tabs.transcript"),
            content: (
              <SimulationTranscriptTab
                sessionId={sessionId}
                agentName={summary?.scenario?.metadata?.name}
                originalLanguageCode={originalLanguageCode}
              />
            ),
          },
        ]
      : []),
  ];

  const [selectedTab, setSelectedTab] = useState(tabList[0]?.id);

  // Debrief is the default landing tab while the real scenario metadata is
  // still loading, but a roleplay can switch it off — in which case fall
  // through to whichever tab is actually first once tabList resolves.
  useEffect(() => {
    if (!tabList.length) return;
    if (!tabList.some(tab => tab.id === selectedTab)) {
      setSelectedTab(tabList[0].id);
    }
  }, [tabList, selectedTab]);

  const activeContent = tabList.find(tab => tab.id === selectedTab)?.content;

  // A roleplay with every post-session tab switched off has nothing to expand
  // into. An empty bordered card under the summary would read as a bug; not
  // rendering the panel at all is the honest answer, and the caller's
  // "show full log" affordance simply has nothing to reveal.
  if (!tabList.length) return null;

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
