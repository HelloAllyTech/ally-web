import { FC, useState, useEffect, useRef, useMemo, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useGetReportsQuery,
  useGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
  useGetReportTranscriptQuery,
} from "@api";
import { ArrowDown } from "@assets";
import { Button, PromptConfiguration, ReportContent, TabButton } from "@components";
import { ButtonVariant } from "@components/types";
import {
  DEFAULT_HELPER_PROMPT,
  DEFAULT_LANGUAGE,
  DEFAULT_TURNS,
  DETAILS_STYLES,
  REPORT_GENERATION_MESSAGES,
  ReportGenerationStatus,
} from "@constants";
import {
  addUpload,
  selectUploads,
  clearAllUploads,
  setAllUploads,
  setCurrentScenarioId,
} from "@reducer/reportUploadReducer";
import { ReportData, ReportConfig, TranscriptMessage } from "@types";

export interface ReportSectionProps {
  scenarioId?: string;
}

const TABS = {
  primary: { report: "report", history: "history" },
  secondary: { report: "report", transcription: "transcription" },
};

const getFinalStatuses = (): ReportGenerationStatus[] => [
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
];

// Helper functions
const normalizeStatus = (status: string): ReportGenerationStatus => {
  if (status === ReportGenerationStatus.COMPLETED) return ReportGenerationStatus.COMPLETED;
  if (status === ReportGenerationStatus.FAILED) return ReportGenerationStatus.FAILED;
  if (status === ReportGenerationStatus.CANCELLED) return ReportGenerationStatus.CANCELLED;
  return ReportGenerationStatus.IN_PROGRESS;
};

const calculateProgress = (status: ReportGenerationStatus): number => {
  return status === ReportGenerationStatus.COMPLETED ? 100 : 0;
};

