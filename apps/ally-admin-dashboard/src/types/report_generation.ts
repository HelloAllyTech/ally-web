import { ReportGenerationStatus } from "@constants";

export type ReportData = {
  id: string;
  scenarioId: string;
  score: number;
  config: ReportConfig;
  metrics: ReportMetric;
  createdAt: string;
  updatedAt: string;
  status: string;
  transcripts?: TranscriptMessage[];
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
  turns: number;
};

export type ReportMetric = {
  [key: string]: number;
};

export type GetReportsInput = {
  scenarioId: string;
  status?: ReportGenerationStatus;
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
};
