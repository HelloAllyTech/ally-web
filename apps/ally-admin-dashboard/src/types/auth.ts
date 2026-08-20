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
  /**
   * The role to gate on. The backend collapses a user's roles to one; the
   * getUser query re-resolves it from `roles` so a super-admin tier held
   * alongside a tenant role is not lost (see resolveAdminRole).
   */
  role: UserRole;
  /** Every role the user holds. Absent on responses predating the field. */
  roles?: UserRole[];
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
  /** Enabled feature-toggle keys for the current user (see GET /users/me/feature-toggles). */
  features: string[];
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
/**
 * `all` spans the platform's whole history — the server resolves its start from
 * the first row in the data rather than the calendar, so such a window has no
 * equal-length predecessor and never carries a `previous` comparison.
 */
export type AnalyticsRange = "30d" | "90d" | "12m" | "all";

/** Grouping grain for a trend. Surfaced per chart, not per page. */
export type AnalyticsBucket = "day" | "week" | "month" | "year";

/**
 * The window the server actually resolved, echoed back so every chart, caption
 * and export can state the period it covers rather than leaving the reader to
 * infer it from a dropdown that may since have moved.
 */
export interface AnalyticsWindow {
  /** yyyy-mm-dd, inclusive. */
  from: string;
  /** yyyy-mm-dd, INCLUSIVE. */
  to: string;
  /** e.g. "Last 30 days" or "2026-01-01 → 2026-03-31". */
  label: string;
  days: number;
  bucket: AnalyticsBucket;
  /** True when the window covers all of the platform's history. */
  allTime: boolean;
  /**
   * Bucket start of the period containing today, or null when the window ended
   * in the past. That period is still accruing, so it belongs in tables (flagged)
   * and NOT on a line or bar — an unfinished period draws as a fall.
   */
  inProgressBucket: string | null;
  /** ISO 8601 server time the aggregates were computed. */
  computedAt: string;
}

/**
 * Which parts of a response honoured the tenant filter. Sections named in
 * `unscopedSections` stayed platform-wide because their source tables cannot be
 * attributed to one org — the UI must badge them rather than let them read as
 * tenant-specific.
 */
export interface AnalyticsScoping {
  tenantId: string | null;
  unscopedSections: string[];
}

export interface AnalyticsSummary {
  /** Cumulative as at the end of the window, not windowed. */
  totalUsers: number;
  /** Distinct users active WITHIN the window. */
  activeUsers: number;
  /** Simulations completed WITHIN the window. */
  simulationsCompleted: number;
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
  /** Bucket start (yyyy-mm-dd) — the grain the request asked for. */
  bucket: string;
  count: number;
}

export interface RetentionPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  /** Active users whose account was created in this same bucket. */
  newUsers: number;
  returningUsers: number;
}

export interface UsersByRolePoint {
  role: string;
  count: number;
}

export interface AnalyticsOverviewResponse {
  window: AnalyticsWindow;
  summary: AnalyticsSummary;
  /** Present only when `compare=prev` — the basis for a KPI delta. */
  previous: AnalyticsSummary | null;
  previousLabel: string | null;
  userGrowth: UserGrowthPoint[];
  activeUsers: ActiveUsersPoint[];
  simulationsCompleted: SimulationsCompletedPoint[];
  retention: RetentionPoint[];
  usersByRole: UsersByRolePoint[];
}

// Leadership highlights — mirrors the backend AnalyticsHighlightsResponseDto
// from GET /api/v1/analytics/highlights. Only the metrics NOT already served by
// /overview or /scribe/overview live here; the tab composes all three.
export interface HighlightsSummary {
  activeOrgs: number;
  completedSimulations: number;
  practiceMinutes: number;
  avgCompositeScore: number | null;
  evaluatedSessions: number;
  avgCsat: number | null;
  csatResponses: number;
  trackCompletionRatePct: number | null;
  quizPassRatePct: number | null;
  totalAiCostUsd: number;
  /**
   * Calls whose model has no pricing entry. They contribute $0, so
   * `totalAiCostUsd` UNDERSTATES real spend whenever this is non-zero — say so
   * on the surface rather than presenting the total as complete.
   */
  unpricedCalls: number;
  costPerCompletedSimUsd: number | null;
  avgPlayTimeMinutes: number | null;
  playTimeSessions: number;
}

