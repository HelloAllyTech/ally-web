import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useMemo } from "react";

import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useGetReportsQuery,
  useLazyGetReportsQuery,
  useGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
  useLazyGetReportTranscriptQuery,
} from "@api";
import { ArrowDown, Plus } from "@assets";
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
  ReportGenerationStatus,
} from "@constants";
import { useDebounce } from "@hooks";
import {
  addUpload,
  cancelInProgressUploadsForScenario,
  selectUploads,
  setUploadsForScenario,
  setCurrentScenarioId,
} from "@reducer/reportUploadReducer";
import { ReportData, ReportConfig, TranscriptMessage } from "@types";

export type ReportPrimaryTab = "report" | "history";

export interface ReportSectionProps {
  scenarioId?: string;
  areAllMandatoryFieldsFilled?: boolean;
  onPrimaryTabChange?: (tab: ReportPrimaryTab) => void;
  hasUnsavedChanges?: boolean;
}

export interface ReportSectionHandle {
  isOnHistoryTab: () => boolean;
  switchToReportTab: () => void;
}

const TABS = {
  primary: { report: "report", history: "history" },
  secondary: { report: "report", transcription: "transcription" },
};

const REPORT_HISTORY_PAGE_SIZE = 30;
const TRANSCRIPT_PAGE_SIZE = 50;

const FINAL_STATUSES: ReportGenerationStatus[] = [
  ReportGenerationStatus.COMPLETED,
  ReportGenerationStatus.FAILED,
  ReportGenerationStatus.CANCELLED,
];

const IN_PROGRESS_STATUSES: ReportGenerationStatus[] = [
  ReportGenerationStatus.IN_PROGRESS,
  ReportGenerationStatus.STARTED,
];

const isUploadInProgress = (status: ReportGenerationStatus): boolean =>
  IN_PROGRESS_STATUSES.includes(status);

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

const getReportsQueryInput = (scenarioId: string, offset: number) =>
  ({
    scenarioId,
    statuses: ReportGenerationStatus.COMPLETED,
    limit: REPORT_HISTORY_PAGE_SIZE,
    offset,
    sortBy: "createdAt",
    order: "DESC",
  }) as const;

const getTranscriptTotalFromResponse = (
  data: { messages: TranscriptMessage[]; total?: number },
  pageSize: number,
): number | null => data.total ?? (data.messages.length < pageSize ? data.messages.length : null);

const hasMoreTranscript = (
  messagesLength: number,
  total: number | null,
  pageSize: number,
): boolean =>
  (total != null && messagesLength < total) || (total == null && messagesLength === pageSize);

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

const createUploadFromReport = (report: ReportData) => {
  const status = normalizeStatus(report.status);
  return createUploadPayload(
    report.id,
    report.scenarioId,
    status,
    calculateProgress(status),
    report.scenarioTitle,
  );
};

