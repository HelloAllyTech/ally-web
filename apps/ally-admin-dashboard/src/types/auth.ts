import { AppType, CallType, UserRole } from "@constants";

export interface GenerateOTPRequest {
  phone?: string;
  email?: string;
  appType?: AppType;
}

export interface VerifyOTPRequest {
  phone?: string;
  email?: string;
  otp: string;
}

export interface GenerateOTPResponse {
  success: boolean;
  expiresIn: number;
}

export interface VerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ImpersonateResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  profileImageUrl?: string;
  email: string;
  id: number;
  name: string;
  role: UserRole;
  userId: number;
}

export enum UserAvailabilityStatus {
  OFFLINE = "offline",
  AVAILABLE = "available",
}

// Per-user preferences blob stored in the backend `user_preferences.data` JSONB.
// Keys are merged independently on save (see backend upsert), so the admin
// dashboard can write `admin_sidebar_order` without clobbering mobile-owned keys.
export interface UserPreferencesData {
  default_language_id?: number;
  // Ordered list of sidebar item ids (SIDEBAR_ITEMS values) for the left nav.
  admin_sidebar_order?: string[];
}

export interface UserState {
  isAuthenticated: boolean;
  user: User;
  userStatus: UserAvailabilityStatus;
  permissions: string[];
  availableChatTypes: CallType[];
}

// Common API types and interfaces

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyGrowth: number;
}

export interface DashboardChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

// Analytics types
export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventType?: string;
}

export interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  conversionRate: number;
  topEvents: Array<{
    event: string;
    count: number;
  }>;
}

// Platform analytics (super-admin overview) — mirrors the backend
// AnalyticsOverviewResponseDto from GET /api/v1/analytics/overview.
export type AnalyticsRange = "30d" | "90d" | "12m";
export type AnalyticsBucket = "day" | "week" | "month";

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers30d: number;
  simsThisWeek: number;
  retentionRatePct: number;
}

export interface UserGrowthPoint {
  /** Bucket start (yyyy-mm-dd). */
  date: string;
  newUsers: number;
  cumulativeUsers: number;
}

export interface ActiveUsersPoint {
  /** Day (yyyy-mm-dd). */
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface SimulationsCompletedPoint {
  /** ISO week start (yyyy-mm-dd). */
  weekStart: string;
  count: number;
}

export interface RetentionPoint {
  /** ISO week start (yyyy-mm-dd). */
  weekStart: string;
  newUsers: number;
  returningUsers: number;
}

export interface UsersByRolePoint {
  role: string;
  count: number;
}

export interface AnalyticsOverviewResponse {
  summary: AnalyticsSummary;
  userGrowth: UserGrowthPoint[];
  activeUsers: ActiveUsersPoint[];
  simulationsCompleted: SimulationsCompletedPoint[];
  retention: RetentionPoint[];
  usersByRole: UsersByRolePoint[];
}

// Scribe-session analytics from GET /api/v1/analytics/scribe/*.
export interface ScribeTrendPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  count: number;
}

export interface ScribeCount {
  key: string;
  count: number;
}

export interface ScribeOverviewSummary {
  totalSessions: number;
  successRatePct: number;
  processing: number;
  noAudio: number;
  failed: number;
}

export interface ScribeOverviewResponse {
  range: AnalyticsRange;
  bucket: string;
  summary: ScribeOverviewSummary;
  sessionsTrend: ScribeTrendPoint[];
  outcomeBreakdown: ScribeCount[];
  modeBreakdown: ScribeCount[];
  captureBreakdown: ScribeCount[];
}

export interface ScribeFailureRatePoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  failed: number;
  terminal: number;
  /** failed / terminal (final, post-backfill), 0..1. */
  failureRate: number;
  /** Sessions whose FIRST attempt failed (write-once; post-rollout only). */
  firstAttemptFailed: number;
  firstAttemptTerminal: number;
  /** first-attempt failed / first-attempt terminal, 0..1. */
  firstAttemptFailureRate: number;
}

/** One phase on the pipeline drop-off funnel. */
export interface ScribePhaseFunnelPoint {
  phase: string;
  /** Sessions that reached AT LEAST this phase. */
  reached: number;
  /** Sessions whose furthest phase was exactly this. */
  stoppedHere: number;
}

/** Per-STT-provider try/success/fail over the per-attempt provider trail. */
export interface ScribeProviderStat {
  provider: string;
  tried: number;
  ok: number;
  failed: number;
}

export interface ScribeFailureSummary {
  totalTerminal: number;
  totalFailed: number;
  failureRatePct: number;
  retryableSharePct: number;
  timeoutSharePct: number;
}