export interface TopOrgRow {
  tenantId: string;
  tenantName: string;
  completedSimulations: number;
}

export interface PracticeMinutesPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  minutes: number;
  activeLearners: number;
}

/**
 * How long one simulation lasts, per bucket. Median and p95 travel with the
 * mean because session length is skewed. Nulls mark a bucket with no completed,
 * timed session — the axis stays a real calendar and the line breaks.
 */
export interface PlayTimePoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  avgMinutes: number | null;
  medianMinutes: number | null;
  p95Minutes: number | null;
  /** Timed sessions behind the bucket. A count, so its zero is a real zero. */
  sessions: number;
}

export interface QualityTrendPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  avgCompositeScore: number | null;
  evaluatedSessions: number;
}

export interface CsatTrendPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  avgRating: number | null;
  responses: number;
}

export interface TrackFunnel {
  enrolled: number;
  started: number;
  completed: number;
  quizAttempts: number;
  quizPassed: number;
  quizPassRatePct: number | null;
}

export interface CostPerSimPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  estimatedCostUsd: number;
  completedSimulations: number;
  /** null when the bucket had no completed simulations. */
  costPerSimUsd: number | null;
  unpricedCalls: number;
}

/** Orgs too small to name, aggregated so the total stays honest. */
export interface TopOrgsBelowFloor {
  orgs: number;
  completedSimulations: number;
}

export interface AnalyticsHighlightsResponse {
  range: AnalyticsRange;
  bucket: string;
  window: AnalyticsWindow;
  scoping: AnalyticsScoping;
  summary: HighlightsSummary;
  /** Present only when `compare=prev` — the basis for a KPI delta. */
  previous: HighlightsSummary | null;
  previousLabel: string | null;
  /** Named orgs at or above the minimum group size, descending. */
  topOrgs: TopOrgRow[];
  topOrgsBelowFloor: TopOrgsBelowFloor;
  /** Gap-filled to a contiguous bucket axis. */
  practiceMinutes: PracticeMinutesPoint[];
  /** Contiguous axis, gap-filled with NULLs — an average has no zero. */
  playTime: PlayTimePoint[];
  /** Sparse — buckets with no evaluated sessions are absent. */
  qualityTrend: QualityTrendPoint[];
  /** Sparse — buckets with no ratings are absent. */
  csatTrend: CsatTrendPoint[];
  trackFunnel: TrackFunnel;
  /** Gap-filled to a contiguous bucket axis. */
  costPerSim: CostPerSimPoint[];
}

// Monthly learner cohort retention — mirrors CohortRetentionResponseDto from
// GET /api/v1/analytics/cohort-retention. All-time and month-grained: it takes
// no window params, because a cohort is only readable once it has been followed
// for several months.
export interface CohortRetentionCell {
  /** Whole months since the cohort signed up. Always >= 1; month 0 is the cohort. */
  monthIndex: number;
  /** Calendar month the activity happened in (yyyy-mm-01). */
  activityMonth: string;
  /**
   * Learners who cleared each minutes threshold that month, index-aligned with
   * the response's `thresholds`. Counts, not rates — the rate is derived here
   * against the row's `learners` so there is one definition of it.
   */
  activeByThreshold: number[];
  /** True for the current, unfinished calendar month: these counts can only rise. */
  partial: boolean;
}

export interface CohortRetentionRow {
  /** Signup month (yyyy-mm-01) — the cohort key. */
  cohortMonth: string;
  /** Learner accounts created that month: the denominator, and the 100% anchor. */
  learners: number;
  /** True below `minCohortSize` — show the size, suppress the percentages. */
  belowFloor: boolean;
  /** Elapsed months only. A month that has not happened yet is absent, not zero. */
  cells: CohortRetentionCell[];
}

