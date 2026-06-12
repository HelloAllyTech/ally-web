import { ApiEndpoints, HttpMethod } from "@constants";
import {
  AnalyticsBucket,
  AnalyticsOverviewResponse,
  AnalyticsRange,
  VoiceLatencyResponse,
} from "@types";

import { baseAPI } from "./baseApi";

type AnalyticsRangeQuery = {
  range?: AnalyticsRange;
};

type VoiceLatencyQuery = AnalyticsRangeQuery & {
  bucket?: AnalyticsBucket;
};

export const analyticsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getAnalyticsOverview: builder.query<AnalyticsOverviewResponse, AnalyticsRangeQuery>({
      query: ({ range } = {}) => ({
        url: ApiEndpoints.ANALYTICS.OVERVIEW,
        method: HttpMethod.GET,
        params: range ? { range } : undefined,
      }),
    }),
    getVoiceLatency: builder.query<VoiceLatencyResponse, VoiceLatencyQuery>({
      query: ({ range, bucket } = {}) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY,
        method: HttpMethod.GET,
        params: { ...(range ? { range } : {}), ...(bucket ? { bucket } : {}) },
      }),
    }),
  }),
});

export const { useGetAnalyticsOverviewQuery, useGetVoiceLatencyQuery } = analyticsAPI;