const createUploadFromReport = (report: any) => ({
  fileName: `Report ${report.id}`,
  status: normalizeStatus(report.status),
  progress: calculateProgress(normalizeStatus(report.status)),
  reportId: report.id,
  scenarioId: report.scenarioId,
});
export const ReportSection: FC<ReportSectionProps> = ({ scenarioId }) => {
  const dispatch = useDispatch();
  const [helperAgentPrompt, setHelperAgentPrompt] = useState(DEFAULT_HELPER_PROMPT);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [selectedTurns, setSelectedTurns] = useState(DEFAULT_TURNS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState(TABS.secondary.report);
  const [primaryActiveTab, setPrimaryActiveTab] = useState(TABS.primary.report);
  const [reportId, setReportId] = useState<string | null>(null);
  const [historyItemActiveTabs, setHistoryItemActiveTabs] = useState<Record<string, string>>({});
  const [transcriptsCache, setTranscriptsCache] = useState<Record<string, TranscriptMessage[]>>({});
  const previousScenarioIdRef = useRef<string | undefined>(scenarioId);

  const [generateReportMutation] = useGenerateReportMutation();
  const { data: fetchedReportData } = useGetReportByIdQuery({ id: reportId! }, { skip: !reportId });
  const { data: reportsHistory, refetch: refetchReportsHistory } = useGetReportsQuery(
    { input: { scenarioId: scenarioId! } },
    { skip: !scenarioId },
  );
  const [cancelReportGenerationMutation] = useCancelReportGenerationMutation();
  const { data: transcriptData } = useGetReportTranscriptQuery(
    { reportId: reportId! },
    {
      skip: !reportId || fetchedReportData?.status !== ReportGenerationStatus.COMPLETED,
    },
  );

  // Update scenarioId in Redux when it changes
  useEffect(() => {
    if (scenarioId && scenarioId !== previousScenarioIdRef.current) {
      previousScenarioIdRef.current = scenarioId;
      dispatch(setCurrentScenarioId(scenarioId));
    }
  }, [scenarioId, dispatch]);

  // Set most recent reportId from history
  const mostRecentReportId = reportsHistory?.data?.[0]?.id;
  useEffect(() => {
    if (mostRecentReportId && mostRecentReportId !== reportId && !isGenerating) {
      setReportId(mostRecentReportId);
    }
  }, [mostRecentReportId, reportId, isGenerating]);

  // Refetch and set reportId when switching to report tab
  useEffect(() => {
    if (primaryActiveTab === TABS.primary.report) {
      refetchReportsHistory();
      if (!reportId && mostRecentReportId) {
        setReportId(mostRecentReportId);
      }
    }
  }, [primaryActiveTab, reportId, mostRecentReportId, refetchReportsHistory]);

  useEffect(() => {
    if (fetchedReportData) {
      const cachedTranscripts = transcriptsCache[fetchedReportData.id];
      setReportData({
        ...fetchedReportData,
        transcripts: transcriptData || cachedTranscripts || fetchedReportData.transcripts,
      });
      // Cache the transcript if we have it
      if (transcriptData && !cachedTranscripts) {
        setTranscriptsCache(prev => ({ ...prev, [fetchedReportData.id]: transcriptData }));
      }
    }
  }, [fetchedReportData, transcriptData, transcriptsCache]);

  useEffect(() => {
    if (!reportsHistory?.data || !scenarioId) {
      if (scenarioId && scenarioId !== previousScenarioIdRef.current && !reportsHistory?.data) {
        dispatch(clearAllUploads());
      }
      return;
    }

    const uploads = reportsHistory.data
      .filter(report => String(report.scenarioId) === String(scenarioId))
      .map(createUploadFromReport);

    if (uploads.length > 0) {
      dispatch(setAllUploads(uploads));
    }
  }, [reportsHistory?.data, scenarioId, dispatch]);

  const uploads = useSelector(selectUploads);
  const currentUpload = useMemo(
    () => (reportId ? uploads.find(u => u.reportId === reportId) : null),
    [reportId, uploads],
  );
  const progress = currentUpload?.progress ?? 0;

  useEffect(() => {
    if (!currentUpload) return;

    const isFinalStatus = getFinalStatuses().includes(currentUpload.status);
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

  // Initialize upload when generation starts (progress simulation is handled globally by ScenarioReportsSocketProvider)
  useEffect(() => {
    if (!isGenerating || !reportId || !scenarioId) return;

    dispatch(
      addUpload({
        fileName: `Report ${reportId}`,
        status: ReportGenerationStatus.IN_PROGRESS,
        progress: 0,
        reportId,
        scenarioId,
      }),
    );
  }, [isGenerating, reportId, scenarioId, dispatch]);

  const handleGenerate = async () => {
    if (!scenarioId) return;

    setIsGenerating(true);
    try {
      const config: ReportConfig = {
        languageId: Number(selectedLanguage.value) || 1,
        turns: Number(selectedTurns.value),
        helperAgentPrompt,
      };

      const response = await generateReportMutation({
        input: { scenarioId, config },
      }).unwrap();

      if (response?.id) {
        setReportId(response.id);
        dispatch(
          addUpload({
            fileName: `Report ${response.id}`,
            status: ReportGenerationStatus.IN_PROGRESS,
            progress: 0,
            reportId: response.id,
            scenarioId,
          }),
        );
      } else {
        setIsGenerating(false);
        toast.error("Failed to generate report");
      }
    } catch (error: any) {
      setIsGenerating(false);
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
        addUpload({
          fileName: `Report ${reportId}`,
          status: ReportGenerationStatus.CANCELLED,
          progress: 0,
          reportId,
          scenarioId,
        }),
      );
      setReportId(null);
      setIsGenerating(false);
    } catch {
      toast.error("Failed to cancel report generation");
    }
  }, [reportId, scenarioId, cancelReportGenerationMutation, dispatch]);

  const handleLanguageChange = (language: string) => {
    setReportData(prev =>
      prev ? { ...prev, config: { ...prev.config, languageId: parseInt(language) } } : null,
    );
  };

  const handleTurnsChange = (turns: number) => {
    setReportData(prev => (prev ? { ...prev, config: { ...prev.config, turns } } : null));
  };

  const handlePromptChange = (prompt: string) => {
    setReportData(prev =>
      prev ? { ...prev, config: { ...prev.config, helperAgentPrompt: prompt } } : null,
    );
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

    if (reportData) {
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
                prompt={reportData.config.helperAgentPrompt}
                language={reportData.config.languageId.toString()}
                turns={reportData.config.turns}
                onPromptChange={handlePromptChange}
                onLanguageChange={handleLanguageChange}
                onTurnsChange={handleTurnsChange}
                onButtonClick={handleGenerate}
                buttonText={REPORT_GENERATION_MESSAGES.REGENERATE_REPORT}
              />
            </div>
          </details>

          <ReportContent reportData={reportData} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 w-full max-w-[800px]">
        <PromptConfiguration
          prompt={helperAgentPrompt}
          language={selectedLanguage.value}
          turns={Number(selectedTurns.value)}
          onPromptChange={setHelperAgentPrompt}
          onLanguageChange={language => setSelectedLanguage({ value: language, label: language })}
          onTurnsChange={turns =>
            setSelectedTurns({ value: String(turns), label: `${turns} turns` })
          }
          onButtonClick={handleGenerate}
          buttonText={REPORT_GENERATION_MESSAGES.GENERATE_REPORT}
          buttonDisabled={isGenerating || !helperAgentPrompt.trim()}
        />
      </div>
    );
  };

  const renderHistoryList = () => {
    // Filter to only show completed reports
    const completedReports =
      reportsHistory?.data.filter(item => item.status === ReportGenerationStatus.COMPLETED) || [];

    if (completedReports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-[400px]">
          <p className="text-gray-500">No reports found</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 w-full max-w-[800px]">
        {completedReports.map((item, index) => {
          const itemActiveTab = historyItemActiveTabs[item.id] || TABS.secondary.report;
          const handleItemTabChange = (tab: string) => {
            setHistoryItemActiveTabs(prev => ({ ...prev, [item.id]: tab }));
          };

          return (
            <details
              key={item.id}
              className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              open={index === 0}
            >
              <summary className="px-4 py-3 cursor-pointer flex items-center gap-4 list-none">
                <span className="text-gray-500 font-medium">{index + 1}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-typography-900">{item.createdAt}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.config.languageId.toString()} (Global) • {item.config.turns} turns
                  </div>
                </div>
                <ArrowDown />
              </summary>
              <div className="px-6 py-4 border-t border-gray-200 bg-white">
                <ReportContent
                  reportData={{
                    ...item,
                    transcripts: transcriptsCache[item.id] || item.transcripts,
                  }}
                  activeTab={itemActiveTab}
                  onTabChange={handleItemTabChange}
                />
              </div>
            </details>
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
        label={REPORT_GENERATION_MESSAGES.HISTORY}
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