export interface CohortRetentionResponse {
  /** Selectable "active" definitions, in practice minutes per month. */
  thresholds: number[];
  minCohortSize: number;
  /** First day of the current, incomplete month (yyyy-mm-01). */
  currentMonth: string;
  /** Oldest first, with signup-less months present at `learners: 0`. */
  cohorts: CohortRetentionRow[];
  scoping: AnalyticsScoping;
  computedAt: string;
}

// Monthly learner usage-level mix — mirrors UsageLevelResponseDto from
// GET /api/v1/analytics/usage-levels. Month-grained and fixed-window (12 complete
// months + the current one): it takes no window params, because a shift in a
// distribution is only visible across several months.
export interface UsageLevelBand {
  /** Server-owned label, e.g. "25–50 min". */
  label: string;
  /** Inclusive lower bound, minutes. */
  minMinutes: number;
  /** Exclusive upper bound; null for the open-ended top band. */
  maxMinutes: number | null;
}

export interface UsageLevelMonth {
  /** First day of the month (yyyy-mm-01). */
  month: string;
  /** Learners per band, index-aligned with the response's `bands`. */
  learnersByBand: number[];
  /** Σ learnersByBand — learners with any practice that month. */
  activeLearners: number;
  /** Learner accounts that existed by the end of the month. */
  registeredLearners: number;
  /** Of those, the ones who had practised at least once by then. */
  activatedLearners: number;
  /** True for the current, unfinished month: its low bands are overstated. */
  partial: boolean;
}

export interface UsageLevelResponse {
  /** Bands lowest first, excluding the zero band (a residual — see below). */
  bands: UsageLevelBand[];
  /** Label for the residual "practised nothing this month" band. */
  zeroBandLabel: string;
  completeMonths: number;
  /** Below this population, a month shows counts and no percentages. */
  minPopulationSize: number;
  /** First day of the current, incomplete month (yyyy-mm-01). */
  currentMonth: string;
  /** Oldest first, gap-free; months before the population existed carry zeros. */
  months: UsageLevelMonth[];
  scoping: AnalyticsScoping;
  computedAt: string;
}

// Ally Certification attainment — mirrors CertificationResponseDto from
// GET /api/v1/analytics/certification. The platform's hero metric: distinct
// learners who have accumulated enough LIFETIME roleplay practice to hold a
// level (L1 = 5,000 minutes), by the month they earned it and cumulatively.
// All-time and month-grained; takes no window, because the threshold is a
// lifetime total and a window would change the metric rather than narrow it.
export interface CertificationLevel {
  /** Stable id / series key, e.g. "L1". */
  id: string;
  /** Server-owned name, e.g. "L1 Ally Certified". */
  label: string;
  /** Lifetime roleplay minutes required, inclusive. */
  minMinutes: number;
}

export interface CertificationPipelineBand {
  /** Server-built label, e.g. "1,500–3,000 min". */
  label: string;
  minMinutes: number;
  maxMinutes: number;
  /** Fraction of the threshold this band starts at, 0–1. */
  minFraction: number;
  /** Uncertified learners currently in this band. */
  learners: number;
}

export interface CertificationMonth {
  /** First day of the month (yyyy-mm-01). */
  month: string;
  /** Learners whose lifetime minutes FIRST reached the threshold this month. */
  newlyCertified: number;
  /** Running total — monotonic, since a level is never lost. */
  cumulativeCertified: number;
  /** True for the current, unfinished month: more can still cross into it. */
  partial: boolean;
}

export interface CertificationResponse {
  /** Every level, lowest first. Only `level` is plotted today. */
  levels: CertificationLevel[];
  /** The level this response reports on. */
  level: CertificationLevel;
  /** Oldest first, gap-free; at least 12 months even if attainment is younger. */
  months: CertificationMonth[];
  /** First day of the current, incomplete month (yyyy-mm-01). */
  currentMonth: string;
  /** Learners holding the level right now — the headline figure. */
  certified: number;
  /** Every learner in scope, including those who have never practised. */
  learners: number;
  /** The not-yet-certified population by how far along it is, lowest first. */
  pipeline: CertificationPipelineBand[];
  /** Lifetime minutes of the furthest-along uncertified learner. Names nobody. */
  nearestMinutes: number;
  scoping: AnalyticsScoping;
  computedAt: string;
}

