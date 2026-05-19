import { ScenarioTranslationAction } from "@types";

export type TranslationLanguageStatus = "pending" | "translating" | "translated" | "failed";

export type TranslationLanguageProgress = {
  code: string;
  status: TranslationLanguageStatus;
  error?: string;
};

export type TranslationJobOverallStatus = "started" | "in_progress" | "completed" | "failed";

export type TranslationJob = {
  jobId: string;
  scenarioId?: number;
  scenarioTitle?: string;
  action: ScenarioTranslationAction;
  status: TranslationJobOverallStatus;
  completed: number;
  total: number;
  languages: TranslationLanguageProgress[];
  error?: string;
  startedAt: number;
  completedAt?: number;
};

export type TranslationProgressToastProps = {
  jobs: TranslationJob[];
  onDismiss: (jobId: string) => void;
};
