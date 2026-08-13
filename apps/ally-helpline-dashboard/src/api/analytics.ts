/**
 * This module provides all analytics and dashboard-related API endpoints including:
 * - Dashboard URL generation and management
 * - Counsellor statistics and performance metrics
 * - Analytics data retrieval and processing
 */

import { ApiEndpoints, HttpMethod } from "@constants";
import {
  GetCounsellorStatsRequest,
  GetCounsellorStatsResponse,
  GetDashboardUrlResponse,
  GetDashboardsResponse,
  GetLearnerUsageTableRequest,
  GetLearnerUsageTableResponse,
  GetOrganizationMetricsRequest,
  GetOrganizationMetricsResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get dashboard URL by ID
     * @param {Object} data - Dashboard parameters
     * @param {string} data.dashboardId - Unique identifier for the dashboard
     * @returns {Promise<GetDashboardUrlResponse>} Dashboard URL response
     */
    getDashboardUrl: builder.query<GetDashboardUrlResponse, { dashboardId: string }>({
      query: ({ dashboardId }) => `${ApiEndpoints.ANALYTICS.GET_DASHBOARD}/${dashboardId}`,
    }),

    /**
     * Get available dashboards
     * Retrieves the list of all available dashboards that the user
     * has access to based on their permissions.
     * @returns {Promise<GetDashboardsResponse>} List of available dashboards
     */
    getDashboards: builder.query<GetDashboardsResponse, void>({
      query: () => ApiEndpoints.ANALYTICS.GET_DASHBOARD,
    }),

    /**
     * Get counsellor statistics
     * @param {GetCounsellorStatsRequest} params - Statistics request parameters
     * @returns {Promise<GetCounsellorStatsResponse>} Counsellor statistics data
     */
    getCounsellorStats: builder.query<GetCounsellorStatsResponse, GetCounsellorStatsRequest>({
      query: params => ({
        url: ApiEndpoints.ANALYTICS.GET_COUNSELLOR_STATS,
        method: HttpMethod.GET,
        params: params ? params : undefined,
      }),
    }),

    /**
     * Get organization metrics (tenant-admin native dashboard)
     * Tenant-scoped on the backend via the caller's JWT — no tenant id is
     * sent from the client.
     * @param {GetOrganizationMetricsRequest} params - Time range (30d/90d/12m)
     * @returns {Promise<GetOrganizationMetricsResponse>} Totals + per-bucket trends
     */
    getOrganizationMetrics: builder.query<
      GetOrganizationMetricsResponse,
      GetOrganizationMetricsRequest
    >({
      query: params => ({
        url: ApiEndpoints.ANALYTICS.GET_ORGANIZATION_METRICS,
        method: HttpMethod.GET,
        params,
      }),
    }),

    /**
     * Get the per-learner usage table (tenant-admin dashboard).
     * Tenant-scoped on the backend via the caller's JWT, same as
     * getOrganizationMetrics — no tenant id is sent from the client.
     * @param {GetLearnerUsageTableRequest} params - Range, search, sort, pagination
     * @returns {Promise<GetLearnerUsageTableResponse>} One row per learner
     */
    getLearnerUsageTable: builder.query<GetLearnerUsageTableResponse, GetLearnerUsageTableRequest>({
      query: params => ({
        url: ApiEndpoints.ANALYTICS.GET_LEARNER_USAGE_TABLE,
        method: HttpMethod.GET,
        params,
      }),
    }),
  }),
});

export const {
  useLazyGetDashboardUrlQuery,
  useLazyGetDashboardsQuery,
  useLazyGetCounsellorStatsQuery,
  useGetOrganizationMetricsQuery,
  useGetLearnerUsageTableQuery,
} = analyticsAPI;