// Coin-weighted product-roadmap delivery — mirrors RoadmapDeliveryResponseDto
// from GET /api/v1/analytics/roadmap-delivery. All-time and month-grained; takes
// no window and no tenant (the roadmap tables carry no tenant — it is Ally's own
// backlog). Coins are the board's `priorityScore`: every voter, every period.
export interface RoadmapDeliveryTotals {
  opportunities: number;
  ideaOpportunities: number;
  bugOpportunities: number;
  /** Σ priorityScore — ideaCoins + bugCoins, sent so both cannot disagree. */
  coins: number;
  ideaCoins: number;
  bugCoins: number;
}

export interface RoadmapDeliveryOwner extends RoadmapDeliveryTotals {
  /** Owner display name, or the reserved unassigned / other-owners labels. */
  owner: string;
}

export interface RoadmapDeliveryMonth extends RoadmapDeliveryTotals {
  /** First day of the release month (yyyy-mm-01). */
  month: string;
  /** Owners with something released this month, in the response's owner order. */
  owners: RoadmapDeliveryOwner[];
  /** True for the current, unfinished month: more can still ship into it. */
  partial: boolean;
}

export interface RoadmapDeliveryResponse {
  /** Oldest first, gap-free; empty when nothing released carries a date. */
  months: RoadmapDeliveryMonth[];
  /** Every owner band, ranked by all-time coins, context bands last. */
  owners: string[];
  /** Reserved `owner` value for released work with no owner. */
  unassignedOwnerLabel: string;
  /** Reserved `owner` value for the tail rolled up past `maxOwners`. */
  otherOwnerLabel: string;
  maxOwners: number;
  /** Totals for everything on the axis. */
  plotted: RoadmapDeliveryTotals;
  /**
   * Released work with NO `releasedAt`, which therefore cannot be plotted. The
   * date is only stamped on the transition into `released`, so a large share of
   * migrated rows have none. Must be stated on the surface — without it the
   * plotted total reads as the whole history.
   */
  undated: RoadmapDeliveryTotals;
  /** First day of the current, incomplete month (yyyy-mm-01). */
  currentMonth: string;
  scoping: AnalyticsScoping;
  computedAt: string;
}

// Lifetime roleplay-volume distribution — mirrors RoleplayVolumeResponseDto from
// GET /api/v1/analytics/roleplay-volume. All-time and takes no window params: the
// quantity is a LIFETIME count per learner, so a 30-day window would put nearly
// every learner in the lowest bands whatever their real depth.
export interface RoleplayVolumeBand {
  /** Server-owned label, and the x-axis tick: "1", "3–5", "51+". */
  label: string;
  /** Inclusive lower bound, completed roleplays. */
  minCount: number;
  /** INCLUSIVE upper bound (counts are discrete); null for the top band. */
  maxCount: number | null;
}

