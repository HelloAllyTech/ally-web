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

export const ORGANIZATION_METRICS_RANGES = ["30d", "90d", "12m"] as const;
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
