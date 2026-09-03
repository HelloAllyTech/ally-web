import { AnalyticsType } from "@constants";

export enum CalendarMode {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
  ALL = "all",
}

export interface GetDashboardUrlResponse {
  url: string;
}

export type GetDashboardsResponse = {
  id: string;
  externalId: string;
  name: string;
  analyticsType: AnalyticsType;
}[];

export type GetCounsellorStatsResponse = {
  counselorListeningDuration: number;
  counselorName: string;
  counselorSharingDuration: number;
  counselorSharingPercentage: number;
};

export type GetCounsellorStatsRequest = {
  startDate?: string;
  endDate?: string;
} | void;

// --- Organization Metrics (tenant-admin native dashboard) ---

/**
 * Toggle order = narrowest window first. `all` starts at the organization's own
 * first row (the backend measures it per tenant) and is bucketed by month, so
 * the axis never stretches back over history this org doesn't have.
 */
export const ORGANIZATION_METRICS_RANGES = ["30d", "90d", "12m", "all"] as const;
export type OrganizationMetricsRange = (typeof ORGANIZATION_METRICS_RANGES)[number];

export interface OrganizationMetricsTrendPoint {
  /** Bucket start date (ISO yyyy-mm-dd). */
  bucket: string;
  count: number;
}

export interface OrganizationMetricsSimulationUsage {
  scenarioId: number;
  title: string;
  /** Completed sessions in the window. */
  sessionCount: number;
}

/**
 * Response of GET /v1/tenant-analytics/organization-metrics. `summary` holds
 * the headline totals and each metric has a zero-filled trend; new org-level
 * metrics arrive as additional fields, so the page can grow without breaking.
 */
export interface GetOrganizationMetricsResponse {
  range: OrganizationMetricsRange;
  bucket: "day" | "week" | "month";
  summary: {
    simulationsCompleted: number;
    activeUsers: number;
    newLearnersOnboarded: number;
    /** All-time headcount as of now — not scoped to `range`. */
    totalRegisteredLearners: number;
    /** null when there were no active learners in the window. */
    avgSessionsPerActiveLearner: number | null;
    /** null when there were no active learners in the window. */
    avgPracticeMinutesPerLearner: number | null;
    /** null when no learner onboarded in the window has had a first session yet. */
    avgDaysToFirstSession: number | null;
    /** Sample size (n) backing avgDaysToFirstSession. */
    learnersWithFirstSessionCount: number;
  };
  simulationsCompletedTrend: OrganizationMetricsTrendPoint[];
  activeUsersTrend: OrganizationMetricsTrendPoint[];
  newLearnersOnboardedTrend: OrganizationMetricsTrendPoint[];
  /** Top scenarios by completed-session count in the window, most-used first. */
  mostUsedSimulations: OrganizationMetricsSimulationUsage[];
}

export type GetOrganizationMetricsRequest = {
  range: OrganizationMetricsRange;
};

// --- Per-learner usage table (tenant-admin dashboard) ---

export const LEARNER_USAGE_STATUSES = ["active", "at_risk", "dormant", "never_started"] as const;
export type LearnerUsageStatus = (typeof LEARNER_USAGE_STATUSES)[number];

export const LEARNER_USAGE_SORT_FIELDS = [
  "name",
  "email",
  "signupDate",
  "lastPracticeSessionAt",
  "lastActivityAt",
  "status",
  "roleplaySessionsStarted",
  "roleplaySessionsCompleted",
  "avgScore",
  "totalPracticeMinutes",
  "roleplayPointsPerMinute",
  "coursesAssigned",
  "coursesStarted",
  "coursesCompleted",
  "level",
  "totalXp",
  "itemsCompleted",
  "itemsCompletedPct",
  "quizzesPassed",
  "avgQuizScorePct",
  "readWatchCompleted",
  "reflectionCompleted",
] as const;
export type LearnerUsageSortField = (typeof LEARNER_USAGE_SORT_FIELDS)[number];

/**
 * One row of the per-learner usage table. `lastActivityAt`,
 * `lastPracticeSessionAt`, `signupDate`, `level`/`totalXp` and the `courses*`
 * and course-item fields are all-time (not scoped to `range`);
 * `roleplaySessions*`, `avgScore`, and `totalPracticeMinutes` are scoped to
 * `range` and reconcile with the KPI tiles above the table.
 */