export interface RoleplayVolumeResponse {
  /** Bands lowest first, excluding the zero band (a residual — see below). */
  bands: RoleplayVolumeBand[];
  /** Label for the residual "never completed a roleplay" band. */
  zeroBandLabel: string;
  /** Below this population, shares must not be stated — counts only. */
  minPopulationSize: number;
  /** Every learner account in scope: the denominator for every share. */
  registeredLearners: number;
  /** Learners with >= 1 completed roleplay — Σ learnersByBand. */
  learnersWithAny: number;
  /** registeredLearners − learnersWithAny, derived server-side. */
  learnersWithNone: number;
  /** Learners per band, index-aligned with `bands`. */
  learnersByBand: number[];
  /** Completed roleplays across every learner in scope. */
  totalCompletedRoleplays: number;
  /** Median lifetime count among learners with >= 1; null when nobody has. */
  medianAmongActiveLearners: number | null;
  scoping: AnalyticsScoping;
  computedAt: string;
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
  window: AnalyticsWindow;
  scoping: AnalyticsScoping;
  summary: ScribeOverviewSummary;
  /** Present only when `compare=prev` — the basis for a KPI delta. */
  previous: ScribeOverviewSummary | null;
  previousLabel: string | null;
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
  window: AnalyticsWindow;
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
  /** Live-instrumentation only; null for 'transcript' buckets. */
  avgLlmTtftMs: number | null;
  /** Live-instrumentation only; null for 'transcript' buckets. */
  p50LlmTtftMs: number | null;
  /** Live-instrumentation only; null for 'transcript' buckets. */
  p95LlmTtftMs: number | null;
  /**
   * Prompt-cache hit rate (%), ratio-of-sums per bucket. Live-instrumentation
   * only; null for 'transcript' buckets and for turns predating this being
   * instrumented.
   */
  avgCacheHitRatePct: number | null;
}

/** One language's live-pipeline latency over the whole window (no time bucketing). */
export interface VoiceLatencyByLanguageRow {
  language: string;
  turns: number;
  avgMs: number;
  p95Ms: number;
  /** Mean pure STT finalization time (ms); null when unpopulated for this window. */
  avgSttFinalizeMs: number | null;
}

export interface VoiceLatencyResponse {
  range: AnalyticsRange;
  window: AnalyticsWindow;
  /** Bucket granularity for this range ('day' | 'week' | 'month'). */
  bucket: string;
  /** Voice-to-voice latency target line for reference (ms). */
  targetMs: number;
  /** LLM time-to-first-token target line for reference (ms). */
  llmTtftTargetMs: number;
  points: VoiceLatencyPoint[];
  /** Live-pipeline latency by language, independent of the `language` filter. */
  byLanguage: VoiceLatencyByLanguageRow[];
}

/**
 * Shared per-session voice-pipeline latency fields, used both for a single
 * session-wise row and for the whole-filtered-set summary. Null stage values
 * mean no turns in the window had that field populated.
 */
export interface VoiceLatencySessionStages {
  avgResponseLatencyMs: number | null;
  p50ResponseLatencyMs: number | null;
  p95ResponseLatencyMs: number | null;
  avgEouDelayMs: number | null;
  avgSttFinalizeMs: number | null;
  avgLlmTtftMs: number | null;
  avgTtsTtfbMs: number | null;
  avgOrchestrationMs: number | null;
  avgLlmResponseMs: number | null;
  avgBranchingMs: number | null;
  avgKnowledgeRetrievalMs: number | null;
  avgProcessEventsMs: number | null;
  avgBehaviorsMs: number | null;
  interruptedTurns: number;
  llmTimedOutTurns: number;
}

// VoiceLatencySessionRowDto from GET /api/v1/analytics/voice-latency/sessions.
export interface VoiceLatencySessionRow extends VoiceLatencySessionStages {
  scenarioSessionId: string;
  occurredAt: string | null;
  turnCount: number;
}

export interface ListVoiceLatencySessionsResponse {
  data: VoiceLatencySessionRow[];
  /** Total sessions matching the filter (for pagination). */
  total: number;
  window: AnalyticsWindow;
}

