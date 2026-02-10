import { FC, useState, useEffect } from "react";

import { toast } from "sonner";

import { Button, CustomDropdownField } from "@components";
import { ButtonVariant } from "@components/types";
// Constants
const DETAILS_STYLES = `
  details[open] .details-arrow {
    transform: rotate(180deg);
  }
  details summary::-webkit-details-marker {
    display: none;
  }
  details summary::marker {
    display: none;
  }
`;

const DEFAULT_HELPER_PROMPT = `You are a test helper agent designed to simulate a client seeking counseling support.
Your goal is to engage authentically with the roleplay agent, expressing realistic emotions, concerns, and responses.

Guidelines:
- Be genuine and emotionally authentic
- Share concerns and feelings naturally
- Respond to the counselor's interventions realistically
- Show appropriate vulnerability
- Ask clarifying questions when needed
- Display a range of emotions appropriate to the scenario`;

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Chinese", label: "Chinese" },
];

const TURNS_OPTIONS = [
  { value: "10", label: "10 turns" },
  { value: "20", label: "20 turns" },
  { value: "30", label: "30 turns" },
  { value: "50", label: "50 turns" },
  { value: "100", label: "100 turns" },
];

const DEFAULT_LANGUAGE = { value: "English", label: "English" };
const DEFAULT_TURNS = { value: "50", label: "50 turns" };

const GENERATION_DELAY_MS = 5000;
const PROGRESS_UPDATE_INTERVAL_MS = 500;
const MAX_PROGRESS_BEFORE_COMPLETE = 90;
const PROGRESS_INCREMENT_MAX = 15;

const DUMMY_METRICS = [
  { name: "Metric 1", percentage: 60, color: "#4A90E2" },
  { name: "Metric 2", percentage: 90, color: "#7ED321" },
  { name: "Metric 3", percentage: 40, color: "#F5A623" },
];

const MESSAGES = {
  GENERATING: "Report generating...",
  GENERATING_REPORT: "Generating Report...",
  CANCEL: "Cancel",
  GENERATE_REPORT: "Generate Report",
  REGENERATE_REPORT: "Regenerate Report",
  REPORT: "Report",
  HISTORY: "History",
  TRANSCRIPTION: "Transcription",
  TEST_CONFIGURATION: "Test configuration",
  HELPER_AGENT_PROMPT: "Helper Agent prompt",
  SIMULATION_SCORE: "Simulation Score",
  METRICS: "Metrics",
  TRANSCRIPTION_PLACEHOLDER: "Transcription content will be displayed here",
  PROMPT_PLACEHOLDER: "Enter helper agent prompt...",
};

export interface ReportSectionProps {
  onGenerate?: (prompt: string, language: string, turns: number) => void;
  onCancel?: () => void;
}

interface PromptConfigurationProps {
  prompt: string;
  language: string;
  turns: number;
  onPromptChange?: (prompt: string) => void;
  onLanguageChange: (language: string) => void;
  onTurnsChange: (turns: number) => void;
  onButtonClick: () => void;
  buttonText: string;
  buttonDisabled?: boolean;
}