export const ReportSection = forwardRef<ReportSectionHandle, ReportSectionProps>(
  (
    {
      scenarioId,
      areAllMandatoryFieldsFilled = false,
      hasUnsavedChanges = false,
      onPrimaryTabChange,
    },
    ref,
  ) => {
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
    const [historyExtraPages, setHistoryExtraPages] = useState<ReportData[]>([]);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
    const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
    const [transcriptTotal, setTranscriptTotal] = useState<number | null>(null);
    const [isTranscriptLoadingMore, setIsTranscriptLoadingMore] = useState(false);
    const [historyTranscriptsByReportId, setHistoryTranscriptsByReportId] = useState<
      Record<string, { messages: TranscriptMessage[]; total: number | null }>
    >({});
    const [historyTranscriptLoadingReportId, setHistoryTranscriptLoadingReportId] = useState<
      string | null
    >(null);
    const [isHistoryTranscriptLoadingMore, setIsHistoryTranscriptLoadingMore] = useState(false);

    const previousScenarioIdRef = useRef<string | undefined>(scenarioId);
    const previousPrimaryActiveTabRef = useRef<string>(primaryActiveTab);
    const lastRefetchedForReportIdRef = useRef<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        isOnHistoryTab: () => primaryActiveTab === TABS.primary.history,
        switchToReportTab: () => setPrimaryActiveTab(TABS.primary.report),
      }),
      [primaryActiveTab],
    );

    useEffect(() => {
      onPrimaryTabChange?.(primaryActiveTab as ReportPrimaryTab);
    }, [primaryActiveTab, onPrimaryTabChange]);

    const [generateReportMutation] = useGenerateReportMutation();
    const { data: fetchedReportData } = useGetReportByIdQuery(
      { id: reportId! },
      { skip: !reportId },
    );
    const { data: reportsHistory, refetch: refetchReportsHistory } = useGetReportsQuery(
      { input: getReportsQueryInput(scenarioId!, 0) },
      {
        skip: !scenarioId,
        refetchOnMountOrArgChange: false,
        refetchOnFocus: false,
      },
    );
    const refetchReportsHistoryRef = useRef(refetchReportsHistory);
    refetchReportsHistoryRef.current = refetchReportsHistory;
    const refetchReportsHistoryAndResetPagination = () => {
      setHistoryExtraPages([]);
      setHasMoreHistory(true);
      refetchReportsHistoryRef.current();
    };
    const [fetchMoreReports] = useLazyGetReportsQuery();
    const [cancelReportGenerationMutation] = useCancelReportGenerationMutation();
    const [getReportTranscriptQuery, { data: transcriptData, isLoading: isTranscriptLoading }] =
      useLazyGetReportTranscriptQuery();
    const [getHistoryTranscriptQuery] = useLazyGetReportTranscriptQuery();

    useEffect(() => {
      if (scenarioId && scenarioId !== previousScenarioIdRef.current) {
        previousScenarioIdRef.current = scenarioId;
        lastRefetchedForReportIdRef.current = null;
        dispatch(setCurrentScenarioId(scenarioId));
        setExpandedHistoryReportId(null);
        setHistoryExtraPages([]);
        setHasMoreHistory(true);
        setHistoryTranscriptsByReportId({});
      }
    }, [scenarioId, dispatch]);

    const expandedHistoryReportIdRef = useRef(expandedHistoryReportId);
    expandedHistoryReportIdRef.current = expandedHistoryReportId;

    useEffect(() => {
      if (!expandedHistoryReportId || primaryActiveTab !== TABS.primary.history) {
        setHistoryTranscriptLoadingReportId(null);
        return;
      }
      const reportIdForFetch = expandedHistoryReportId;
      const cached = historyTranscriptsByReportId[reportIdForFetch];
      if (cached != null) {
        setHistoryTranscriptLoadingReportId(null);
        return;
      }
      setHistoryTranscriptLoadingReportId(reportIdForFetch);
      getHistoryTranscriptQuery({
        reportId: reportIdForFetch,
        limit: TRANSCRIPT_PAGE_SIZE,
        offset: 0,
      })
        .unwrap()
        .then(data => {
          if (expandedHistoryReportIdRef.current !== reportIdForFetch) return;
          const total =
            data.total ??
            (data.messages.length < TRANSCRIPT_PAGE_SIZE ? data.messages.length : null);
          setHistoryTranscriptsByReportId(prev => ({
            ...prev,
            [reportIdForFetch]: { messages: data.messages, total },
          }));
        })
        .finally(() => {
          setHistoryTranscriptLoadingReportId(prev => (prev === reportIdForFetch ? null : prev));
        });
    }, [expandedHistoryReportId, primaryActiveTab, getHistoryTranscriptQuery]);

    const displayHistoryData = useMemo(
      () => (reportsHistory?.data ?? []).concat(historyExtraPages),
      [reportsHistory?.data, historyExtraPages],
    );

    const showLoadMoreHistory =
      historyExtraPages.length === 0
        ? (reportsHistory?.data?.length ?? 0) === REPORT_HISTORY_PAGE_SIZE
        : hasMoreHistory;

    const mostRecentReportId = reportsHistory?.data?.[0]?.id;

    useEffect(() => {
      const switchedToReportTab =
        primaryActiveTab === TABS.primary.report &&
        previousPrimaryActiveTabRef.current !== TABS.primary.report;
      previousPrimaryActiveTabRef.current = primaryActiveTab;

      if (primaryActiveTab === TABS.primary.report) {
        if (switchedToReportTab) {
          refetchReportsHistoryAndResetPagination();
        }
        if (!reportId && mostRecentReportId) {
          setReportId(mostRecentReportId);
        }
      }
    }, [primaryActiveTab, reportId, mostRecentReportId]);

    useEffect(() => {
      if (fetchedReportData) {
        setReportData({
          ...fetchedReportData,
          transcripts: transcriptData?.messages ?? fetchedReportData.transcripts,
        });
      }
    }, [fetchedReportData, transcriptData]);

    useEffect(() => {
      if (!displayHistoryData.length || !scenarioId) return;

      const uploads = displayHistoryData
        .filter(report => String(report.scenarioId) === String(scenarioId))
        .map(createUploadFromReport);

      dispatch(setUploadsForScenario({ scenarioId, uploads }));
    }, [displayHistoryData, scenarioId, dispatch]);

    const displayedReport =
      primaryActiveTab === TABS.primary.report && (reportsHistory?.data?.length ?? 0) > 0
        ? reportsHistory!.data![0]
        : (fetchedReportData ?? null);
    const displayedReportConfig = displayedReport?.config;
    const displayedLanguage = displayedReport?.language;

    useEffect(() => {
      const config = displayedReportConfig;
      const language = displayedLanguage;
      if (
        config?.helperAgentPrompt != null &&
        config?.languageId != null &&
        config?.turns != null
      ) {
        setHelperAgentPrompt(config.helperAgentPrompt);
        setSelectedLanguage({
          value: language?.id?.toString() || "",
          label: language?.label || "",
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

    // When socket restores in-progress reports on refresh, focus on the in-progress report for this scenario
    const inProgressUploadForScenario = useMemo(
      () =>
        scenarioId
          ? uploads.find(
              u =>
                u.scenarioId != null &&
                String(u.scenarioId) === String(scenarioId) &&
                isUploadInProgress(u.status),
            )
          : null,
      [scenarioId, uploads],
    );

    useEffect(() => {
      if (!inProgressUploadForScenario) return;
      const currentIsInProgress = currentUpload != null && isUploadInProgress(currentUpload.status);
      if (currentIsInProgress) return;
      if (reportId !== inProgressUploadForScenario.reportId) {
        setReportId(inProgressUploadForScenario.reportId);
      }
    }, [inProgressUploadForScenario, currentUpload?.status, reportId]);

    const showReportGenerationLoader =
      isGenerating || (currentUpload != null && isUploadInProgress(currentUpload.status));

    useEffect(() => {
      if (mostRecentReportId && mostRecentReportId !== reportId && !showReportGenerationLoader) {
        setReportId(mostRecentReportId);
      }
    }, [mostRecentReportId, reportId, showReportGenerationLoader]);

    useEffect(() => {
      if (primaryActiveTab !== TABS.primary.history || expandedHistoryReportId) return;
      if (reportsHistory?.data?.length > 0) {
        setExpandedHistoryReportId(reportsHistory?.data[0].id);
      }
    }, [primaryActiveTab, expandedHistoryReportId, reportsHistory?.data]);

    useEffect(() => {
      if (!currentUpload || !reportId) return;

      const isFinalStatus = FINAL_STATUSES.includes(currentUpload.status);
      if (isFinalStatus) {
        setIsGenerating(false);
        const shouldRefetch = [
          ReportGenerationStatus.COMPLETED,
          ReportGenerationStatus.FAILED,
        ].includes(currentUpload.status);
        if (shouldRefetch && lastRefetchedForReportIdRef.current !== reportId) {
          lastRefetchedForReportIdRef.current = reportId;
          refetchReportsHistoryAndResetPagination();
          if (activeTab === TABS.secondary.transcription) setActiveTab(TABS.secondary.report);
        }
      }
    }, [currentUpload, reportId, activeTab]);

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
      if (!scenarioId || !helperAgentPrompt.trim()) return;

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

    const handleCancel = async () => {
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
        refetchReportsHistoryAndResetPagination();
      } catch {
        toast.error("Failed to cancel report generation");
      }
    };

    const handleCancelReportGeneration = useDebounce(handleCancel, 500);

    const handleLoadMoreHistory = async () => {
      if (!scenarioId || isHistoryLoadingMore || !showLoadMoreHistory) return;
      setIsHistoryLoadingMore(true);
      try {
        const offset = (reportsHistory?.data?.length ?? 0) + historyExtraPages.length;
        const result = await fetchMoreReports({
          input: getReportsQueryInput(scenarioId, offset),
        }).unwrap();
        if (result?.data?.length) {
          setHistoryExtraPages(prev => [...prev, ...result.data]);
        }
        setHasMoreHistory((result?.data?.length ?? 0) === REPORT_HISTORY_PAGE_SIZE);
      } finally {
        setIsHistoryLoadingMore(false);
      }
    };

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

    const getButtonTooltipText = () => {
      if (!areAllMandatoryFieldsFilled) {
        return en.simulation.generateReportTooltipMessage;
      }
      if (hasUnsavedChanges) {
        return en.simulation.generateReportTooltipMessageUnsavedChanges;
      }
      return undefined;
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
          onClick={handleCancelReportGeneration}
          className="px-8 py-2.5 min-w-[120px]"
        >
          {REPORT_GENERATION_MESSAGES.CANCEL}
        </Button>
      </div>
    );

    const renderContent = () => {
      if (showReportGenerationLoader) {
        return renderLoadingState();
      }

      if (reportsHistory?.data?.length > 0) {
        const latestReport = reportsHistory?.data[0];
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
                  selectedLanguage={selectedLanguage}
                  prompt={helperAgentPrompt}
                  turns={Number(selectedTurns.value)}
                  onPromptChange={handlePromptChange}
                  onLanguageChange={handleLanguageChange}
                  onTurnsChange={handleTurnsChange}
                  onButtonClick={handleGenerate}
                  buttonText={REPORT_GENERATION_MESSAGES.REGENERATE_REPORT}
                  buttonDisabled={
                    showReportGenerationLoader || !areAllMandatoryFieldsFilled || hasUnsavedChanges
                  }
                  buttonTooltip={getButtonTooltipText()}
                />
              </div>
            </details>

            <ReportContent
              reportData={latestReport}
              transcriptData={transcriptMessages}
              activeTab={activeTab}
              isTranscriptLoading={isTranscriptLoading}
              hasMoreTranscript={hasMoreTranscript(
                transcriptMessages.length,
                transcriptTotal,
                TRANSCRIPT_PAGE_SIZE,
              )}
              isTranscriptLoadingMore={isTranscriptLoadingMore}
              onLoadMoreTranscript={() => {
                setIsTranscriptLoadingMore(true);
                getReportTranscriptQuery({
                  reportId: latestReport.id,
                  limit: TRANSCRIPT_PAGE_SIZE,
                  offset: transcriptMessages.length,
                })
                  .unwrap()
                  .then(data => {
                    setTranscriptMessages(prev => {
                      const next = [...prev, ...data.messages];
                      setTranscriptTotal(data.total ?? next.length);
                      return next;
                    });
                  })
                  .finally(() => setIsTranscriptLoadingMore(false));
              }}
              onTabChange={(tab: string) => {
                setActiveTab(tab);
                if (tab === TABS.secondary.transcription) {
                  setTranscriptMessages([]);
                  setTranscriptTotal(null);
                  getReportTranscriptQuery({
                    reportId: latestReport.id,
                    limit: TRANSCRIPT_PAGE_SIZE,
                    offset: 0,
                  })
                    .unwrap()
                    .then(data => {
                      setTranscriptMessages(data.messages);
                      setTranscriptTotal(
                        getTranscriptTotalFromResponse(data, TRANSCRIPT_PAGE_SIZE),
                      );
                    });
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
            buttonDisabled={
              showReportGenerationLoader ||
              !helperAgentPrompt.trim() ||
              !areAllMandatoryFieldsFilled ||
              hasUnsavedChanges
            }
            buttonTooltip={getButtonTooltipText()}
          />
        </div>
      );
    };

    const renderHistoryList = () => {
      if (displayHistoryData.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center w-full h-[400px]">
            <p className="text-gray-500">No reports found</p>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-2 w-full max-w-[800px]">
          {displayHistoryData.map(item => {
            const itemActiveTab = historyItemActiveTabs[item.id] ?? TABS.secondary.report;
            const handleItemTabChange = (tab: string) => {
              setHistoryItemActiveTabs(prev => ({ ...prev, [item.id]: tab }));
            };
            const cachedTranscript = historyTranscriptsByReportId[item.id];
            const isItemTranscriptLoading =
              expandedHistoryReportId === item.id && historyTranscriptLoadingReportId === item.id;
            const handleAccordionChange = (expanded: boolean) => {
              if (expanded) {
                setExpandedHistoryReportId(item.id);
              } else {
                setExpandedHistoryReportId(null);
              }
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
                  transcriptData={cachedTranscript?.messages}
                  activeTab={itemActiveTab}
                  onTabChange={handleItemTabChange}
                  isTranscriptLoading={isItemTranscriptLoading}
                  hasMoreTranscript={
                    expandedHistoryReportId === item.id &&
                    cachedTranscript != null &&
                    hasMoreTranscript(
                      cachedTranscript.messages.length,
                      cachedTranscript.total,
                      TRANSCRIPT_PAGE_SIZE,
                    )
                  }
                  isTranscriptLoadingMore={isHistoryTranscriptLoadingMore}
                  onLoadMoreTranscript={() => {
                    if (!expandedHistoryReportId || expandedHistoryReportId !== item.id) return;
                    const cached = historyTranscriptsByReportId[expandedHistoryReportId];
                    if (
                      isHistoryTranscriptLoadingMore ||
                      !cached ||
                      (cached.total != null && cached.messages.length >= cached.total)
                    )
                      return;
                    const reportId = expandedHistoryReportId;
                    const offset = cached.messages.length;
                    setIsHistoryTranscriptLoadingMore(true);
                    getHistoryTranscriptQuery({
                      reportId,
                      limit: TRANSCRIPT_PAGE_SIZE,
                      offset,
                    })
                      .unwrap()
                      .then(data => {
                        if (expandedHistoryReportIdRef.current !== reportId) return;
                        setHistoryTranscriptsByReportId(prev => {
                          const existing = prev[reportId];
                          const nextMessages = [...(existing?.messages ?? []), ...data.messages];
                          const total = data.total ?? existing?.total ?? nextMessages.length;
                          return {
                            ...prev,
                            [reportId]: { messages: nextMessages, total },
                          };
                        });
                      })
                      .finally(() => setIsHistoryTranscriptLoadingMore(false));
                  }}
                />
              </Accordion>
            );
          })}
          {showLoadMoreHistory && (
            <div
              onClick={handleLoadMoreHistory}
              className="flex cursor-pointer mt-4 text-center items-center pb-[20px]"
            >
              <Plus className="w-4 h-4" />
              <span className="font-primary text-base ml-[5px]">Load More</span>
              {isHistoryLoadingMore && (
                <CircularProgress color="primary" size={20} className="mx-2" />
              )}
            </div>
          )}
        </div>
      );
    };

    const headerContent = reportData ? (
      <div className="sticky flex gap-8 flex-row top-0 z-10 pt-3 mx-6 border-b border-border-light">
        <TabButton
          label={REPORT_GENERATION_MESSAGES.GENERATE_REPORT}
          isActive={primaryActiveTab === TABS.primary.report}
          onClick={() => setPrimaryActiveTab(TABS.primary.report)}
        />
        <TabButton
          label={`${REPORT_GENERATION_MESSAGES.HISTORY} (${reportsHistory?.count ?? displayHistoryData.length})`}
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
        <div className="p-6 pt-4 overflow-y-auto h-full custom-scrollbar">
          {primaryActiveTab === TABS.primary.history ? renderHistoryList() : renderContent()}
        </div>
      </div>
    );
  },
);
