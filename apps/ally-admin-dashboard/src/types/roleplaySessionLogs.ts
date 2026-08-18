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
  /** Display label of the session's language (e.g. "English"), null if unresolved. */
  language: string | null;
  createdAt: string;
  /** Total LLM tokens consumed; null when no usage is correlated. */
  totalTokens: number | null;
  /** Estimated USD cost across LLM/STT/TTS; null when no usage is correlated. */
  estimatedCostUsd: number | null;
  /** False when at least one usage bucket had no pricing entry. */
  costPriced: boolean;
  /** True when this session was started by the super-admin V2V test tool. */
  isV2VTest: boolean;
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
  avgSttFinalizeMs: number | null;
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
}

export interface RoleplaySessionRecording {
  storageKey: string;
  egressId: string;
  /** Short-lived presigned S3 playback URL; null when the bucket isn't configured. */
  url: string | null;
}

export interface RoleplaySessionFeedback {
  rating: number;
  feedback: string | null;
  tags: string[];
}

/** A superadmin-configured agent test case the actor is scored against. */
export interface RoleplaySessionAgentTestCase {
  id: string;
  title: string;
  tags: string[];
  description: string | null;
}

/** LLM-judge evaluation of the roleplay actor against the agent test cases. */
export interface RoleplaySessionActorEvaluation {
  /** round(mean(applicable metrics)); null when no goal applied to this session. */
  compositeScore: number | null;
  /** Goal/metric name -> 0-100 score. Includes goals marked not applicable. */
  metrics: Record<string, number> | null;
  /**
   * Titles from `metrics` the conversation gave no occasion to demonstrate.
   * Their scores are excluded from `compositeScore` and must be shown as N/A —
   * rendering one as a low score reads as a failure the actor never had a
   * chance to avoid. Empty for sessions judged before applicability existed.
   */
  notApplicableGoals: string[];
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

export type RoleplaySessionLifecycleType =
  | "ROOM_CREATED"
  | "AGENT_DISPATCHED"
  | "PARTICIPANT_JOINED"
  | "AGENT_JOINED"
  | "AGENT_LEFT"
  | "RECORDING_STARTED"
  | "ROOM_FINISHED";

export interface RoleplaySessionLifecycleEvent {
  id: string;
  // Server may add new types over time, so keep it open but hint the known set.
  type: RoleplaySessionLifecycleType | string;
  occurredAt: string;
  detail: Record<string, unknown> | null;
}

export interface RoleplaySessionLogDetail extends RoleplaySessionLogRow {
  summary: Record<string, unknown> | null;
  scenarioVersionId: string | null;
  voiceId: string | null;
  totalPausedMs: number | null;
  usage: RoleplaySessionUsage | null;
  models: RoleplaySessionModels | null;
  latency: RoleplaySessionLatency | null;
  recording: RoleplaySessionRecording | null;
  feedback: RoleplaySessionFeedback | null;
  actorEvaluation: RoleplaySessionActorEvaluation | null;
  /** The config this session ran under (prompt/scenario version, LLM settings). */
  runConfig: RoleplaySessionRunConfig | null;
  agentTestCases: RoleplaySessionAgentTestCase[];
  events: RoleplaySessionLogEvent[];
  lifecycle: RoleplaySessionLifecycleEvent[];
  suspectedFreeze: boolean;
  transcript: RoleplaySessionLogMessage[];
  /** Language-quality judge result (latest run); null when not judged yet. */
  languageQuality: RoleplaySessionLanguageQuality | null;
  /** Conversation-drift judgment (latest run); null when not drift-judged. */
  drift: RoleplaySessionDrift | null;
  /** Glossary delivery/retrieval/adherence; null for non-glossary sessions. */
  languageGlossary: RoleplaySessionGlossary | null;
  /**
   * The five weak-performing metrics for THIS session — the same ones the
   * analytics tab trends, so a bad bucket there can be opened and read turn
   * by turn. Carries raw counts as well as rates: on one session "1 of 3
   * turns" and "33%" are very different statements.
   */
  weakMetrics: RoleplaySessionWeakMetrics | null;
}

/** One weak-performing metric, as it stands for a single session. */
export interface RoleplaySessionWeakMetric {
  id: string;
  label: string;
  /** Which of the five metrics this belongs to. */
  group: string;
  numerator: number;
  denominator: number;
  /** null when the denominator is 0 — no data, as distinct from a clean zero. */
  value: number | null;
  unit: "percent" | "per100turns" | "ratio" | "count" | string;
  /** measured | partial | none — how far to trust this line. */
  state: string;
  /** Why this session tripped the metric, when it did. */
  detail: string | null;
}

export interface RoleplaySessionWeakMetrics {
  metricsVersion: string;
  /** False when this session carries no judge rows. */
  judged: boolean;
  metrics: RoleplaySessionWeakMetric[];
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
  /** Restrict to a language, matched against languages.value (e.g. "ta-IN"). */
  language?: string;
  sortBy?: "createdAt" | "startedAt" | "endedAt" | "score" | "status";
  order?: "ASC" | "DESC";
  /** true = only V2V test sessions, false = only real sessions, omit = all */
  isV2VTest?: boolean;
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

/** One language-quality error annotation on an AI turn (latest judge run). */
export interface RoleplaySessionLanguageAnnotation {
  turnIndex: number;
  /** scenario_session_messages.id of the AI turn — the transcript badge anchor. */
  messageId: number | null;
  layer: string;
  dimension: string;
  category: string;
  severity: string; // minor | major | critical
  isolationBasis: string | null;
  inputGarbled: string | null;
  conditionedOut: boolean;
  evidenceQuote: string | null;
  reasoning: string | null;
}

export interface RoleplaySessionLanguageQuality {
  judgeModel: string;
  judgePromptVersion: string;
  turnsJudged: number;
  turnsGarbled: number;
  errorCount: number;
  /** % of turns rendered cleanly in the target script; null = unmeasured. */
  scriptFidelityPct: number | null;
  /** Round-trip WER/CER % over a sample of this session's turns; null = unmeasured. */
  roundTripWerPct: number | null;
  annotations: RoleplaySessionLanguageAnnotation[];
}

/** One drift-judged AI turn (latest drift judge run). */
export interface RoleplaySessionDriftTurn {
  turnIndex: number;
  messageId: number | null;
  coherence: string | null;
  topicLabel: string | null;
  inCharacter: boolean | null;
  counselorUtteranceGarbled: string | null;
  sttErrorType: string | null;
  aiReplyFailureMode: string | null;
  rootAttribution: string | null;
  reasoning: string | null;
}

export interface RoleplaySessionDrift {
  judgeModel: string;
  judgePromptVersion: string;
  sessionDrifted: boolean | null;
  firstDriftTurn: number | null;
  turns: RoleplaySessionDriftTurn[];
}

/** One avoid-listed term found in the session's agent utterances. */
export interface RoleplaySessionGlossaryViolation {
  term: string;
  sectionCode: string;
  count: number;
  examples: string[];
}

/** Deterministic avoid-list scan of this session's agent transcript. */
export interface RoleplaySessionGlossaryAdherence {
  agentMessageCount: number;
  totalViolations: number;
  violations: RoleplaySessionGlossaryViolation[];
}

/** One Tier 1 glossary section's retrieval-hit count within the session. */
export interface RoleplaySessionGlossarySectionHit {
  sectionCode: string;
  count: number;
}

/**
 * Language-glossary delivery + retrieval + adherence for this session.
 * `active: false` means the session never received a glossary (English, the
 * language has nothing published, or the simulation's canary gate was off).
 */
export interface RoleplaySessionGlossary {
  active: boolean;
  tier0Chars: number | null;
  tier0Tokens: number | null;
  tier1SectionsShipped: number | null;
  /** sectionCode -> published version this session was served. */
  versions: Record<string, number> | null;
  totalTurns: number;
  turnsWithGlossaryRetrieval: number;
  sectionHitCounts: RoleplaySessionGlossarySectionHit[];
  /** null when the language defines no avoid-terms to check. */
  adherence: RoleplaySessionGlossaryAdherence | null;
}

export interface RoleplaySessionScenarioVersion {
  id: string;
  versionNumber: number | null;
  name: string | null;
}

/** The configuration a session ran under (prompt/scenario version + LLM settings). */
export interface RoleplaySessionRunConfig {
  scenarioVersion: RoleplaySessionScenarioVersion | null;
  /** {promptCode: version} captured at session start; null when not recorded. */
  promptVersions: Record<string, string | number> | null;
  /** promptCode of the main-agent prompt this simulation selected; null = default. */
  selectedMainPromptCode: string | null;
  /** Effective variant this session ran: "GENERIC" | "MULTILINGUAL"; null for older sessions. */
  mainPromptVariant: string | null;
  llmProvider: string | null;
  llmModel: string | null;
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
  /** STT provider/model configured for the session's language (config source). */
  sttProvider: string | null;
  sttModel: string | null;
}
