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
  };
  simulationsCompletedTrend: OrganizationMetricsTrendPoint[];
  activeUsersTrend: OrganizationMetricsTrendPoint[];
}

export type GetOrganizationMetricsRequest = {
  range: OrganizationMetricsRange;
};
