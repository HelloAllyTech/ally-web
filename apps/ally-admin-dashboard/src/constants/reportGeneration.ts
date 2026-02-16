export const REPORT_GENERATION_MESSAGES = {
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

export const LANGUAGE_OPTIONS = [
  { value: "1", label: "English" },
  { value: "2", label: "Spanish" },
  { value: "3", label: "French" },
  { value: "4", label: "German" },
  { value: "5", label: "Chinese" },
];

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

export const DEFAULT_HELPER_PROMPT = `You are a test helper agent designed to simulate a client seeking counseling support.
Your goal is to engage authentically with the roleplay agent, expressing realistic emotions, concerns, and responses.

Guidelines:
- Be genuine and emotionally authentic
- Share concerns and feelings naturally
- Respond to the counselor's interventions realistically
- Show appropriate vulnerability
- Ask clarifying questions when needed
- Display a range of emotions appropriate to the scenario`;

export enum ReportGenerationStatus {
  STARTED = "STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}
