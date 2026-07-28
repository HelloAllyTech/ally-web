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

/**
 * Window params every super-admin analytics endpoint accepts.
 *
 * `range` is the rolling preset; `from`/`to` override it with an explicit period
 * (both required together, server-capped). `compare: "prev"` asks for the
 * equal-length preceding window so a KPI can state its change against a named
 * basis. `tenantId` narrows to one org — the response's `scoping.unscopedSections`
 * lists what could not honestly be narrowed.
 */
export type AnalyticsWindowQuery = {
  range?: AnalyticsRange;
  bucket?: AnalyticsBucket;
  from?: string;
  to?: string;
  compare?: "prev";
  tenantId?: string;
};

/**
 * Serialise only the params that are set. RTK Query keys its cache on the
 * argument object, so emitting `undefined` entries would fragment the cache
 * across requests that are actually identical.
 */
const windowParams = ({
  range,
  bucket,
  from,
  to,
  compare,
  tenantId,
}: AnalyticsWindowQuery = {}): Record<string, string> => ({
  ...(range ? { range } : {}),
  ...(bucket ? { bucket } : {}),
  // from/to are only meaningful as a pair; the server rejects a lone one.
  ...(from && to ? { from, to } : {}),
  ...(compare ? { compare } : {}),
  ...(tenantId ? { tenantId } : {}),
});

type AnalyticsRangeQuery = AnalyticsWindowQuery;

type VoiceLatencyQuery = AnalyticsWindowQuery & {
  language?: string;
};

type AgentJoinReliabilityQuery = AnalyticsWindowQuery;

type HighlightsQuery = AnalyticsWindowQuery;

type StartLatencyQuery = AnalyticsWindowQuery & {
  language?: string;
};

type ConversationDriftQuery = AnalyticsWindowQuery & {
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
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.OVERVIEW,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // Leadership KPIs not covered by /overview or /scribe/overview: org
    // adoption, practice minutes, roleplay quality, CSAT, track funnel, AI cost.
    getAnalyticsHighlights: builder.query<AnalyticsHighlightsResponse, HighlightsQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.HIGHLIGHTS,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    getVoiceLatency: builder.query<VoiceLatencyResponse, VoiceLatencyQuery>({
      query: ({ language, ...q } = {}) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY,
        method: HttpMethod.GET,
        params: { ...windowParams(q), ...(language ? { language } : {}) },
      }),
    }),
    getAgentJoinReliability: builder.query<AgentJoinReliabilityResponse, AgentJoinReliabilityQuery>(
      {
        query: (q = {}) => ({
          url: ApiEndpoints.ANALYTICS.AGENT_JOIN_RELIABILITY,
          method: HttpMethod.GET,
          params: windowParams(q),
        }),
      },
    ),
    getStartLatency: builder.query<StartLatencyResponse, StartLatencyQuery>({
      query: ({ language, ...q } = {}) => ({
        url: ApiEndpoints.ANALYTICS.START_LATENCY,
        method: HttpMethod.GET,
        params: { ...windowParams(q), ...(language ? { language } : {}) },
      }),
    }),
    getTokenConsumption: builder.query<TokenConsumptionResponse, AnalyticsRangeQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.TOKEN_CONSUMPTION,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    getConversationDrift: builder.query<ConversationDriftResponse, ConversationDriftQuery>({
      query: ({
        language,
        scenarioId,
        scenarioVersionId,
        llmModel,
        llmProvider,
        promptVersion,
        ...q
      } = {}) => ({
        url: ApiEndpoints.ANALYTICS.CONVERSATION_DRIFT,
        method: HttpMethod.GET,
        params: {
          ...windowParams(q),
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
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCRIBE_OVERVIEW,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    getScribeSummaryFailures: builder.query<ScribeSummaryFailureResponse, AnalyticsRangeQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCRIBE_SUMMARY_FAILURES,
        method: HttpMethod.GET,
        params: windowParams(q),
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
      AnalyticsWindowQuery & { language?: string }
    >({
      query: ({ language, ...q } = {}) => ({
        url: ApiEndpoints.ANALYTICS.LANGUAGE_QUALITY,
        method: HttpMethod.GET,
        params: { ...windowParams(q), ...(language ? { language } : {}) },
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
