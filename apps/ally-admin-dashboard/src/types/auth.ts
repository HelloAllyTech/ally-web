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

/** One cell of the language × drift-kind heatmap (sessions affected). */
export interface DriftKindByLanguage {
  language: string;
  /** drift kind (off_topic / degrading / hallucination / ...). */
  kind: string;
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
  kindByLanguage: DriftKindByLanguage[];
  rootCause: DriftCount[];
  topicMix: DriftCount[];
  coherenceMix: DriftCount[];
  sttGarbleMix: DriftCount[];
  sttErrorTypeMix: DriftCount[];
  firstDriftTurnHistogram: DriftHistogramBin[];
  driftTrend: DriftTrendPoint[];
  driftRateByModel: DriftRateByDimension[];
  driftRateByProvider: DriftRateByDimension[];
  driftRateByPromptVersion: DriftRateByDimension[];
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
