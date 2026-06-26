export type RoleplaySessionStatus = "ACTIVE" | "ENDED";

/** A single row in the super-admin roleplay-session-logs table. */
export interface RoleplaySessionLogRow {
  id: string;
  counselorId: number;
  counselorName: string | null;
  counselorEmail: string | null;
  tenantId: string;
  orgName: string | null;
  scenarioId: number;
  scenarioTitle: string | null;
  status: RoleplaySessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  platform: string | null;
  createdAt: string;
  /** Total LLM tokens consumed; null when no usage is correlated. */
  totalTokens: number | null;
  /** Estimated USD cost across LLM/STT/TTS; null when no usage is correlated. */
  estimatedCostUsd: number | null;
  /** False when at least one usage bucket had no pricing entry. */
  costPriced: boolean;
}

/** A (provider, model) pair used by one of the AI services. */
export interface RoleplaySessionModelRef {
  provider: string;
  model: string;
}

/** Distinct models the session used, grouped by AI service. */
export interface RoleplaySessionModels {
  llm: RoleplaySessionModelRef[];
  stt: RoleplaySessionModelRef[];
  tts: RoleplaySessionModelRef[];
}

/** One usage bucket, grouped by (service, provider, model). */
export interface RoleplaySessionServiceUsage {
  service: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  audioMs: number;
  characters: number;
  calls: number;
  estimatedCostUsd: number;
  priced: boolean;
}

/** Token / audio / character consumption + estimated cost for the session. */
export interface RoleplaySessionUsage {
  llmPromptTokens: number;
  llmCompletionTokens: number;
  llmTotalTokens: number;
  llmCachedTokens: number;
  sttAudioMs: number;
  ttsCharacters: number;
  totalTokens: number;
  estimatedCostUsd: number;
  priced: boolean;
  byServiceModel: RoleplaySessionServiceUsage[];
}

/** Per-session voice-pipeline latency + quality (pipeline turns only). */
export interface RoleplaySessionLatency {
  turnCount: number;
  avgResponseLatencyMs: number | null;
  p50ResponseLatencyMs: number | null;
  p95ResponseLatencyMs: number | null;
  avgEouDelayMs: number | null;
  avgLlmTtftMs: number | null;
  avgTtsTtfbMs: number | null;
  avgOrchestrationMs: number | null;
  avgLlmResponseMs: number | null;
  avgProsodyMs: number | null;
  avgBranchingMs: number | null;
  avgKnowledgeRetrievalMs: number | null;
  avgProcessEventsMs: number | null;
  avgBehaviorsMs: number | null;
  interruptedTurns: number;
  llmTimedOutTurns: number;
  prosodySkippedTurns: number;
}

export interface RoleplaySessionRecording {
  storageKey: string;
  egressId: string;
}

export interface RoleplaySessionFeedback {
  rating: number;
  feedback: string | null;
  tags: string[];
}

/** A superadmin-configured optimisation goal the actor is scored against. */
export interface RoleplaySessionOptimisationGoal {
  id: string;
  title: string;
  category: string;
  description: string | null;
}

/** LLM-judge evaluation of the roleplay actor against the optimisation goals. */
export interface RoleplaySessionActorEvaluation {
  compositeScore: number | null;
  /** Goal/metric name -> 0-100 score. */
  metrics: Record<string, number> | null;
  markdown: string | null;
  /** IN_PROGRESS | COMPLETED | FAILED. */
  status: string | null;
  evaluatedAt: string | null;
  passThreshold: number;
  pass: boolean | null;
}

export interface RoleplaySessionLogEvent {
  id: string;
  eventId: string;
  eventName: string | null;
  occurredAt: string;
  score: number | null;
  emoji: string | null;
  message: string | null;
}

export interface RoleplaySessionLogMessage {
  id: number;
  senderId: number;
  content: string;
  startSeconds: number | null;
  endSeconds: number | null;
  createdAt: string;
}

export interface RoleplaySessionLogDetail extends RoleplaySessionLogRow {
  summary: Record<string, unknown> | null;
  scenarioVersionId: string | null;
  language: string | null;
  voiceId: string | null;
  totalPausedMs: number | null;
  usage: RoleplaySessionUsage | null;
  models: RoleplaySessionModels | null;
  latency: RoleplaySessionLatency | null;
  recording: RoleplaySessionRecording | null;
  feedback: RoleplaySessionFeedback | null;
  actorEvaluation: RoleplaySessionActorEvaluation | null;
  optimisationGoals: RoleplaySessionOptimisationGoal[];
  events: RoleplaySessionLogEvent[];
  transcript: RoleplaySessionLogMessage[];
}

export interface RoleplaySessionLogsResponse {
  data: RoleplaySessionLogRow[];
  total: number;
}

/** Query params accepted by GET /v1/roleplay-session-logs. */
export interface RoleplaySessionLogsParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: RoleplaySessionStatus;
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
  sortBy?: "createdAt" | "startedAt" | "endedAt" | "score" | "status";
  order?: "ASC" | "DESC";
}

/** Superadmin V2V test session launch. */
export interface StartV2VTestParams {
  scenarioId: number;
  languageId: number;
  maxExchanges?: number;
}

export interface StartV2VTestResponse {
  scenarioSession?: { roomId?: string };
  isTestSession?: boolean;
  simulatedUserAgent?: string;
}
