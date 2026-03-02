import { FC, useState, useEffect, useRef, useMemo, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useGetReportsQuery,
  useGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
  useGetReportTranscriptQuery,
  useLazyGetReportTranscriptQuery,
} from "@api";
import { ArrowDown } from "@assets";
import { Button, PromptConfiguration, ReportContent, TabButton, Accordion } from "@components";
import { ButtonVariant } from "@components/types";
import {
  DEFAULT_HELPER_PROMPT,
  DEFAULT_LANGUAGE,
  DEFAULT_TURNS,
  DETAILS_STYLES,
  en,
  REPORT_ACCORDION_SX,
  REPORT_GENERATION_MESSAGES,
} from "@constants";
import { ReportGenerationStatus } from "@constants/reportGeneration";
import {
  addUpload,
  cancelInProgressUploadsForScenario,
  selectUploads,
  setUploadsForScenario,
  setCurrentScenarioId,
} from "@reducer/reportUploadReducer";
import { ReportData, ReportConfig } from "@types";

export interface ReportSectionProps {
  scenarioId?: string;
  areAllMandatoryFieldsFilled?: boolean;
}

const TABS = {
  primary: { report: "report", history: "history" },
  secondary: { report: "report", transcription: "transcription" },
};

const FINAL_STATUSES: ReportGenerationStatus[] = [
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
];

const STATUS_MAP: Partial<Record<string, ReportGenerationStatus>> = {
  [ReportGenerationStatus.COMPLETED]: ReportGenerationStatus.COMPLETED,
  [ReportGenerationStatus.FAILED]: ReportGenerationStatus.FAILED,
  [ReportGenerationStatus.CANCELLED]: ReportGenerationStatus.CANCELLED,
};

const normalizeStatus = (status: string): ReportGenerationStatus =>
  STATUS_MAP[status] ?? ReportGenerationStatus.IN_PROGRESS;

const formatReportCreatedAt = (dateString: string): string =>
  new Date(dateString).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const calculateProgress = (status: ReportGenerationStatus): number =>
  status === ReportGenerationStatus.COMPLETED ? 100 : 0;

const createUploadPayload = (
  reportId: string,
  scenarioId: string,
  status: ReportGenerationStatus,
  progress = 0,
  reportName?: string,
) => ({
  fileName: reportName ?? `Report ${reportId}`,
  status,
  progress,
  reportId,
  scenarioId,
});

const createUploadFromReport = (report: any) => {
  const status = normalizeStatus(report.status);
  return createUploadPayload(
    report.id,
    report.scenarioId,
    status,
    calculateProgress(status),
    report.name,
  );
};

