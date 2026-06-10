import { ReportGenerationStatus } from "@constants/reportGeneration";

export type ReportData = {
  id: string;
  scenarioId: string;
  config: ReportConfig;
  language?: {
    id?: number;
    label?: string;
  };
  metrics: ReportMetric;
  reportMarkdown?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  transcripts?: TranscriptMessage[];
  scenarioTitle?: string;
  /**
   * Human-readable failure reason from ai-learn (only set when
   * status === FAILED). Mirrored from server-side
   * scenario_reports.metadata.errorMessage by the GET endpoint so the
   * studio can surface it in a toast without digging into metadata.
   */
  errorMessage?: string;
};

export type HistoryItem = {
  id: number;
  timestamp: string;
  language: string;
  turns: number;
  reportData: ReportData;
};

export type ReportConfig = {
  helperAgentPrompt: string;
  languageId: number;
  languageName: string;
  turns: number;
  /**
   * promptCode of the main-agent variant ("skill") this report was
   * generated with, snapshotted server-side at generation time. Undefined
   * for reports generated before this was captured, or when the scenario
   * was on the default variant.
   */
  selectedMainPromptCode?: string;
};

export type ReportMetric = {
  [key: string]: number;
};

export type GetReportsInput = {
  scenarioId: string;
  statuses?: ReportGenerationStatus;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
};

export type GenerateReportInput = {
  scenarioId: string;
  config: ReportConfig;
};

export type GenerateReportResponse = {
  id: string;
  status: ReportGenerationStatus;
};

export type TranscriptMessage = {
  id: number;
  content: string;
  role: string;
  startSeconds: number;
  createdAt: string;
  updatedAt: string;
  scenarioReportId: string;
};

export type GetReportTranscriptInput = {
  reportId: string;
  limit?: number;
  offset?: number;
};

export type GetReportTranscriptResponse = {
  messages: TranscriptMessage[];
  total?: number;
};