export interface LearnerUsageRow {
  id: number;
  name: string;
  email: string;
  signupDate: string;
  /** Most recent ROLEPLAY session only — kept for the Last active tooltip. */
  lastPracticeSessionAt: string | null;
  /**
   * Last sign of life anywhere: the later of `lastPracticeSessionAt` and the
   * learner's most recent course activity. `status` is derived from THIS, so a
   * learner who only ever does quizzes no longer reads as "Never started".
   */
  lastActivityAt: string | null;
  /** null when the learner has never done anything. */
  daysSinceLastActivity: number | null;
  status: LearnerUsageStatus;
  roleplaySessionsStarted: number;
  roleplaySessionsCompleted: number;
  /** null when nothing was started in the window. */
  roleplayCompletionRatePct: number | null;
  avgScore: number | null;
  totalPracticeMinutes: number;
  /**
   * Composite score summed over the window's completed sessions divided by
   * those practice minutes. null when the window holds no measurable practice
   * time — never 0. Can be negative: composite scores go below zero.
   */
  roleplayPointsPerMinute: number | null;
  coursesAssigned: number;
  coursesStarted: number;
  coursesCompleted: number;
  /** null when nothing is assigned. */
  courseCompletionRatePct: number | null;
  /** Level ladder position 1-10; 1 for a learner who has earned no XP yet. */
  level: number;
  totalXp: number;
  /** Course items across every enrolled course, locked ones included. */
  itemsTotal: number;
  itemsCompleted: number;
  /** null when nothing is enrolled. */
  itemsCompletedPct: number | null;
  quizzesPassed: number;
  /** Quiz items with >=1 graded attempt — the denominator behind the avg. */
  quizzesAttempted: number;
  /** Avg of the LATEST graded attempt per quiz item, so repeat failures show. */
  avgQuizScorePct: number | null;
  readWatchCompleted: number;
  reflectionCompleted: number;
}

export interface GetLearnerUsageTableResponse {
  range: OrganizationMetricsRange;
  data: LearnerUsageRow[];
  /** Total learners matching the filter (for pagination). */
  count: number;
}

export interface GetLearnerUsageTableRequest {
  range: OrganizationMetricsRange;
  search?: string;
  /**
   * Status facet, applied server-side (it has to be: filtering after
   * LIMIT/OFFSET would filter one page and leave `count` describing the
   * unfiltered set). fetchBaseQuery comma-joins the array into one param,
   * which the backend DTO splits back apart.
   */
  status?: LearnerUsageStatus[];
  sortBy?: LearnerUsageSortField;
  order?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

// --- Per-course usage table (tenant-admin dashboard) ---

export const COURSE_USAGE_SORT_FIELDS = [
  "title",
  "status",
  "totalItems",
  "learnersStarted",
  "learnersAtLeast50",
  "learnersCompleted100",
  "avgCompletionDays",
  "medianCompletionDays",
  "avgScore",
  "lastEnrollmentAt",
] as const;
export type CourseUsageSortField = (typeof COURSE_USAGE_SORT_FIELDS)[number];

/**
 * One row of the per-course usage table. Deliberately all-time throughout —
 * a course's lifetime performance, not scoped to the page's period toggle.
 * `learnersAssigned` is the tenant's total learner headcount, not a
 * per-course assignment count (Track 2.0 has no per-learner "assigned but
 * not started" event — enrolling sets startedAt immediately).
 */
export interface CourseUsageRow {
  id: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED";
  totalItems: number;
  learnersAssigned: number;
  learnersStarted: number;
  /** null when nothing was started. */
  startedRatePct: number | null;
  /** Superset of learnersCompleted100 — includes full completers. */
  learnersAtLeast50: number;
  /** null when nothing was started. */
  completion50PlusRatePct: number | null;
  learnersCompleted100: number;
  /** null when nothing was started. */
  completion100RatePct: number | null;
  /** Over 100%-completers only; null when none have completed. */
  avgCompletionDays: number | null;
  /** Over 100%-completers only; null when none have completed. */
  medianCompletionDays: number | null;
  /** null when nothing is scored. */
  avgScore: number | null;
  /** Enrolled, not yet 100%, active in the last 14 days. */
  inProgressActive: number;
  /** Enrolled, not yet 100%, no activity in the last 14 days (or never). */
  inProgressStalled: number;
  lastEnrollmentAt: string | null;
}

export interface GetCourseUsageTableResponse {
  data: CourseUsageRow[];
  /** Total courses matching the filter (for pagination). */
  count: number;
}

export interface GetCourseUsageTableRequest {
  search?: string;
  sortBy?: CourseUsageSortField;
  order?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}
