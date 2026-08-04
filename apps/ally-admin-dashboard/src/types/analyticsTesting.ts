import { AnalyticsScoping, AnalyticsWindow } from "./auth";

/**
 * Response types for the analytics endpoints behind the **Testing** tab — the
 * staging surface for leadership charts that are not yet placed on Highlights.
 *
 * These mirror the backend DTOs one-for-one. Kept in their own file rather than
 * appended to auth.ts because the whole set is provisional: charts graduate from
 * this tab onto Highlights (or are cut), and a file boundary makes "what is still
 * on trial" answerable without reading a 900-line type file.
 *
 * Two conventions run through every shape here, both from
 * wiki/product/data-visualisation.md:
 *  - **A rate over a zero denominator is `null`, never `0`.** "0% failure in a
 *    week with no sessions" is the most flattering possible way to be wrong, so
 *    the server emits a gap and the charts draw one. Counts, by contrast, are
 *    gap-filled with real zeros ("nobody practised that week" is a fact).
 *  - **Sample floors travel with the data.** `minSampleSize` / `minGroupSize` /
 *    `minPopulationSize` are echoed by the server so a client cannot hold a
 *    second, divergent copy of the rule.
 */

/* -------------------------------------------------------------------------- */
/* Activation — GET /v1/analytics/activation                                  */
/* -------------------------------------------------------------------------- */

/** Distinct learners who completed a scored roleplay in the bucket. */
export interface PractisingLearnersPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  learners: number;
  sessions: number;
}

export interface ActivationSummary {
  /** Last bucket that is NOT still accruing — what the KPI tile reports. */
  latestCompleteBucket: string | null;
  latestPractisingLearners: number | null;
  /** All-time learner population: the denominator for the funnel and the rate. */
  registeredLearners: number;
  /** Learners with >= 1 completed simulation, ever. */
  activatedLearners: number;
  /** Null below `minPopulationSize` — a rate over a handful of people names them. */
  activationRatePct: number | null;
  minPopulationSize: number;
}

export interface ActivationFunnelStage {
  key: string;
  label: string;
  reached: number;
}

export interface ActivationFunnel {
  /** Names the population the first stage is 100% of, on the panel. */
  denominatorLabel: string;
  stages: ActivationFunnelStage[];
}

/** Days from signup to first completed simulation. Inclusive on both bounds. */
export interface TimeToFirstBand {
  label: string;
  minDays: number;
  /** Inclusive upper bound; null for the open-ended top band. */
  maxDays: number | null;
}

export interface TimeToFirstCumulativePoint {
  days: number;
  activated: number;
  activatedPct: number | null;
}

export interface TimeToFirstPractice {
  bands: TimeToFirstBand[];
  /** Counts per band, index-aligned with `bands`. Never shares. */
  learnersByBand: number[];
  /** Residual: registered − activated. The absence of a level, not the lowest one. */
  neverPractised: number;
  /** The bound convention, for the caption. */
  boundsNote: string;
  cumulative: TimeToFirstCumulativePoint[];
}

