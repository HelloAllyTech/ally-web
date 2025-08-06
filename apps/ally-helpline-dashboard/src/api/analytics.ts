/**
 * This module provides all analytics and dashboard-related API endpoints including:
 * - Dashboard URL generation and management
 * - Counsellor statistics and performance metrics
 * - Analytics data retrieval and processing
 */

import { baseAPI } from "@/api/baseAPI";
import {
  GetCounsellorStatsRequest,
  GetCounsellorStatsResponse,
  GetDashboardUrlResponse,
  GetDashboardsResponse,
} from "@/pages/analytics/types";
import { ApiEndpoints, HttpMethod } from "@/constants/common";

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
  }),
});

export const {
  useLazyGetDashboardUrlQuery,
  useLazyGetDashboardsQuery,
  useLazyGetCounsellorStatsQuery,
} = analyticsAPI;