// VoiceLatencySessionsSummaryResponseDto from
// GET /api/v1/analytics/voice-latency/sessions/summary.
export interface VoiceLatencySessionsSummary extends VoiceLatencySessionStages {
  sessionCount: number;
  turnCount: number;
  window: AnalyticsWindow;
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
  window: AnalyticsWindow;
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
  window: AnalyticsWindow;
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
  window: AnalyticsWindow;
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
  window: AnalyticsWindow;
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

export interface LanguageWerByVoice {
  voiceId: string | null;
  voiceName: string | null;
  sessions: number;
  avgRoundTripWerPct: number;
}

export interface LanguageObjectiveMetrics {
  /** null = not yet measured (Phase 2) — render as masked, never as 0. */
  scriptFidelityPct: number | null;
  roundTripWerPct: number | null;
}

/** How far a weak-metric series can be trusted. */
export type WeakMetricState = "measured" | "partial" | "none";

export interface WeakMetricPoint {
  bucket: string;
  numerator: number;
  denominator: number;
  /** null when the denominator is 0 — an empty bucket, not a clean one. */
  value: number | null;
  /**
   * Denominator below the platform's thin-sample minimum. The bucket is real —
   * it stays in tables — but it is left off the plot and never supplies the
   * delta, because a two-session week drawn beside a ninety-seven-session one
   * became the headline.
   */
  sparse: boolean;
}

export interface WeakMetricSeries {
  /** One plain line saying what this counts — the card's caption. */
  description: string;
  id: string;
  label: string;
  unit: "percent" | "per100turns" | "ratio" | "count" | string;
  state: WeakMetricState;
  /** null = no good direction; report movement without a verdict. */
  lowerIsBetter: boolean | null;
  /** The caveat needed to read this series honestly; rendered, not hidden. */
  caveat: string | null;
  points: WeakMetricPoint[];
  latest: number | null;
  previous: number | null;
}

export interface WeakMetricGroup {
  id: string;
  label: string;
  description: string;
  state: WeakMetricState;
  series: WeakMetricSeries[];
}

export interface WeakMetricScenarioRow {
  scenarioId: number;
  title: string | null;
  language: string | null;
  sessions: number;
  turns: number;
  slips: number;
  rate: number;
}

export interface JudgeVersionPin {
  judgeModel: string;
  judgePromptVersion: string;
}

export interface WeakMetricTurnBand {
  /** A quartile key ("q1".."q4") or a flag value ("yes"/"fired"). */
  band: string;
  /**
   * Observed range of the banded metric. Measured from the filtered data rather
   * than a fixed threshold, so the edges move with the product instead of going
   * stale. Null on a yes/no condition.
   */
  lo: number | null;
  hi: number | null;
  turns: number;
  faults: number;
  rate: number;
}

export interface WeakMetricTurnFactor {
  id: string;
  label: string;
  description: string;
  /** How to format a band edge. */
  unit: "ms" | "count" | "flag" | string;
  /** Worst band rate minus best. How much this condition discriminates. */
  spread: number;
  bands: WeakMetricTurnBand[];
}

export interface WeakMetricTurnConditions {
  totalTurns: number;
  baselineRate: number | null;
  /** Most discriminating first. */
  factors: WeakMetricTurnFactor[];
}

export interface WeakMetricsResponse {
  metricsVersion: string;
  parameters: Record<string, number>;
  /** Drift pin, kept for compatibility — prefer judgeVersions. */
  judgeModel: string | null;
  judgePromptVersion: string | null;
  /**
   * One pin per judge family. Three judges feed this tab and they version
   * independently, so a single number cannot describe all of them.
   */
  judgeVersions: {
    drift: JudgeVersionPin | null;
    language: JudgeVersionPin | null;
    groundedness: JudgeVersionPin | null;
  };
  bucket: string;
  start: string;
  /**
   * Start of the bucket containing today, or null when the window ended in the
   * past. Still accruing, so it is left off plots and kept in the expanded
   * view — the same contract `window.inProgressBucket` carries elsewhere.
   */
  inProgressBucket: string | null;
  groups: WeakMetricGroup[];
  worstScenarios: WeakMetricScenarioRow[];
  /**
   * What was measurably different about the turns a judge faulted. Unlike every
   * other cut on this tab it compares turns against other turns in the SAME
   * sessions, so a shift in traffic mix cannot move it.
   */
  turnConditions: WeakMetricTurnConditions;
  scoreLengthCorrelation: number | null;
  filterOptions: {
    languages: string[];
    models: string[];
    /** Only versions with judged data behind them — see the backend note. */
    promptVersions: string[];
    scenarios: Array<{ id: number; title: string | null }>;
  };
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
  werByVoice: LanguageWerByVoice[];
  reference: LanguageEvalReference | null;
  deltaByDimension: LanguageDimensionDelta[];
}
