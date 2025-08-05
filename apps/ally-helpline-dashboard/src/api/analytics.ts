import { baseAPI } from "@/api/baseAPI";
import {
  GetCounsellorStatsRequest,
  GetCounsellorStatsResponse,
  GetDashboardUrlResponse,
  GetDashboardsResponse,
} from "@/pages/analytics/types";

const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getDashboardUrl: builder.query<GetDashboardUrlResponse, { dashboardId: string }>({
      query: ({ dashboardId }) => `/analytics/dashboard/${dashboardId}`,
    }),
    getDashboards: builder.query<GetDashboardsResponse, void>({
      query: () => "/analytics/dashboard",
    }),
    getCounsellorStats: builder.query<GetCounsellorStatsResponse, GetCounsellorStatsRequest>({
      query: params => ({
        url: "analytics/counselor-stats",
        method: "GET",
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