const PromptConfiguration: FC<PromptConfigurationProps> = ({
  prompt,
  language,
  turns,
  onPromptChange,
  onLanguageChange,
  onTurnsChange,
  onButtonClick,
  buttonText,
  buttonDisabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Helper Agent Prompt */}
      <div>
        <label className="text-sm font-medium text-typography-900 mb-2 block">
          {MESSAGES.HELPER_AGENT_PROMPT}
        </label>
        <textarea
          value={prompt}
          onChange={e => onPromptChange?.(e.target.value)}
          className="w-full min-h-[320px] bg-white p-4 border border-gray-200 rounded-lg font-primary text-base resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          placeholder={MESSAGES.PROMPT_PLACEHOLDER}
        />
      </div>

      {/* Language, Turns, and Button */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <CustomDropdownField
            options={LANGUAGE_OPTIONS}
            placeholder="Select language"
            customStyle={{ minWidth: "100px" }}
            defaultOption={{
              value: language,
              label: language,
            }}
            onHandleSelect={option => onLanguageChange(option.value)}
          />
        </div>

        <div className="flex-1">
          <CustomDropdownField
            options={TURNS_OPTIONS}
            placeholder="Select turns"
            customStyle={{ minWidth: "100px" }}
            defaultOption={{
              value: String(turns),
              label: `${turns} turns`,
            }}
            onHandleSelect={option => onTurnsChange(Number(option.value))}
          />
        </div>

        <div className="flex-shrink-0">
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={onButtonClick}
            disabled={buttonDisabled}
            className="px-6 py-2.5 h-[42px]"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ReportData {
  simulationScore: number;
  metrics: Array<{
    name: string;
    percentage: number;
    color: string;
  }>;
  testConfiguration: {
    language: string;
    turns: number;
    prompt: string;
  };
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: FC<TabButtonProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-3 px-1 text-base font-medium transition-colors relative ${
      isActive ? "text-primary-500" : "text-gray-500 hover:text-gray-700"
    }`}
  >
    {label}
    {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />}
  </button>
);

export const ReportSection: FC<ReportSectionProps> = ({ onCancel }) => {
  const [helperAgentPrompt, setHelperAgentPrompt] = useState(DEFAULT_HELPER_PROMPT);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [selectedTurns, setSelectedTurns] = useState(DEFAULT_TURNS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "transcription">("report");
  const [primaryActiveTab, setPrimaryActiveTab] = useState<"report" | "history">("report");

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

  const generateReportData = (
    config: { language: string; turns: number; prompt: string },
    isRegenerate = false,
  ): ReportData => {
    const baseScore = isRegenerate ? Math.floor(Math.random() * 30) + 70 : 87;
    const metrics = isRegenerate
      ? [
          { name: "Metric 1", percentage: Math.floor(Math.random() * 40) + 50, color: "#4A90E2" },
          { name: "Metric 2", percentage: Math.floor(Math.random() * 40) + 50, color: "#7ED321" },
          { name: "Metric 3", percentage: Math.floor(Math.random() * 40) + 30, color: "#F5A623" },
        ]
      : DUMMY_METRICS;

    return {
      simulationScore: baseScore,
      metrics,
      testConfiguration: config,
    };
  };

  const simulateGeneration = async () => {
    toast.success(MESSAGES.GENERATING);
    await new Promise(resolve => setTimeout(resolve, GENERATION_DELAY_MS));
    setProgress(100);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportData(null);
    try {
      await simulateGeneration();
      const config = {
        language: selectedLanguage.value,
        turns: Number(selectedTurns.value),
        prompt: helperAgentPrompt,
      };
      setReportData(generateReportData(config));
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const handleCancel = () => {
    setIsGenerating(false);
    setProgress(0);
    onCancel?.();
  };

  const handleGenerateNew = async () => {
    if (!reportData) return;

    setIsGenerating(true);
    const currentConfig = reportData.testConfiguration;

    try {
      await simulateGeneration();
      setReportData(generateReportData(currentConfig, true));
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center w-full h-[400px] gap-8">
      <div className="text-xl font-normal text-typography-900 font-primary">
        {MESSAGES.GENERATING_REPORT}
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
        {MESSAGES.CANCEL}
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
              <span>{MESSAGES.TEST_CONFIGURATION}</span>
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
                prompt={reportData.testConfiguration.prompt}
                language={reportData.testConfiguration.language}
                turns={reportData.testConfiguration.turns}
                onLanguageChange={language => {
                  setReportData(prev =>
                    prev
                      ? {
                          ...prev,
                          testConfiguration: { ...prev.testConfiguration, language },
                        }
                      : null,
                  );
                }}
                onTurnsChange={turns => {
                  setReportData(prev =>
                    prev
                      ? {
                          ...prev,
                          testConfiguration: { ...prev.testConfiguration, turns },
                        }
                      : null,
                  );
                }}
                onButtonClick={handleGenerateNew}
                buttonText={MESSAGES.REGENERATE_REPORT}
              />
            </div>
          </details>

          {/* Report and Transcription Tabs */}
          <div className="flex gap-8 border-b border-gray-200">
            <TabButton
              label={MESSAGES.REPORT}
              isActive={activeTab === "report"}
              onClick={() => setActiveTab("report")}
            />
            <TabButton
              label={MESSAGES.TRANSCRIPTION}
              isActive={activeTab === "transcription"}
              onClick={() => setActiveTab("transcription")}
            />
          </div>

          {/* Tab Content */}
          {activeTab === "report" ? (
            <div className="flex flex-col gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-typography-900">
                    {MESSAGES.SIMULATION_SCORE}
                  </span>
                  <span className="text-5xl font-semibold text-typography-900">
                    {reportData.simulationScore}
                  </span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-medium text-typography-900 mb-6">
                  {MESSAGES.METRICS}
                </h3>
                <div className="space-y-6">
                  {reportData.metrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{metric.name}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {metric.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${metric.percentage}%`,
                            backgroundColor: metric.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
              <p className="text-gray-500">{MESSAGES.TRANSCRIPTION_PLACEHOLDER}</p>
            </div>
          )}
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
          buttonText={MESSAGES.GENERATE_REPORT}
          buttonDisabled={isGenerating || !helperAgentPrompt.trim()}
        />
      </div>
    );
  };

  const headerContent = reportData ? (
    <div className="sticky flex gap-8 flex-row top-0 z-10 pt-3 mx-6 border-b border-border-light">
      <TabButton
        label={MESSAGES.REPORT}
        isActive={primaryActiveTab === "report"}
        onClick={() => setPrimaryActiveTab("report")}
      />
      <TabButton
        label={MESSAGES.HISTORY}
        isActive={primaryActiveTab === "history"}
        onClick={() => setPrimaryActiveTab("history")}
      />
    </div>
  ) : (
    <div className="sticky flex flex-row justify-between top-0 z-10 pt-3 mx-6 pb-4 border-b border-border-light">
      <h2 className="text-lg font-medium text-typography-900">{MESSAGES.REPORT}</h2>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-100%">
      {headerContent}

      <div className="p-6 pt-4 overflow-y-auto h-full custom-scrollbar">{renderContent()}</div>
    </div>
  );
};
