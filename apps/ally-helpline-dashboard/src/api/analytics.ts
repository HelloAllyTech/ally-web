import { baseAPI } from "@/api/baseAPI";

interface GetDashboardUrlResponse {
  url: string;
}

type GetDashboardsResponse = {
  id: string;
  externalId: string;
  name: string;
}[];

const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardUrl: builder.query<
      GetDashboardUrlResponse,
      { dashboardId: string }
    >({
      query: ({ dashboardId }) => `/analytics/dashboard/${dashboardId}`,
    }),
    getDashboards: builder.query<GetDashboardsResponse, void>({
      query: () => "/analytics/dashboard",
    }),
  }),
});

export const { useLazyGetDashboardUrlQuery, useGetDashboardsQuery } =
  analyticsAPI;
