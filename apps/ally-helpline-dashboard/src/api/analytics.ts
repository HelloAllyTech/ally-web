import { baseAPI } from "@/api/baseAPI";

interface GetDashboardUrlResponse {
  url: string;
}
const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardUrl: builder.query<
      GetDashboardUrlResponse,
      { dashboardId: string }
    >({
      query: ({ dashboardId }) => `/analytics/dashboard/${dashboardId}`,
    }),
  }),
});

export const { useLazyGetDashboardUrlQuery } = analyticsAPI;
