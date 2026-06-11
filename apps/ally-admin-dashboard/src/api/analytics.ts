import { ApiEndpoints, HttpMethod } from "@constants";
import { AnalyticsOverviewResponse, AnalyticsRange } from "@types";

import { baseAPI } from "./baseApi";

type AnalyticsOverviewQuery = {
  range?: AnalyticsRange;
};

export const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getAnalyticsOverview: builder.query<AnalyticsOverviewResponse, AnalyticsOverviewQuery>({
      query: ({ range } = {}) => ({
        url: ApiEndpoints.ANALYTICS.OVERVIEW,
        method: HttpMethod.GET,
        params: range ? { range } : undefined,
      }),
    }),
  }),
});

export const { useGetAnalyticsOverviewQuery } = analyticsAPI;
