import { ApiEndpoints, HttpMethod } from "@constants";
import {
  AgentJoinReliabilityResponse,
  AnalyticsBucket,
  AnalyticsHighlightsResponse,
  AnalyticsOverviewResponse,
  AnalyticsRange,
  ConversationDriftResponse,
  DriftBackfillJob,
  LanguageEvalReference,
  LanguageQualityResponse,
  ScribeOverviewResponse,
  ScribeSummaryFailureResponse,
  StartLatencyResponse,
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

type AgentJoinReliabilityQuery = AnalyticsRangeQuery & {
  bucket?: AnalyticsBucket;
};

type HighlightsQuery = AnalyticsRangeQuery & {
  bucket?: AnalyticsBucket;
};

type StartLatencyQuery = AnalyticsRangeQuery & {
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
    // Leadership KPIs not covered by /overview or /scribe/overview: org
    // adoption, practice minutes, roleplay quality, CSAT, track funnel, AI cost.
    getAnalyticsHighlights: builder.query<AnalyticsHighlightsResponse, HighlightsQuery>({
      query: ({ range, bucket } = {}) => ({
        url: ApiEndpoints.ANALYTICS.HIGHLIGHTS,
        method: HttpMethod.GET,
        params: {
          ...(range ? { range } : {}),
          ...(bucket ? { bucket } : {}),
        },
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
    getAgentJoinReliability: builder.query<AgentJoinReliabilityResponse, AgentJoinReliabilityQuery>(
      {
        query: ({ range, bucket } = {}) => ({
          url: ApiEndpoints.ANALYTICS.AGENT_JOIN_RELIABILITY,
          method: HttpMethod.GET,
          params: {
            ...(range ? { range } : {}),
            ...(bucket ? { bucket } : {}),
          },
        }),
      },
    ),
    getStartLatency: builder.query<StartLatencyResponse, StartLatencyQuery>({
      query: ({ range, bucket, language } = {}) => ({
        url: ApiEndpoints.ANALYTICS.START_LATENCY,
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
    getScribeOverview: builder.query<ScribeOverviewResponse, AnalyticsRangeQuery>({
      query: ({ range } = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCRIBE_OVERVIEW,
        method: HttpMethod.GET,
        params: range ? { range } : undefined,
      }),
    }),
    getScribeSummaryFailures: builder.query<ScribeSummaryFailureResponse, AnalyticsRangeQuery>({
      query: ({ range } = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCRIBE_SUMMARY_FAILURES,
        method: HttpMethod.GET,
        params: range ? { range } : undefined,
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
    // Language-quality eval dashboard: categorized weighted error rates
    // aggregated from the same per-session rows shown in session logs.
    getLanguageQuality: builder.query<
      LanguageQualityResponse,
      { range?: AnalyticsRange; language?: string }
    >({
      query: ({ range, language } = {}) => ({
        url: ApiEndpoints.ANALYTICS.LANGUAGE_QUALITY,
        method: HttpMethod.GET,
        params: {
          ...(range ? { range } : {}),
          ...(language ? { language } : {}),
        },
      }),
    }),
    // Pin the reference experiment all language-quality deltas read against.
    setLanguageReference: builder.mutation<
      LanguageEvalReference | null,
      { name?: string; filters?: Record<string, string | undefined> }
    >({
      query: body => ({
        url: ApiEndpoints.ANALYTICS.LANGUAGE_QUALITY_REFERENCE,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsHighlightsQuery,
  useGetVoiceLatencyQuery,
  useGetAgentJoinReliabilityQuery,
  useGetStartLatencyQuery,
  useGetConversationDriftQuery,
  useStartDriftBackfillMutation,
  useGetDriftBackfillStatusQuery,
  useGetLanguageQualityQuery,
  useSetLanguageReferenceMutation,
  useGetTokenConsumptionQuery,
  useGetScribeOverviewQuery,
  useGetScribeSummaryFailuresQuery,
} = analyticsAPI;
