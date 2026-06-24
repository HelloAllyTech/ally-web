import { ApiEndpoints, HttpMethod } from "@constants";
import {
  AnalyticsBucket,
  AnalyticsOverviewResponse,
  AnalyticsRange,
  ConversationDriftResponse,
  DriftBackfillJob,
  TokenConsumptionResponse,
  VoiceLatencyResponse,
} from "@types";

import { baseAPI } from "./baseApi";

type AnalyticsRangeQuery = {
  range?: AnalyticsRange;
};

type VoiceLatencyQuery = AnalyticsRangeQuery & {
  bucket?: AnalyticsBucket;
  language?: string;
};

type ConversationDriftQuery = AnalyticsRangeQuery & {
  language?: string;
  scenarioId?: number;
  scenarioVersionId?: string;
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
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
      query: ({ range, bucket, language } = {}) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY,
        method: HttpMethod.GET,
        params: {
          ...(range ? { range } : {}),
          ...(bucket ? { bucket } : {}),
          ...(language ? { language } : {}),
        },
      }),
    }),
    getTokenConsumption: builder.query<TokenConsumptionResponse, AnalyticsRangeQuery>({
      query: ({ range } = {}) => ({
        url: ApiEndpoints.ANALYTICS.TOKEN_CONSUMPTION,
        method: HttpMethod.GET,
        params: range ? { range } : undefined,
      }),
    }),
    getConversationDrift: builder.query<ConversationDriftResponse, ConversationDriftQuery>({
      query: ({
        range,
        language,
        scenarioId,
        scenarioVersionId,
        llmModel,
        llmProvider,
        promptVersion,
      } = {}) => ({
        url: ApiEndpoints.ANALYTICS.CONVERSATION_DRIFT,
        method: HttpMethod.GET,
        params: {
          ...(range ? { range } : {}),
          ...(language ? { language } : {}),
          ...(scenarioId != null ? { scenarioId } : {}),
          ...(scenarioVersionId ? { scenarioVersionId } : {}),
          ...(llmModel ? { llmModel } : {}),
          ...(llmProvider ? { llmProvider } : {}),
          ...(promptVersion ? { promptVersion } : {}),
        },
      }),
    }),
    // Kick off the async backfill (last `sinceDays` days, default 90 ≈ 3 months).
    startDriftBackfill: builder.mutation<DriftBackfillJob, { sinceDays?: number }>({
      query: ({ sinceDays = 90 } = {}) => ({
        url: ApiEndpoints.ANALYTICS.CONVERSATION_DRIFT_BACKFILL,
        method: HttpMethod.POST,
        body: { sinceDays },
      }),
    }),
    // Poll job progress; the page sets pollingInterval while a job is running.
    getDriftBackfillStatus: builder.query<DriftBackfillJob, string>({
      query: jobId => ({
        url: `${ApiEndpoints.ANALYTICS.CONVERSATION_DRIFT_BACKFILL}/${jobId}`,
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetVoiceLatencyQuery,
  useGetConversationDriftQuery,
  useStartDriftBackfillMutation,
  useGetDriftBackfillStatusQuery,
  useGetTokenConsumptionQuery,
} = analyticsAPI;