export interface ScribeSummaryFailureResponse {
  range: AnalyticsRange;
  bucket: string;
  summary: ScribeFailureSummary;
  failureRateTrend: ScribeFailureRatePoint[];
  failureBreakdown: ScribeCount[];
  failuresByMode: ScribeCount[];
  failuresByCaptureMethod: ScribeCount[];
  /** Pipeline drop-off funnel (replaces the flat failure breakdown). */
  phaseFunnel: ScribePhaseFunnelPoint[];
  /** Per-STT-provider try/success/fail (populated once ally-ai emits it). */
  sttProviderStats: ScribeProviderStat[];
  /** Successful summaries by LLM model (populated once ally-ai emits it). */
  summaryModelStats: ScribeCount[];
}

// VoiceLatencyResponseDto from GET /api/v1/analytics/voice-latency.
export interface VoiceLatencyPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  /** 'pipeline' (live agent) or 'transcript' (historical, derived). */
  source: string;
  turns: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
}

export interface VoiceLatencyResponse {
  range: AnalyticsRange;
  /** Bucket granularity for this range ('day' | 'week' | 'month'). */
  bucket: string;
  /** Latency target line for reference (ms). */
  targetMs: number;
  points: VoiceLatencyPoint[];
}

// AgentJoinReliabilityResponseDto from GET /api/v1/analytics/agent-join-reliability.
export interface AgentJoinReliabilityPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  totalSessions: number;
  joinFailures: number;
  failureRatePct: number;
  midSessionDrops: number;
  joinLatencyP50Sec: number | null;
  joinLatencyP95Sec: number | null;
  conversations: number;
  suspectedFreezes: number;
  freezeRatePct: number;
}

export interface SessionOutcomeMix {
  completed: number;
  noConversation: number;
  inProgress: number;
}

export interface AgentJoinReliabilityResponse {
  range: AnalyticsRange;
  bucket: string;
  points: AgentJoinReliabilityPoint[];
  outcomeMix: SessionOutcomeMix;
}

// StartLatencyResponseDto from GET /api/v1/analytics/start-latency.
// "Time to first word": agent job start -> the agent begins its opening dialogue.
export interface StartLatencyPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  /** 'pipeline' (live, full segment breakdown) or 'transcript' (total only). */
  source: string;
  sessions: number;
  /** Total start latency (ms). For pipeline rows the 4 segments below sum to this. */
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  /** Mean segment durations (ms); 0 for transcript rows. */
  configureMs: number;
  initializeMs: number;
  connectMs: number;
  prepMs: number;
}

export interface StartLatencyResponse {
  range: AnalyticsRange;
  /** Bucket granularity for this range ('day' | 'week' | 'month'). */
  bucket: string;
  /** Start-latency target line for reference (ms). */
  targetMs: number;
  points: StartLatencyPoint[];
}

// ConversationDriftResponseDto from GET /api/v1/analytics/conversation-drift.
export interface DriftRateByLanguage {
  language: string;
  totalSessions: number;
  driftedSessions: number;
  /** driftedSessions / totalSessions, 0..1. */
  driftRate: number;
}

export interface DriftCount {
  /** category value (topic / coherence / attribution / failure / STT). */
  key: string;
  /** distinct sessions with >=1 turn in this category. */
  count: number;
}

/** Drift rate grouped by an experiment dimension (model / provider / prompt version). */
export interface DriftRateByDimension {
  /** dimension value, or 'unknown' if not yet captured for that session. */
  key: string;
  totalSessions: number;
  driftedSessions: number;
  driftRate: number;
}

export interface DriftSummary {
  totalSessions: number;
  driftedSessions: number;
  driftRate: number;
}

export interface DriftHistogramBin {
  turn: number;
  sessions: number;
}

export interface DriftTrendPoint {
  bucket: string;
  /** session source: 'pipeline' (live) | 'transcript' (historical) | 'unknown'. */
  source: string;
  totalSessions: number;
  driftedSessions: number;
  driftRate: number;
}

export interface ConversationDriftResponse {
  range: AnalyticsRange;
  summary: DriftSummary;
  driftRateByLanguage: DriftRateByLanguage[];
  attributionMix: DriftCount[];
  failureModeBreakdown: DriftCount[];
  kindsOfDrift: DriftCount[];
  rootCause: DriftCount[];
  topicMix: DriftCount[];
  coherenceMix: DriftCount[];
  sttGarbleMix: DriftCount[];
  sttErrorTypeMix: DriftCount[];
  firstDriftTurnHistogram: DriftHistogramBin[];
  driftTrend: DriftTrendPoint[];
  driftRateByModel: DriftRateByDimension[];
  driftRateBySttModel: DriftRateByDimension[];
  driftRateByPromptVersion: DriftRateByDimension[];
  // Per scenario-version comparison; populated only when a scenarioId is set.
  driftRateByScenarioVersion: DriftRateByDimension[];
}

