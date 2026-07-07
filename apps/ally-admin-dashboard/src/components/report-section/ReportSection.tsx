import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { Loading } from "@ally-ui-mono/ui-shared";
import {
  useGetReportsQuery,
  useLazyGetReportsQuery,
  useGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
  useLazyGetReportTranscriptQuery,
  useGetPromptsByTypeQuery,
  useGetScenarioVersionsQuery,
} from "@api";
import { ArrowDown, Plus } from "@assets";
import { PromptConfiguration, ReportContent, TabButton, Accordion } from "@components";
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
import { ReportData, ReportConfig, TranscriptMessage, formatVersionLabel } from "@types";

export type ReportPrimaryTab = "report" | "history";

export interface ReportSectionProps {
  scenarioId?: string;
  /**
   * When set, reports are generated against this scenario version (which may be
   * an unpublished draft) and tagged with it. Undefined runs the live scenario.
   */
  scenarioVersionId?: string;
  areAllMandatoryFieldsFilled?: boolean;
  onPrimaryTabChange?: (tab: ReportPrimaryTab) => void;
  hasUnsavedChanges?: boolean;
  /**
   * promptCode of the main-agent variant currently selected for this
   * scenario (or undefined when the default is in use). Surfaced under
   * the Test Configuration as a small read-only line so the author can
   * see which "skill" the report will run on. Flows through to
   * PromptConfiguration as currentMainPromptName after we resolve the
   * code → display name via the prompts API.
   */
  selectedMainPromptCode?: string;
  /**
   * Helper-agent prompt persisted on the scenario (metadata.helperAgentPrompt).
   * Used to pre-fill the report config instead of always resetting to
   * DEFAULT_HELPER_PROMPT, so an edited prompt survives reload and is reused
   * for future reports. Undefined for scenarios that never saved one.
   */
  savedHelperAgentPrompt?: string;
  /**
   * Push helper-prompt edits back into the simulation form so they save via
   * the normal "save simulation" flow (and mark the form dirty). Wired to
   * formMethods.setValue(HELPER_AGENT_PROMPT, value, { shouldDirty: true }).
   */
  onHelperPromptChange?: (prompt: string) => void;
  /**
   * Selected transcript-evaluator variant (metadata.selectedEvaluatorPromptCode).
   * Drives the evaluator picker on the report config; undefined = default evaluator.
   */
  savedEvaluatorPromptCode?: string;
  /**
   * Push evaluator variant selection back into the simulation form so it saves
   * via the normal flow. Wired to
   * formMethods.setValue(SELECTED_EVALUATOR_PROMPT_CODE, value, { shouldDirty: true }).
   */
  onEvaluatorPromptChange?: (promptCode: string) => void;
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
      scenarioVersionId,
      areAllMandatoryFieldsFilled = false,
      hasUnsavedChanges = false,
      onPrimaryTabChange,
      selectedMainPromptCode,
      savedHelperAgentPrompt,
      onHelperPromptChange,
      savedEvaluatorPromptCode,
      onEvaluatorPromptChange,
    },
    ref,
  ) => {
    const dispatch = useDispatch();

    // Resolve the picked main-agent prompt code to its human-readable
    // name. The list is small (one row per variant) and already cached
    // RTK-side by the studio's MainAgentPromptPicker, so this hook
    // typically hits the cache and adds zero extra requests in the
    // common case. When the scenario is on the default variant
    // (selectedMainPromptCode is undefined/empty) we render
    // "Default main agent prompt" as the friendly fallback so the
    // author still knows what's in effect.
    const { data: mainAgentPrompts } = useGetPromptsByTypeQuery("main_agent");
    // Resolve a main-agent promptCode → its human-readable "skill" name.
    // Shared by the live Test Configuration line and each history row so
    // both render the skill identically. Falls back to the raw code if the
    // prompt list hasn't loaded yet or the variant was removed since the
    // report ran; empty/undefined code means the default variant.
    const resolveMainPromptName = useCallback(
      (code?: string): string => {
        if (!code) return "Default main agent prompt";
        const match = (mainAgentPrompts ?? []).find(p => p.promptCode === code);
        return match?.name ?? code;
      },
      [mainAgentPrompts],
    );
    const currentMainPromptName = useMemo(
      () => resolveMainPromptName(selectedMainPromptCode),
      [resolveMainPromptName, selectedMainPromptCode],
    );

    // Resolve a transcript-evaluator promptCode → its human-readable name, for
    // the read-only "Evaluator" line on each history row (so the author can see
    // which evaluator variant scored each past report). Mirrors
    // resolveMainPromptName; empty/undefined code means the default evaluator.
    const { data: evaluatorPrompts } = useGetPromptsByTypeQuery("transcript_evaluator");
    const resolveEvaluatorPromptName = useCallback(
      (code?: string): string => {
        if (!code) return "Default evaluator";
        const match = (evaluatorPrompts ?? []).find(p => p.promptCode === code);
        return match?.name ?? code;
      },
      [evaluatorPrompts],
    );

    const [helperAgentPrompt, setHelperAgentPrompt] = useState(
      savedHelperAgentPrompt || DEFAULT_HELPER_PROMPT,
    );

    // Keep the editor in sync with the scenario's saved prompt: when the form
    // hydrates on edit (or the user switches scenarios), pull the persisted
    // value in. Guarded on truthy so scenarios without a saved prompt — or a
    // user clearing the field — don't clobber the value back to a stale prop.
    useEffect(() => {
      if (savedHelperAgentPrompt) {
        setHelperAgentPrompt(savedHelperAgentPrompt);
      }
    }, [savedHelperAgentPrompt]);
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
    // Map version id → display label so each report row can show which version
    // it ran against (shared RTK cache with the version switcher; no extra fetch).
    const { data: scenarioVersionsForReports = [] } = useGetScenarioVersionsQuery(
      { scenarioId: scenarioId as string },
      { skip: !scenarioId },
    );
    const versionLabelById = useMemo(() => {
      const map: Record<string, string> = {};
      scenarioVersionsForReports.forEach(v => {
        map[v.id] = formatVersionLabel(v);
      });
      return map;
    }, [scenarioVersionsForReports]);

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
        // Intentionally do NOT hydrate the helper-agent prompt from the
        // latest report — the Generate Report form keeps DEFAULT_HELPER_PROMPT
        // so the current default always wins, even for scenarios that already
        // have report history. Language/turns still carry over for continuity.
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

    // Toast on report-generation FAILED transitions. Fires exactly once per
    // reportId via the lastFailedToastedReportIdRef guard so re-renders or
    // poll refetches don't spam the user. The errorMessage comes from the
    // GET response (server side mirrors metadata.errorMessage onto a
    // top-level field). Falls back to a generic message when ai-learn
    // didn't supply a reason (older backend, network blip on the webhook).
    const lastFailedToastedReportIdRef = useRef<string | null>(null);
    useEffect(() => {
      if (!currentUpload || !reportId) return;
      if (currentUpload.status !== ReportGenerationStatus.FAILED) return;
      if (lastFailedToastedReportIdRef.current === reportId) return;
      lastFailedToastedReportIdRef.current = reportId;
      const reason =
        fetchedReportData?.errorMessage?.trim() ||
        "Something went wrong while generating this report.";
      toast.error(`Report generation failed: ${reason}`, {
        duration: 8000,
      });
    }, [currentUpload?.status, reportId, fetchedReportData?.errorMessage]);

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
          // Sent live so Regenerate uses the currently picked evaluator variant
          // without needing a scenario save first.
          selectedEvaluatorPromptCode: savedEvaluatorPromptCode,
        };

        const response = await generateReportMutation({
          input: { scenarioId, ...(scenarioVersionId && { scenarioVersionId }), config },
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // Persist via the simulation form: marks it dirty and saves the prompt
      // onto the scenario through the normal "save simulation" flow.
      onHelperPromptChange?.(prompt);
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

    const renderGeneratingPlaceholder = () => (
      <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3">
        <Loading small withOverlay={false} description="Generating report" />
        <span className="font-medium text-base text-typography-900">
          {REPORT_GENERATION_MESSAGES.GENERATING_REPORT}
        </span>
      </div>
    );

    const renderContent = () => {
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
                  evaluatorPromptCode={savedEvaluatorPromptCode}
                  onEvaluatorPromptChange={onEvaluatorPromptChange}
                  buttonText={REPORT_GENERATION_MESSAGES.REGENERATE_REPORT}
                  buttonDisabled={
                    showReportGenerationLoader || !areAllMandatoryFieldsFilled || hasUnsavedChanges
                  }
                  buttonTooltip={getButtonTooltipText()}
                  currentMainPromptName={currentMainPromptName}
                />
              </div>
            </details>

            {showReportGenerationLoader && renderGeneratingPlaceholder()}
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
            onPromptChange={handlePromptChange}
            onLanguageChange={language => setSelectedLanguage(language)}
            onTurnsChange={turns =>
              setSelectedTurns({ value: String(turns), label: `${turns} turns` })
            }
            onButtonClick={handleGenerate}
            evaluatorPromptCode={savedEvaluatorPromptCode}
            onEvaluatorPromptChange={onEvaluatorPromptChange}
            buttonText={REPORT_GENERATION_MESSAGES.GENERATE_REPORT}
            buttonDisabled={
              showReportGenerationLoader ||
              !helperAgentPrompt.trim() ||
              !areAllMandatoryFieldsFilled ||
              hasUnsavedChanges
            }
            buttonTooltip={getButtonTooltipText()}
            currentMainPromptName={currentMainPromptName}
          />
          {showReportGenerationLoader && renderGeneratingPlaceholder()}
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
                  {item.scenarioVersionId && versionLabelById[item.scenarioVersionId] && (
                    <span className="inline-flex w-fit items-center px-[6px] py-[1px] rounded-full text-[11px] bg-secondary-50 text-typography-700">
                      {versionLabelById[item.scenarioVersionId]}
                    </span>
                  )}
                  <span className="text-xs font-normal text-typography-600">
                    Skill version: {resolveMainPromptName(item.config.selectedMainPromptCode)}
                  </span>
                  <span className="text-xs font-normal text-typography-600">
                    Evaluator: {resolveEvaluatorPromptName(item.config.selectedEvaluatorPromptCode)}
                  </span>
                </div>
              </div>
            );

            return (
              <Accordion
                key={item.id}
                onChange={handleAccordionChange}
                customAccordionClassName={REPORT_ACCORDION_SX}
                headerTitle={historyItemHeader}
              >
                {item.config?.helperAgentPrompt && (
                  // The helper-agent prompt is snapshotted per report and can
                  // differ between runs, so each history entry shows the exact
                  // prompt it used (read-only). Scrollable to keep long prompts
                  // from blowing out the accordion height.
                  <div className="border border-gray-200 rounded-lg p-4 mb-3">
                    <p className="text-sm font-medium text-typography-900 mb-1">
                      Helper Agent prompt
                    </p>
                    <p className="text-xs text-typography-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {item.config.helperAgentPrompt}
                    </p>
                  </div>
                )}
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
                <Loading small withOverlay={false} description="Loading more" className="mx-2" />
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
