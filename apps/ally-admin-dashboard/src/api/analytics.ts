import { ApiEndpoints, HttpMethod } from "@constants";
import {
  ActivationResponse,
  AgentJoinReliabilityResponse,
  AnalyticsBucket,
  AnalyticsHighlightsResponse,
  AnalyticsOverviewResponse,
  AnalyticsRange,
  CoachingLoopResponse,
  CohortRetentionResponse,
  CompetencyMapResponse,
  CompletionRateResponse,
  ConversationDriftResponse,
  DriftBackfillJob,
  LanguageEvalReference,
  LanguageMixResponse,
  LanguageQualityResponse,
  WeakMetricsResponse,
  LearnerKpisResponse,
  OrgHealthResponse,
  OrgSessionDistributionResponse,
  QualityDistributionResponse,
  QualitySentimentResponse,
  RoadmapDeliveryResponse,
  RoleplayVolumeResponse,
  ScenarioUsageResponse,
  ScribeAdoptionResponse,
  ScribeOverviewResponse,
  ScribeSummaryFailureResponse,
  SkillGrowthResponse,
  StartLatencyResponse,
  TokenConsumptionResponse,
  TrackDropoffResponse,
  CertificationResponse,
  UsageLevelResponse,
  VoiceLatencyResponse,
  ListVoiceLatencySessionsResponse,
  VoiceLatencySessionsSummary,
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

type VoiceLatencySessionsQuery = AnalyticsWindowQuery & {
  scenarioId: number;
  language?: string;
  limit?: number;
  offset?: number;
};

type VoiceLatencySessionsSummaryQuery = AnalyticsWindowQuery & {
  scenarioId: number;
  language?: string;
};

type AgentJoinReliabilityQuery = AnalyticsWindowQuery;

type HighlightsQuery = AnalyticsWindowQuery;

/** Cohort retention is all-time; only the org filter applies. */
type CohortRetentionQuery = Pick<AnalyticsWindowQuery, "tenantId">;

/** Usage levels are fixed to 12 complete months + the current one, same reason. */
type UsageLevelQuery = Pick<AnalyticsWindowQuery, "tenantId">;

/**
 * Certification is all-time for a stronger reason than the other fixed-window
 * charts: the threshold is a LIFETIME total, so a window would not narrow the
 * metric, it would change it.
 */
type CertificationQuery = Pick<AnalyticsWindowQuery, "tenantId">;

/** Roleplay volume is a lifetime distribution; only the org filter applies. */
type RoleplayVolumeQuery = Pick<AnalyticsWindowQuery, "tenantId">;

/**
 * Endpoints whose quantity is a LIFETIME or all-time measure, so a window param
 * would change what is being counted rather than narrow it: a learning curve
 * inside 30 days is a window artefact, and a competency's practice volume over a
 * month says more about the month than the competency.
 */
type AllTimeAnalyticsQuery = Pick<AnalyticsWindowQuery, "tenantId">;

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
    // Monthly learner cohort retention. Deliberately takes ONLY `tenantId`:
    // the grid is all-time by design, so passing the page's window params
    // through would imply a scoping that does not happen.
    getCohortRetention: builder.query<CohortRetentionResponse, CohortRetentionQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.COHORT_RETENTION,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Monthly distribution of practice minutes across the learner population.
    // Takes ONLY `tenantId` for the same reason as cohort retention: the window
    // is fixed and month-grained, so passing the page's range through would imply
    // a scoping that does not happen.
    getUsageLevels: builder.query<UsageLevelResponse, UsageLevelQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.USAGE_LEVELS,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Ally Certification attainment — the platform's hero metric. Takes ONLY
    // `tenantId`: the threshold is a LIFETIME minute total, so a window param
    // would truncate each learner's history, move their crossing later or hide
    // it, and make the cumulative line fall — which it can never really do.
    getCertification: builder.query<CertificationResponse, CertificationQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.CERTIFICATION,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Lifetime distribution of completed roleplays across the learner
    // population. Takes ONLY `tenantId`, like usage levels and cohort retention:
    // the quantity is a LIFETIME count, so a window param would change what is
    // being counted rather than narrow it.
    getRoleplayVolume: builder.query<RoleplayVolumeResponse, RoleplayVolumeQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.ROLEPLAY_VOLUME,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Coins shipped per month by owner, off the internal product roadmap. Takes
    // NO params at all — not even `tenantId`: the roadmap tables carry no tenant
    // (it is Ally's own backlog), and the axis is all-time by construction
    // because a quarter can hold a handful of releases.
    getRoadmapDelivery: builder.query<RoadmapDeliveryResponse, void>({
      query: () => ({
        url: ApiEndpoints.ANALYTICS.ROADMAP_DELIVERY,
        method: HttpMethod.GET,
      }),
    }),
    getVoiceLatency: builder.query<VoiceLatencyResponse, VoiceLatencyQuery>({
      query: ({ language, ...q } = {}) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY,
        method: HttpMethod.GET,
        params: { ...windowParams(q), ...(language ? { language } : {}) },
      }),
    }),
    getVoiceLatencySessions: builder.query<
      ListVoiceLatencySessionsResponse,
      VoiceLatencySessionsQuery
    >({
      query: ({ scenarioId, language, limit, offset, ...q }) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY_SESSIONS,
        method: HttpMethod.GET,
        params: {
          ...windowParams(q),
          scenarioId,
          ...(language ? { language } : {}),
          ...(limit != null ? { limit } : {}),
          ...(offset != null ? { offset } : {}),
        },
      }),
    }),
    getVoiceLatencySessionsSummary: builder.query<
      VoiceLatencySessionsSummary,
      VoiceLatencySessionsSummaryQuery
    >({
      query: ({ scenarioId, language, ...q }) => ({
        url: ApiEndpoints.ANALYTICS.VOICE_LATENCY_SESSIONS_SUMMARY,
        method: HttpMethod.GET,
        params: {
          ...windowParams(q),
          scenarioId,
          ...(language ? { language } : {}),
        },
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
    // The five weak-performing metrics on one filter tuple. Deliberately a
    // single request: reading them apart invites the composition mistake this
    // tab exists to prevent.
    getWeakPerformingMetrics: builder.query<
      WeakMetricsResponse,
      {
        range?: string;
        bucket?: "week" | "month";
        language?: string;
        llmModel?: string;
        scenarioId?: number;
        promptVersion?: string;
      }
    >({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.WEAK_PERFORMING_METRICS,
        method: HttpMethod.GET,
        params: Object.fromEntries(
          Object.entries(q).filter(([, v]) => v !== undefined && v !== ""),
        ),
      }),
    }),
    /* ------------------------- Testing-tab endpoints ------------------------ */
    //
    // Windowed like /highlights (range + per-chart bucket), except the four whose
    // quantity is all-time by construction — those take `tenantId` only, for the
    // same reason cohort retention and roleplay volume do.

    // North-star series (weekly practising learners) + the activation funnel and
    // time-to-first-practice distribution, in one response: all three answer "do
    // new learners reach value, and how fast", and they share one denominator.
    getActivation: builder.query<ActivationResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.ACTIVATION,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // Started vs completed roleplays — the friction signal that also guards every
    // efficacy number on the tab (those only see completers).
    getCompletionRate: builder.query<CompletionRateResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.COMPLETION_RATE,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // Language mix of completed sessions. Volume only — quality by language is
    // the Language tab's question, and duplicating it here would let a reader
    // compare a number with itself.
    getLanguageMix: builder.query<LanguageMixResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.LANGUAGE_MIX,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // Score by Nth completed session — the efficacy curve. All-time: an ordinal
    // is a position in a learner's history, not a date.
    getSkillGrowth: builder.query<SkillGrowthResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.SKILL_GROWTH,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Quality as a distribution (median + IQR) and satisfaction as a rating mix,
    // plus the tags behind low ratings — the three panels that replace two means.
    getQualityDistribution: builder.query<QualityDistributionResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.QUALITY_DISTRIBUTION,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // Roleplay Quality Index vs learner sentiment. `avgCompositeScore` stays on
    // each point for audit, but the plotted quality series is `qualityIndex`.
    getQualitySentiment: builder.query<QualitySentimentResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.QUALITY_SENTIMENT,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    getCompetencyMap: builder.query<CompetencyMapResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.COMPETENCY_MAP,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    getTrackDropoff: builder.query<TrackDropoffResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.TRACK_DROPOFF,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    getCoachingLoop: builder.query<CoachingLoopResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.COACHING_LOOP,
        method: HttpMethod.GET,
        params: windowParams(q),
      }),
    }),
    // One row per customer org. All-time totals plus a fixed trailing 12-week
    // trend, so "fading" is visible without a window picker.
    getOrgHealth: builder.query<OrgHealthResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.ORG_HEALTH,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // How the whole customer base is shaped (org-health is which SPECIFIC org
    // needs attention) — bucketed by avg minutes/sessions per learner, all-time.
    getOrgSessionDistribution: builder.query<OrgSessionDistributionResponse, AllTimeAnalyticsQuery>(
      {
        query: ({ tenantId } = {}) => ({
          url: ApiEndpoints.ANALYTICS.ORG_SESSION_DISTRIBUTION,
          method: HttpMethod.GET,
          params: tenantId ? { tenantId } : {},
        }),
      },
    ),
    // LEARNER-role-scoped counterparts of overview's totalUsers/activeUsers/
    // simulationsCompleted/newUsers, which count every account regardless of role.
    getLearnerKpis: builder.query<LearnerKpisResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.LEARNER_KPIS,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Platform-wide most/least-used scenarios — the org-scoped sibling lives on
    // the tenant-admin Organization Metrics dashboard, not here.
    getScenarioUsage: builder.query<ScenarioUsageResponse, AllTimeAnalyticsQuery>({
      query: ({ tenantId } = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCENARIO_USAGE,
        method: HttpMethod.GET,
        params: tenantId ? { tenantId } : {},
      }),
    }),
    // Scribe BREADTH (orgs and counsellors using it), not ops volume — the
    // failure funnels and provider reliability stay on the Scribe tab.
    getScribeAdoption: builder.query<ScribeAdoptionResponse, AnalyticsWindowQuery>({
      query: (q = {}) => ({
        url: ApiEndpoints.ANALYTICS.SCRIBE_ADOPTION,
        method: HttpMethod.GET,
        params: windowParams(q),
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
  useGetCohortRetentionQuery,
  useGetCertificationQuery,
  useGetUsageLevelsQuery,
  useGetRoleplayVolumeQuery,
  useGetRoadmapDeliveryQuery,
  useGetVoiceLatencyQuery,
  useGetVoiceLatencySessionsQuery,
  useGetVoiceLatencySessionsSummaryQuery,
  useGetAgentJoinReliabilityQuery,
  useGetStartLatencyQuery,
  useGetConversationDriftQuery,
  useStartDriftBackfillMutation,
  useGetDriftBackfillStatusQuery,
  useGetLanguageQualityQuery,
  useGetWeakPerformingMetricsQuery,
  useSetLanguageReferenceMutation,
  useGetTokenConsumptionQuery,
  useGetScribeOverviewQuery,
  useGetScribeSummaryFailuresQuery,
  useGetActivationQuery,
  useGetCompletionRateQuery,
  useGetLanguageMixQuery,
  useGetSkillGrowthQuery,
  useGetQualityDistributionQuery,
  useGetQualitySentimentQuery,
  useGetCompetencyMapQuery,
  useGetTrackDropoffQuery,
  useGetCoachingLoopQuery,
  useGetOrgHealthQuery,
  useGetOrgSessionDistributionQuery,
  useGetLearnerKpisQuery,
  useGetScenarioUsageQuery,
  useGetScribeAdoptionQuery,
} = analyticsAPI;