export interface ActivationResponse {
  window: AnalyticsWindow;
  practisingLearners: PractisingLearnersPoint[];
  summary: ActivationSummary;
  funnel: ActivationFunnel;
  timeToFirstPractice: TimeToFirstPractice;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Completion rate — GET /v1/analytics/completion-rate                        */
/* -------------------------------------------------------------------------- */

export interface CompletionRatePoint {
  bucket: string;
  started: number;
  completed: number;
  abandoned: number;
  /** Null when nothing launched in the bucket — undefined, not 0%. */
  completionRatePct: number | null;
}

export interface CompletionRateResponse {
  window: AnalyticsWindow;
  points: CompletionRatePoint[];
  summary: {
    started: number;
    completed: number;
    abandoned: number;
    completionRatePct: number | null;
  };
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Language mix — GET /v1/analytics/language-mix                              */
/* -------------------------------------------------------------------------- */

export interface LanguageMixPoint {
  bucket: string;
  label: string;
  sessions: number;
}

export interface LanguageMixResponse {
  window: AnalyticsWindow;
  /** Ordered series labels; "Other"/"Unknown" last. Server-capped at `maxSeries`. */
  labels: string[];
  points: LanguageMixPoint[];
  /** The denominator a 100%-stacked chart hides — it has to travel with the data. */
  bucketTotals: { bucket: string; sessions: number }[];
  summary: {
    totalSessions: number;
    distinctLanguages: number;
    unknownSessions: number;
  };
  maxSeries: number;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Skill growth — GET /v1/analytics/skill-growth                              */
/* -------------------------------------------------------------------------- */

/** Median with its interquartile range, and the n behind them. */
export interface SkillGrowthStat {
  median: number | null;
  p25: number | null;
  p75: number | null;
  n: number;
}

export interface SkillGrowthOrdinal {
  /** 1 = the learner's first evaluated session. */
  ordinal: number;
  all: SkillGrowthStat;
  /** Same rows, restricted to learners who stayed — the survivorship control. */
  experienced: SkillGrowthStat;
}

export interface SkillGrowthResponse {
  ordinals: SkillGrowthOrdinal[];
  maxOrdinal: number;
  experiencedMinSessions: number;
  minSampleSize: number;
  scoreDomain: [number, number];
  /** What produced the score, and why cross-version comparison is invalid. */
  provenance: { derivation: string; note: string };
  summary: {
    learners: number;
    experiencedLearners: number;
    evaluatedSessions: number;
    firstOrdinalMedian: number | null;
    lastComparableOrdinal: number | null;
    lastComparableMedian: number | null;
  };
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Quality distribution — GET /v1/analytics/quality-distribution              */
/* -------------------------------------------------------------------------- */

export interface QualityDistributionPoint {
  bucket: string;
  median: number | null;
  p25: number | null;
  p75: number | null;
  evaluatedSessions: number;
}

export interface SatisfactionMixPoint {
  bucket: string;
  /** Ratings 1–2. */
  low: number;
  /** Rating 3. */
  mid: number;
  /** Ratings 4–5. */
  high: number;
  responses: number;
  top2BoxPct: number | null;
  /** Completed sessions in the bucket — the response-rate denominator. */
  completedSessions: number;
  responseRatePct: number | null;
}

export interface QualityDistributionResponse {
  window: AnalyticsWindow;
  /** Sparse: a bucket with no evaluated sessions is absent, not zero. */
  quality: QualityDistributionPoint[];
  satisfaction: SatisfactionMixPoint[];
  /** Tags on ratings <= 3, top 8 by count with the tail pooled into "Other". */
  lowRatingTags: { tag: string; count: number }[];
  summary: {
    evaluatedSessions: number;
    medianScore: number | null;
    p25: number | null;
    p75: number | null;
    responses: number;
    low: number;
    mid: number;
    high: number;
    top2BoxPct: number | null;
    completedSessions: number;
    responseRatePct: number | null;
    taggedLowRatings: number;
  };
  minSampleSize: number;
  scoreDomain: [number, number];
  ratingDomain: [number, number];
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Competency map — GET /v1/analytics/competency-map                          */
/* -------------------------------------------------------------------------- */

export interface CompetencyMapRow {
  competencyId: string;
  name: string;
  completedSessions: number;
  evaluatedSessions: number;
  /** Null below `minSampleSize` — the row still travels, only the score is held back. */
  medianScore: number | null;
  learners: number;
  scenarios: number;
  belowFloor: boolean;
}

export interface CompetencyMapResponse {
  /**
   * One row per competency. A scenario tagged with several competencies counts
   * towards each, so these can sum to more than `summary.completedSessions`.
   */
  competencies: CompetencyMapRow[];
  unattributed: { completedSessions: number; evaluatedSessions: number; label: string };
  minSampleSize: number;
  scoreDomain: [number, number];
  summary: { competencies: number; completedSessions: number; evaluatedSessions: number };
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Track drop-off — GET /v1/analytics/track-dropoff                           */
/* -------------------------------------------------------------------------- */

export interface TrackItemTypeRow {
  type: string;
  /** Progress rows the learner could actually reach (status not LOCKED). */
  reached: number;
  completed: number;
  completionRatePct: number | null;
  learners: number;
  belowFloor: boolean;
}

export interface TrackSectionRow {
  trackId: string;
  trackTitle: string;
  sectionId: string;
  sectionTitle: string;
  order: number;
  reached: number;
  completed: number;
  completionRatePct: number | null;
  belowFloor: boolean;
}

export interface TrackDropoffResponse {
  /** In enum declaration order — an ordered category keeps its order everywhere. */
  itemTypes: TrackItemTypeRow[];
  sections: TrackSectionRow[];
  summary: {
    enrollments: number;
    learners: number;
    itemsTracked: number;
    completedEnrollments: number;
  };
  minGroupSize: number;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Coaching loop — GET /v1/analytics/coaching-loop                            */
/* -------------------------------------------------------------------------- */

export interface CoachingLoopPoint {
  bucket: string;
  /** Sessions shared for review in the bucket. */
  sharedSessions: number;
  completedSessions: number;
  sharePct: number | null;
  reviewsWithComment: number;
  medianHoursToFirstComment: number | null;
  p90HoursToFirstComment: number | null;
  comments: number;
}

export interface CoachingLoopResponse {
  window: AnalyticsWindow;
  points: CoachingLoopPoint[];
  summary: {
    sharedSessions: number;
    completedSessions: number;
    sharePct: number | null;
    reviewsWithComment: number;
    respondedPct: number | null;
    medianHoursToFirstComment: number | null;
    p90HoursToFirstComment: number | null;
    comments: number;
  };
  minSampleSize: number;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Org health — GET /v1/analytics/org-health                                  */
/* -------------------------------------------------------------------------- */

export interface OrgHealthRow {
  tenantId: string;
  tenantName: string;
  code: string | null;
  learners: number;
  activeLearners28d: number;
  completedSimulations: number;
  completedLast28d: number;
  completedPrev28d: number;
  lastCompletedAt: string | null;
  daysSinceLastCompleted: number | null;
  /** Index-aligned with `trendBuckets` — the row's sparkline. */
  trend: number[];
  creditLimit: number;
  consumedCredits: number;
  /** Null when no limit is set: "no ceiling" is not 0% utilisation. */
  creditUtilisationPct: number | null;
  creditsUnset: boolean;
  /** Under `minGroupSize` learners: counts travel, rates are suppressed. */
  belowFloor: boolean;
}

export interface OrgHealthResponse {
  orgs: OrgHealthRow[];
  /** 12 ISO week starts, oldest first — one shared axis for every sparkline. */
  trendBuckets: string[];
  summary: { orgs: number; activeOrgs: number; dormantOrgs: number; learners: number };
  minGroupSize: number;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Scribe adoption — GET /v1/analytics/scribe-adoption                        */
/* -------------------------------------------------------------------------- */

export interface ScribeAdoptionPoint {
  bucket: string;
  orgs: number;
  counsellors: number;
  sessions: number;
}

export interface ScribeAdoptionResponse {
  window: AnalyticsWindow;
  points: ScribeAdoptionPoint[];
  summary: {
    orgs: number;
    counsellors: number;
    sessions: number;
    latestCompleteBucket: string | null;
    latestOrgs: number | null;
  };
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Org session distribution — GET /v1/analytics/org-session-distribution      */
/* -------------------------------------------------------------------------- */

export interface OrgDistributionBand {
  label: string;
  /** Orgs whose all-time average falls in this band. */
  orgs: number;
}

export interface OrgDistributionSection {
  /** Orgs with >=1 learner — the population this distribution is drawn from. */
  totalOrgs: number;
  /**
   * Lowest band first. Does NOT include the zero band (orgs whose learners
   * have no activity at all) — that is `totalOrgs` minus the sum of these,
   * computed on render so the two always add up to the stated denominator.
   */
  bands: OrgDistributionBand[];
  minGroupSize: number;
  /** False when totalOrgs is below minGroupSize — bands is empty in that case. */
  shown: boolean;
}

export interface OrgSessionDistributionResponse {
  avgMinutesPerLearner: OrgDistributionSection;
  avgSessionsPerLearner: OrgDistributionSection;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Learner KPIs — GET /v1/analytics/learner-kpis                              */
/* -------------------------------------------------------------------------- */

export interface LearnerSignupPoint {
  /** Calendar month start (yyyy-mm-dd). */
  month: string;
  newLearners: number;
  cumulativeLearners: number;
}

export interface LearnerKpisResponse {
  summary: {
    totalLearners: number;
    activeLearners: number;
    totalCompletedSessions: number;
  };
  /** All-time monthly signups — the LEARNER-scoped "new users" trend. */
  signupsByMonth: LearnerSignupPoint[];
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Scenario usage — GET /v1/analytics/scenario-usage                          */
/* -------------------------------------------------------------------------- */

export interface ScenarioUsageRow {
  scenarioId: number;
  title: string;
  /** Completed sessions, all-time. */
  sessionCount: number;
}

export interface ScenarioUsageResponse {
  /** Most-used first. */
  mostUsed: ScenarioUsageRow[];
  /** Least-used first, among scenarios with >=1 completed session. */
  leastUsed: ScenarioUsageRow[];
  scoping: AnalyticsScoping;
  computedAt: string;
}
