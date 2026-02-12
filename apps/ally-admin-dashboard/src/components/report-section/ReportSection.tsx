import { FC, useState, useEffect } from "react";

import { toast } from "sonner";

import {
  useGetReportsQuery,
  useLazyGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  DEFAULT_HELPER_PROMPT,
  DEFAULT_LANGUAGE,
  DEFAULT_TURNS,
  DETAILS_STYLES,
  GENERATION_DELAY_MS,
  MAX_PROGRESS_BEFORE_COMPLETE,
  PROGRESS_INCREMENT_MAX,
  PROGRESS_UPDATE_INTERVAL_MS,
  REPORT_GENERATION_MESSAGES,
} from "@constants";
import { ReportData, ReportConfig } from "@types";

import PromptConfiguration from "../prompt-configuration/PromptConfiguration";
import ReportContent from "../report-content/ReportContent";
import TabButton from "../tab-button/TabButton";

export interface ReportSectionProps {
  scenarioId?: string;
}

export const ReportSection: FC<ReportSectionProps> = ({ scenarioId }) => {
  const [helperAgentPrompt, setHelperAgentPrompt] = useState(DEFAULT_HELPER_PROMPT);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [selectedTurns, setSelectedTurns] = useState(DEFAULT_TURNS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "transcription">("report");
  const [primaryActiveTab, setPrimaryActiveTab] = useState<"report" | "history">("report");
  const [reportId, setReportId] = useState<string | null>(null);

  const [generateReportMutation] = useGenerateReportMutation();
  const [getReportById, { data: fetchedReportData }] = useLazyGetReportByIdQuery();
  const { data: reportsHistory } = useGetReportsQuery(
    { input: { scenarioId: scenarioId! } },
    { skip: !scenarioId },
  );
  const [cancelReportGenerationMutation] = useCancelReportGenerationMutation();

  // Fetch report data when reportId changes
  useEffect(() => {
    if (reportId) {
      getReportById({ id: reportId });
    }
  }, [reportId, getReportById]);

  // Update reportData when fetched data is available
  useEffect(() => {
    if (fetchedReportData) {
      setReportData(fetchedReportData);
    }
  }, [fetchedReportData]);

  // Simulate progress during generation
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      return undefined;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= MAX_PROGRESS_BEFORE_COMPLETE) return prev;
        return prev + Math.random() * PROGRESS_INCREMENT_MAX;
      });
    }, PROGRESS_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const generateReport = async (config: ReportConfig) => {
    if (!scenarioId) return null;
    try {
      const response = await generateReportMutation({
        input: { scenarioId: scenarioId, config: config },
      });
      return response.data;
    } catch {
      toast.error("Failed to generate report");
      return null;
    }
  };

  const simulateGeneration = async () => {
    toast.success(REPORT_GENERATION_MESSAGES.GENERATING);
    await new Promise(resolve => setTimeout(resolve, GENERATION_DELAY_MS));
    setProgress(100);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportData(null);
    try {
      await simulateGeneration();
      const config: ReportConfig = {
        languageId: Number(selectedLanguage.value),
        turns: Number(selectedTurns.value),
        helperAgentPrompt: helperAgentPrompt,
      };
      const response = await generateReport(config);
      setReportId(response?.reportId);
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const handleCancel = async () => {
    if (!reportId) return;
    try {
      await cancelReportGenerationMutation({ reportId: reportId });
      setReportId(null);
      setProgress(0);
      setIsGenerating(false);
    } catch {
      toast.error("Failed to cancel report generation");
    }
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

          {/* Test Configuration Accordion */}
          <details className="border border-gray-200 rounded-lg" open>
            <summary className="px-4 py-3 cursor-pointer font-medium text-base text-typography-900 hover:bg-gray-50 flex items-center justify-between list-none">
              <span>{REPORT_GENERATION_MESSAGES.TEST_CONFIGURATION}</span>
              <svg
                className="w-5 h-5 transition-transform details-arrow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-6 py-4 border-t border-gray-200">
              <PromptConfiguration
                prompt={reportData.config.helperAgentPrompt}
                language={reportData.config.languageId.toString()}
                turns={reportData.config.turns}
                onLanguageChange={language => {
                  setReportData(prev =>
                    prev
                      ? {
                          ...prev,
                          config: { ...prev.config, languageId: parseInt(language) },
                        }
                      : null,
                  );
                }}
                onTurnsChange={turns => {
                  setReportData(prev =>
                    prev
                      ? {
                          ...prev,
                          testConfiguration: { ...prev.config, turns },
                        }
                      : null,
                  );
                }}
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

  const renderHistoryList = () => (
    <div className="flex flex-col gap-2 w-full max-w-[800px]">
      {reportsHistory?.data.map((item, index) => (
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
            <svg
              className="w-5 h-5 transition-transform details-arrow text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <ReportContent reportData={item} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </details>
      ))}
    </div>
  );

  const renderMainContent = () => {
    if (primaryActiveTab === "history") {
      return renderHistoryList();
    }
    return renderContent();
  };

  const headerContent = reportData ? (
    <div className="sticky flex gap-8 flex-row top-0 z-10 pt-3 mx-6 border-b border-border-light">
      <TabButton
        label={REPORT_GENERATION_MESSAGES.REPORT}
        isActive={primaryActiveTab === "report"}
        onClick={() => setPrimaryActiveTab("report")}
      />
      <TabButton
        label={REPORT_GENERATION_MESSAGES.HISTORY}
        isActive={primaryActiveTab === "history"}
        onClick={() => setPrimaryActiveTab("history")}
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