// TokenConsumptionResponseDto from GET /api/v1/analytics/token-consumption.
export interface TokenConsumptionPoint {
  /** AI service: 'llm' | 'stt' | 'tts'. */
  service: string;
  /** Model id (LLM/STT) or voice/model id (TTS). */
  model: string;
  /** Provider, e.g. 'openai' | 'anthropic' | 'deepgram' | 'elevenlabs'. */
  provider: string;
  /** Task/operation that consumed the resource (LlmTask value). */
  task: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Cached/prompt-cache tokens (subset of prompt). */
  cachedTokens: number;
  /** STT billable audio duration (ms). */
  audioMs: number;
  /** TTS billable synthesized characters. */
  characters: number;
  /** Number of calls in this slice. */
  calls: number;
  /** Estimated USD cost for this (service × model × task) slice. */
  estimatedCostUsd: number;
  /** false when the row has no pricing entry (cost shown as 0). */
  priced: boolean;
}

export interface TokenConsumptionResponse {
  range: AnalyticsRange;
  totalEstimatedCostUsd: number;
  totalTokens: number;
  points: TokenConsumptionPoint[];
}

/** Async drift-backfill job state (POST/GET conversation-drift/backfill). */
export interface DriftBackfillJob {
  jobId: string;
  /** queued | running | done | error */
  status: string;
  total: number;
  processed: number;
  judged: number;
  drifted: number;
  skipped: number;
  error?: string | null;
}

// Settings types
export interface AppSettings {
  id: string;
  key: string;
  value: any;
  type: "string" | "number" | "boolean" | "object";
  description?: string;
  updatedAt: string;
}

export interface UpdateSettingsRequest {
  settings: Array<{
    key: string;
    value: any;
  }>;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

export interface GetProfileUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}
export interface GetProfileUrlResponse {
  presignedUrl: string;
  profileImageUrl: string;
}

export interface profileUrlRequest {
  profileImageUrl: string;
}

// ---------------------------------------------------------------------------
// Language-quality evaluation — LanguageQualityResponseDto from
// GET /v1/analytics/language-quality. Categorized, severity-weighted error
// rates only; there is deliberately NO scalar quality score anywhere.
// ---------------------------------------------------------------------------

export interface LanguageDimensionErrorRate {
  dimension: string;
  layer: string; // comprehension | content | appropriateness
  nTurns: number;
  minorCount: number;
  majorCount: number;
  criticalCount: number;
  weightedRatePer100: number;
  dominantCategory: string | null;
}

export interface LanguageRateByLanguage {
  language: string;
  sessionsJudged: number;
  nTurns: number;
  weightedRatePer100: number;
}

/** One row of the per-language performance overview (all-languages view). */
export interface LanguageOverviewRow {
  language: string;
  sessionsJudged: number;
  nTurns: number;
  weightedRatePer100: number;
  scriptFidelityPct: number | null;
  roundTripWerPct: number | null;
  garbledInputPct: number;
  worstDimension: string | null;
  worstDimensionRatePer100: number;
}

export interface LanguageCategoryCount {
  dimension: string;
  category: string;
  count: number;
  weighted: number;
}

export interface LanguageIsolationBasisCount {
  basis: string;
  count: number;
}

export interface LanguageErrorLogRow {
  scenarioSessionId: string;
  turnIndex: number;
  language: string | null;
  dimension: string;
  category: string;
  severity: string;
  isolationBasis: string | null;
  evidenceQuote: string | null;
  reasoning: string | null;
  aiText: string | null;
  occurredAt: string | null;
}

export interface LanguageRateByExperiment {
  value: string | null;
  sessionsJudged: number;
  nTurns: number;
  weightedRatePer100: number;
  /** changed_from_prev (scenario versions only): config elements that differ
   *  from the parent version. >1 = not a one-variable experiment. */
  changedFromPrev?: string[];
}

export interface LanguageEvalReference {
  name: string;
  filters: Record<string, string | null | undefined>;
  pinnedAt: string;
}

export interface LanguageDimensionDelta {
  dimension: string;
  delta: number;
  referenceRatePer100: number;
}

export interface LanguageLayerTrendPoint {
  bucket: string;
  layer: string;
  nTurns: number;
  weightedRatePer100: number;
}

export interface LanguageObjectiveMetrics {
  /** null = not yet measured (Phase 2) — render as masked, never as 0. */
  scriptFidelityPct: number | null;
  roundTripWerPct: number | null;
}

export interface LanguageQualityResponse {
  judgeModel: string | null;
  judgePromptVersion: string | null;
  sessionsJudged: number;
  turnsJudged: number;
  turnsGarbled: number;
  totalWeightedRatePer100: number;
  errorRateByDimension: LanguageDimensionErrorRate[];
  rateByLanguage: LanguageRateByLanguage[];
  languageOverview: LanguageOverviewRow[];
  categoryBreakdown: LanguageCategoryCount[];
  isolationBasisBreakdown: LanguageIsolationBasisCount[];
  errorLog: LanguageErrorLogRow[];
  objectiveMetrics: LanguageObjectiveMetrics;
  layerTrend: LanguageLayerTrendPoint[];
  rateByScenarioVersion: LanguageRateByExperiment[];
  rateByPromptVersion: LanguageRateByExperiment[];
  rateByModel: LanguageRateByExperiment[];
  reference: LanguageEvalReference | null;
  deltaByDimension: LanguageDimensionDelta[];
}
