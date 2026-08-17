import { ReportData } from "@types";

export enum SocketEvent {
  CONNECTED = "CONNECTED",
  JOIN_USER_REPORTS_ROOM = "JOIN_USER_REPORTS_ROOM",
  JOIN_SCENARIO_REPORT_ROOM = "JOIN_SCENARIO_REPORT_ROOM",
  REPORTS_UPDATED = "REPORTS_UPDATED",
  JOIN_USER_TRANSLATIONS_ROOM = "JOIN_USER_TRANSLATIONS_ROOM",
  TRANSLATION_PROGRESS = "TRANSLATION_PROGRESS",
  // Course translation runs on its own namespace and its own room/event names,
  // so a scenario run and a course run cannot be mistaken for one another.
  JOIN_USER_TRACK_TRANSLATIONS_ROOM = "JOIN_USER_TRACK_TRANSLATIONS_ROOM",
  TRACK_TRANSLATION_PROGRESS = "TRACK_TRANSLATION_PROGRESS",
  DISCONNECT = "DISCONNECT",
}

export enum ScenarioTranslationStatus {
  STARTED = "STARTED",
  TRANSLATING = "TRANSLATING",
  TRANSLATED = "TRANSLATED",
  LANGUAGE_FAILED = "LANGUAGE_FAILED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ScenarioTranslationAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
}

export type TranslationProgressPayload = {
  jobId: string;
  scenarioId?: number;
  scenarioTitle?: string;
  action: ScenarioTranslationAction;
  status: ScenarioTranslationStatus;
  language?: string;
  completed: number;
  total: number;
  error?: string;
  emittedAt: string;
};

export type ConnectedEventPayload = {
  userId: string;
  message: string;
};

export type JoinUserReportsRoomPayload = {
  lookbackMinutes?: number;
};

export type JoinScenarioReportsRoomPayload = {
  reportId: string;
};

export type ReportsUpdatedPayload = {
  data: ReportData[];
  count: number;
};