export const ReportSection: FC<ReportSectionProps> = ({
  scenarioId,
  areAllMandatoryFieldsFilled = false,
}) => {
  const dispatch = useDispatch();
  const [helperAgentPrompt, setHelperAgentPrompt] = useState(DEFAULT_HELPER_PROMPT);
  const [selectedLanguage, setSelectedLanguage] = useState<{ value: string; label: string }>(
    DEFAULT_LANGUAGE,
  );
  const [selectedTurns, setSelectedTurns] = useState(DEFAULT_TURNS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState(TABS.secondary.report);
  const [primaryActiveTab, setPrimaryActiveTab] = useState(TABS.primary.report);
  const [reportId, setReportId] = useState<string | null>(null);
  const [historyItemActiveTabs, setHistoryItemActiveTabs] = useState<Record<string, string>>({});
  const [expandedHistoryReportId, setExpandedHistoryReportId] = useState<string | null>(null);

  const previousScenarioIdRef = useRef<string | undefined>(scenarioId);
  const previousPrimaryActiveTabRef = useRef<string>(primaryActiveTab);

  const [generateReportMutation] = useGenerateReportMutation();
  const { data: fetchedReportData } = useGetReportByIdQuery({ id: reportId! }, { skip: !reportId });
  const { data: reportsHistory, refetch: refetchReportsHistory } = useGetReportsQuery(
    { input: { scenarioId: scenarioId! } },
    { skip: !scenarioId },
  );
  const [cancelReportGenerationMutation] = useCancelReportGenerationMutation();
  const [getReportTranscriptQuery, { data: transcriptData, isLoading: isTranscriptLoading }] =
    useLazyGetReportTranscriptQuery();
  const { data: historyTranscriptData, isLoading: isHistoryTranscriptLoading } =
    useGetReportTranscriptQuery(
      { reportId: expandedHistoryReportId! },
      {
        skip: !expandedHistoryReportId || primaryActiveTab !== TABS.primary.history,
      },
    );

  useEffect(() => {
    if (scenarioId && scenarioId !== previousScenarioIdRef.current) {
      previousScenarioIdRef.current = scenarioId;
      dispatch(setCurrentScenarioId(scenarioId));
      setExpandedHistoryReportId(null);
    }
  }, [scenarioId, dispatch]);

  const mostRecentReportId = reportsHistory?.data?.[0]?.id;
  useEffect(() => {
    if (mostRecentReportId && mostRecentReportId !== reportId && !isGenerating) {
      setReportId(mostRecentReportId);
    }
  }, [mostRecentReportId, reportId, isGenerating]);

  useEffect(() => {
    const switchedToReportTab =
      primaryActiveTab === TABS.primary.report &&
      previousPrimaryActiveTabRef.current !== TABS.primary.report;
    previousPrimaryActiveTabRef.current = primaryActiveTab;

    if (primaryActiveTab === TABS.primary.report) {
      if (switchedToReportTab) {
        refetchReportsHistory();
      }
      if (!reportId && mostRecentReportId) {
        setReportId(mostRecentReportId);
      }
    }
  }, [primaryActiveTab, reportId, mostRecentReportId, refetchReportsHistory]);

  useEffect(() => {
    if (fetchedReportData) {
      setReportData({
        ...fetchedReportData,
        transcripts: transcriptData?.messages ?? fetchedReportData.transcripts,
      });
    }
  }, [fetchedReportData, transcriptData]);

  useEffect(() => {
    if (!reportsHistory?.data || !scenarioId) return;

    const uploads = reportsHistory.data
      .filter(report => String(report.scenarioId) === String(scenarioId))
      .map(createUploadFromReport);

    dispatch(setUploadsForScenario({ scenarioId, uploads }));
  }, [reportsHistory?.data, scenarioId, dispatch]);

  const completedReportsFromHistory = useMemo(
    () =>
      reportsHistory?.data
        ?.filter(item => item.status === ReportGenerationStatus.COMPLETED)
        .reverse() ?? [],
    [reportsHistory?.data],
  );

  const displayedReportConfig =
    primaryActiveTab === TABS.primary.report && completedReportsFromHistory.length > 0
      ? completedReportsFromHistory[0].config
      : fetchedReportData?.config;
  useEffect(() => {
    const config = displayedReportConfig;
    if (config?.helperAgentPrompt != null && config?.languageId != null && config?.turns != null) {
      setHelperAgentPrompt(config.helperAgentPrompt);
      setSelectedLanguage({
        value: config.languageId.toString(),
        label: config.languageId.toString(),
      });
      setSelectedTurns({
        value: config.turns.toString(),
        label: config.turns.toString(),
      });
    }
  }, [
    displayedReportConfig?.helperAgentPrompt,
    displayedReportConfig?.languageId,
    displayedReportConfig?.turns,
  ]);

  const uploads = useSelector(selectUploads);
  const currentUpload = useMemo(
    () => (reportId ? uploads.find(u => u.reportId === reportId) : null),
    [reportId, uploads],
  );
  const progress = currentUpload?.progress ?? 0;

  useEffect(() => {
    if (primaryActiveTab !== TABS.primary.history || expandedHistoryReportId) return;
    if (completedReportsFromHistory.length > 0) {
      setExpandedHistoryReportId(completedReportsFromHistory[0].id);
    }
  }, [primaryActiveTab, expandedHistoryReportId, completedReportsFromHistory]);

  useEffect(() => {
    if (!currentUpload) return;

    const isFinalStatus = FINAL_STATUSES.includes(currentUpload.status);
    if (isFinalStatus) {
      setIsGenerating(false);
      if (
        reportId &&
        [ReportGenerationStatus.COMPLETED, ReportGenerationStatus.FAILED].includes(
          currentUpload.status,
        )
      ) {
        refetchReportsHistory();
      }
    }
  }, [currentUpload, reportId, refetchReportsHistory]);

  useEffect(() => {
    if (!isGenerating || !reportId || !scenarioId) return;
    dispatch(
      addUpload(
        createUploadPayload(
          reportId,
          scenarioId,
          ReportGenerationStatus.IN_PROGRESS,
          0,
          currentUpload?.fileName,
        ),
      ),
    );
  }, [isGenerating, reportId, scenarioId, dispatch, currentUpload?.fileName]);

  const handleGenerate = async () => {
    if (!scenarioId) return;

    setIsGenerating(true);
    try {
      const config: ReportConfig = {
        languageId: Number(selectedLanguage.value) || 1,
        turns: Number(selectedTurns.value),
        helperAgentPrompt,
        languageName: selectedLanguage.label,
      };

      const response = await generateReportMutation({
        input: { scenarioId, config },
      }).unwrap();

      if (response?.id) {
        setReportId(response.id);
        dispatch(
          addUpload(
            createUploadPayload(
              response.id,
              scenarioId,
              ReportGenerationStatus.IN_PROGRESS,
              0,
              fetchedReportData?.scenarioTitle,
            ),
          ),
        );
      } else {
        setIsGenerating(false);
        dispatch(cancelInProgressUploadsForScenario({ scenarioId }));
        toast.error("Failed to generate report");
      }
    } catch (error: any) {
      setIsGenerating(false);
      dispatch(cancelInProgressUploadsForScenario({ scenarioId }));
      const errorMessage = error?.data?.message || error?.message || "Failed to generate report";
      const statusCode = error?.status || error?.originalStatus || error?.data?.status;
      toast.error(statusCode ? `${errorMessage} (Status: ${statusCode})` : errorMessage);
    }
  };

  const handleCancel = useCallback(async () => {
    if (!reportId || !scenarioId) return;

    try {
      await cancelReportGenerationMutation({ reportId }).unwrap();
      dispatch(
        addUpload(
          createUploadPayload(
            reportId,
            scenarioId,
            ReportGenerationStatus.CANCELLED,
            0,
            currentUpload?.fileName,
          ),
        ),
      );
      dispatch(cancelInProgressUploadsForScenario({ scenarioId }));
      setReportId(null);
      setIsGenerating(false);
      refetchReportsHistory();
    } catch {
      toast.error("Failed to cancel report generation");
    }
  }, [
    reportId,
    scenarioId,
    currentUpload?.fileName,
    cancelReportGenerationMutation,
    dispatch,
    refetchReportsHistory,
  ]);

  const handleLanguageChange = (language: { value: string; label: string }) => {
    setReportData(prev =>
      prev ? { ...prev, config: { ...prev.config, languageId: parseInt(language.value) } } : null,
    );
    setSelectedLanguage(language);
  };

  const handleTurnsChange = (turns: number) => {
    setReportData(prev => (prev ? { ...prev, config: { ...prev.config, turns } } : null));
    setSelectedTurns({ value: String(turns), label: `${turns} turns` });
  };

  const handlePromptChange = (prompt: string) => {
    setReportData(prev =>
      prev ? { ...prev, config: { ...prev.config, helperAgentPrompt: prompt } } : null,
    );
    setHelperAgentPrompt(prompt);
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center w-full h-[400px] gap-8">
      <div className="text-xl font-normal text-typography-900 font-primary">
        {REPORT_GENERATION_MESSAGES.GENERATING_REPORT}
      </div>
      <div className="w-full max-w-[400px]">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <Button
        variant={ButtonVariant.SECONDARY}
        onClick={handleCancel}
        className="px-8 py-2.5 min-w-[120px]"
      >
        {REPORT_GENERATION_MESSAGES.CANCEL}
      </Button>
    </div>
  );

  const renderContent = () => {
    if (isGenerating) {
      return renderLoadingState();
    }

    if (completedReportsFromHistory.length > 0) {
      const latestReport = completedReportsFromHistory[0];
      if (!latestReport) return null;
      return (
        <div className="flex flex-col gap-6 w-full max-w-[800px]">
          <style>{DETAILS_STYLES}</style>

          <details className="border border-gray-200 rounded-lg" open>
            <summary className="px-4 py-3 cursor-pointer font-medium text-base text-typography-900 hover:bg-gray-50 flex items-center justify-between list-none">
              <span>{REPORT_GENERATION_MESSAGES.TEST_CONFIGURATION}</span>
              <ArrowDown />
            </summary>
            <div className="px-6 py-4 border-t border-gray-200">
              <PromptConfiguration
                prompt={helperAgentPrompt}
                turns={Number(selectedTurns.value)}
                onPromptChange={handlePromptChange}
                onLanguageChange={handleLanguageChange}
                onTurnsChange={handleTurnsChange}
                onButtonClick={handleGenerate}
                buttonText={REPORT_GENERATION_MESSAGES.REGENERATE_REPORT}
                buttonDisabled={isGenerating || !areAllMandatoryFieldsFilled}
                buttonTooltip={
                  !areAllMandatoryFieldsFilled
                    ? en.simulation.generateReportTooltipMessage
                    : undefined
                }
              />
            </div>
          </details>

          <ReportContent
            reportData={latestReport}
            transcriptData={transcriptData?.messages}
            activeTab={activeTab}
            isTranscriptLoading={isTranscriptLoading}
            onTabChange={(tab: string) => {
              setActiveTab(tab);
              if (tab === "transcription") {
                getReportTranscriptQuery({ reportId: latestReport.id });
              }
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full max-w-[800px]">
        <PromptConfiguration
          prompt={helperAgentPrompt}
          turns={Number(selectedTurns.value)}
          onPromptChange={setHelperAgentPrompt}
          onLanguageChange={language => setSelectedLanguage(language)}
          onTurnsChange={turns =>
            setSelectedTurns({ value: String(turns), label: `${turns} turns` })
          }
          onButtonClick={handleGenerate}
          buttonText={REPORT_GENERATION_MESSAGES.GENERATE_REPORT}
          buttonDisabled={isGenerating || !helperAgentPrompt.trim() || !areAllMandatoryFieldsFilled}
          buttonTooltip={
            !areAllMandatoryFieldsFilled ? en.simulation.generateReportTooltipMessage : undefined
          }
        />
      </div>
    );
  };

  const renderHistoryList = () => {
    if (completedReportsFromHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-[400px]">
          <p className="text-gray-500">No reports found</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 w-full max-w-[800px]">
        {completedReportsFromHistory.map(item => {
          const itemActiveTab = historyItemActiveTabs[item.id] ?? TABS.secondary.report;
          const handleItemTabChange = (tab: string) => {
            setHistoryItemActiveTabs(prev => ({ ...prev, [item.id]: tab }));
          };
          const isItemTranscriptLoading =
            expandedHistoryReportId === item.id && isHistoryTranscriptLoading;
          const handleAccordionChange = (expanded: boolean) => {
            setExpandedHistoryReportId(expanded ? item.id : null);
          };

          const historyItemHeader = (
            <div className="text-base font-normal text-[#1A1A1A] flex flex-row gap-6 items-center">
              <div className="flex flex-col justify-between gap-2">
                <span className="text-xs font-normal text-[#1A1A1A]">
                  {formatReportCreatedAt(item.createdAt)}
                </span>
                <span className="text-xs font-normal text-typography-600">{`${item.language.label || item.language.id}· ${item.config.turns} turns`}</span>
              </div>
            </div>
          );

          return (
            <Accordion
              key={item.id}
              onChange={handleAccordionChange}
              customAccordionSx={REPORT_ACCORDION_SX}
              headerTitle={historyItemHeader}
            >
              <ReportContent
                reportData={item}
                transcriptData={historyTranscriptData?.messages}
                activeTab={itemActiveTab}
                onTabChange={handleItemTabChange}
                isTranscriptLoading={isItemTranscriptLoading}
              />
            </Accordion>
          );
        })}
      </div>
    );
  };

  const renderMainContent = () =>
    primaryActiveTab === TABS.primary.history ? renderHistoryList() : renderContent();

  const headerContent = reportData ? (
    <div className="sticky flex gap-8 flex-row top-0 z-10 pt-3 mx-6 border-b border-border-light">
      <TabButton
        label={REPORT_GENERATION_MESSAGES.REPORT}
        isActive={primaryActiveTab === TABS.primary.report}
        onClick={() => setPrimaryActiveTab(TABS.primary.report)}
      />
      <TabButton
        label={`${REPORT_GENERATION_MESSAGES.HISTORY} ${completedReportsFromHistory.length}`}
        isActive={primaryActiveTab === TABS.primary.history}
        onClick={() => setPrimaryActiveTab(TABS.primary.history)}
      />
    </div>
  ) : (
    <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
      <h2 className="text-lg font-medium text-typography-900">
        {REPORT_GENERATION_MESSAGES.REPORT}
      </h2>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-100%">
      {headerContent}
      <div className="p-6 pt-4 overflow-y-auto h-full custom-scrollbar">{renderMainContent()}</div>
    </div>
  );
};
