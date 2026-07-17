export const REPORT_GENERATION_MESSAGES = {
  GENERATING: "Report generating...",
  GENERATING_REPORT: "Generating Report...",
  CANCEL: "Cancel",
  GENERATE_REPORT: "Generate Report",
  REGENERATE_REPORT: "Regenerate Report",
  REPORT: "Report",
  HISTORY: "History",
  TRANSCRIPTION: "Transcript",
  TEST_CONFIGURATION: "Test configuration",
  HELPER_AGENT_PROMPT: "Helper Agent prompt",
  SIMULATION_SCORE: "Simulation Score",
  METRICS: "Performance Metrics",
  TRANSCRIPTION_PLACEHOLDER: "Transcription content will be displayed here",
  PROMPT_PLACEHOLDER: "Enter helper agent prompt...",
};

export const TURNS_OPTIONS = [
  { value: "10", label: "10 turns" },
  { value: "20", label: "20 turns" },
  { value: "30", label: "30 turns" },
  { value: "50", label: "50 turns" },
  { value: "100", label: "100 turns" },
];

export const DEFAULT_LANGUAGE = { value: "1", label: "English" };
export const DEFAULT_TURNS = { value: "50", label: "50 turns" };

export const PROGRESS_UPDATE_INTERVAL_MS = 500;
export const MAX_PROGRESS_BEFORE_COMPLETE = 90;
export const PROGRESS_INCREMENT_MAX = 15;

export const DETAILS_STYLES = `
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

export const DEFAULT_HELPER_PROMPT = `You are a mental healthcare worker`;

export enum ReportGenerationStatus {
  STARTED = "STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

// Carbon migration: the accordion no longer takes an MUI `sx` object. The
// custom Accordion component accepts a className string for its root container
// instead. This keeps the report-history look (bottom divider only, no shadow,
// square corners) that the MUI sx previously produced.
export const REPORT_ACCORDION_SX = "shadow-none border-b-[0.5px] border-[#dbdbdb] bg-white";

export enum ReportGenerationMetrics {
  COLLOQUIALISM = "colloquialism",
  CONSISTENCY = "consistency",
  CONTEXT_APPROPRIATENESS = "context_appropriateness",
  DIFFICULTY_LEVEL = "difficulty_level",
  GRADUAL_DISCLOSURE = "gradual_disclosure",
  RESISTANCE = "resistance",
}

export const REPORT_METRIC_CONFIG: Record<ReportGenerationMetrics, string> = {
  [ReportGenerationMetrics.COLLOQUIALISM]: "Colloquialism",
  [ReportGenerationMetrics.CONSISTENCY]: "Consistency",
  [ReportGenerationMetrics.CONTEXT_APPROPRIATENESS]: "Context Appropriateness",
  [ReportGenerationMetrics.DIFFICULTY_LEVEL]: "Difficulty Level",
  [ReportGenerationMetrics.GRADUAL_DISCLOSURE]: "Gradual Disclosure",
  [ReportGenerationMetrics.RESISTANCE]: "Resistance",
};
