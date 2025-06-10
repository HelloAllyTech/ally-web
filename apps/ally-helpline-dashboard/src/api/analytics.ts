import { baseAPI } from "@/api/baseAPI";
import {
  GetCounselorStatsRequest,
  GetCounselorStatsResponse,
  GetDashboardUrlResponse,
  GetDashboardsResponse,
} from "@/pages/analytics/types";

const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardUrl: builder.query<GetDashboardUrlResponse, { dashboardId: string }>({
      query: ({ dashboardId }) => `/analytics/dashboard/${dashboardId}`,
    }),
    getDashboards: builder.query<GetDashboardsResponse, void>({
      query: () => "/analytics/dashboard",
    }),
    getCounselorStats: builder.query<GetCounselorStatsResponse, GetCounselorStatsRequest>({
      query: (params) => ({
        url: "analytics/counselor-stats",
        method: "GET",
        params,
      }),
    }),
  }),
});

export const {
  useLazyGetDashboardUrlQuery,
  useLazyGetDashboardsQuery,
  useLazyGetCounselorStatsQuery,
} = analyticsAPI;
