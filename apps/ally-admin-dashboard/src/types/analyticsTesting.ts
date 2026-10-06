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
//
// Since 2026-10 every skill-growth endpoint reads the LEARNER ruler (R1): each
// learner's roleplay speech cut into 5,000-character slices ("cuts"), each
// scored 1–4 on the foundational helping skills rubric. Before then the same
// keys carried the AI judge's 0–100 score of the AI actor. The keys were kept
// so a released build kept rendering; their meaning changed — an "ordinal" or
// "session" below is a scored slice, and a score is 1–4.

/** Median with its interquartile range, and the n behind them. */
export interface SkillGrowthStat {
  /** Helping-skills composite, 1–4 (2 dp); null below `minSampleSize`. */
  median: number | null;
  p25: number | null;
  p75: number | null;
  /** Learners with a scored slice at this index — travels when the percentiles do not. */
  n: number;
}

export interface SkillGrowthOrdinal {
  /** The learner's slice index: 1 = their first 5,000 characters of roleplay speech. */
  ordinal: number;
  all: SkillGrowthStat;
  /** Same slices, restricted to learners who stayed — the survivorship control. */
  experienced: SkillGrowthStat;
}

/**
 * How a learner's own history moved. `insufficient` = too few scored slices
 * to say anything, which is a state to render, not a gap to hide.
 */
export type SkillTrendClass = "improving" | "flat" | "declining" | "insufficient";

/**
 * The knobs the server classified under, echoed with every response.
 *
 * Read them, never re-declare them: a client copy is how a legend ends up
 * stating one band while the server classified at another.
 */
export interface SkillTrendThresholds {
  /** Scored slices a learner needs before their trend is classified. */
  minSessions: number;
  /** Slices in each half AT that minimum (⌊minSessions/2⌋) — the smallest window. */
  window: number;
  /**
   * The widest band any classified learner faces (1–4 scale): the band at
   * `minSessions` slices. Null when the noise cannot be estimated yet.
   */
  flatBand: number | null;
  /** Slice-to-slice noise (SD, 1–4 scale); null with no consecutive pairs. */
  cutNoiseSd: number | null;
  /** z of the noise band (1.96). */
  bandZ: number;
  /** The classification rule in words, with the live constants. */
  bandRule: string;
}

export interface SkillTrendMixMonth {
  /** 'YYYY-MM' the learner became classifiable — not calendar activity. */
  month: string;
  improving: number;
  flat: number;
  declining: number;
}

export interface SkillTrendMix {
  classifiedLearners: number;
  insufficientLearners: number;
  improving: number;
  flat: number;
  declining: number;
  months: SkillTrendMixMonth[];
  thresholds: SkillTrendThresholds;
}

export interface SkillGrowthResponse {
  ordinals: SkillGrowthOrdinal[];
  maxOrdinal: number;
  /** Scored slices a learner needs to enter the `experienced` series. */
  experiencedMinSessions: number;
  minSampleSize: number;
  /** The rubric's [1, 4] (was [0, 100] until 2026-10). */
  scoreDomain: [number, number];
  /** Rubric version every score was judged under; versions are never pooled. */
  rubricVersion: string;
  /** Learner characters per slice — the size of one ordinal step. */
  cutSizeLearnerChars: number;
  /** What produced the score, and why cross-version comparison is invalid. */
  provenance: { derivation: string; note: string };
  summary: {
    learners: number;
    experiencedLearners: number;
    /** Scored slices (name kept from when it counted judged sessions). */
    evaluatedSessions: number;
    firstOrdinalMedian: number | null;
    lastComparableOrdinal: number | null;
    lastComparableMedian: number | null;
  };
  /** Per-person movement the population median nets out. */
  trendMix: SkillTrendMix;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Skill growth drill-down — GET /v1/analytics/skill-growth/learners[/:userId] */
/* -------------------------------------------------------------------------- */

export interface SkillTrendLearnerRow {
  learnerId: number;
  name: string | null;
  email: string | null;
  tenantId: string | null;
  /** Scored slices in scope (name kept from when it counted judged sessions). */
  evaluatedSessions: number;
  /** Mean composite (1–4) of the first half of their slices; null when `insufficient`. */
  firstWindowMean: number | null;
  /** Mean composite (1–4) of the last half; null when `insufficient`. */
  lastWindowMean: number | null;
  delta: number | null;
  /** ± band this learner's change had to clear — narrower with more slices. */
  band: number | null;
  trend: SkillTrendClass;
  /** When the session that closed their latest scored slice ended. */
  lastSessionAt: string | null;
}

export interface SkillGrowthLearnersResponse {
  rows: SkillTrendLearnerRow[];
  total: number;
  limit: number;
  offset: number;
  thresholds: SkillTrendThresholds;
  rubricVersion: string;
  provenance: { derivation: string; note: string };
  scoping: AnalyticsScoping;
  computedAt: string;
}

export type SkillGrowthLearnersQuery = {
  tenantId?: string;
  limit?: number;
  offset?: number;
  sort?: "delta" | "evaluatedSessions" | "lastSessionAt";
  order?: "asc" | "desc";
};

/**
 * One `skillCoverage` entry as the evaluator wrote it.
 *
 * `category` is a free string on purpose: two label generations exist in the
 * data ("Listening Engagement"/"Emotional Attunement"/"Supportive engagement"
 * and the older "Learning"/"Support"/"Standards"), so consumers group by the
 * string they receive rather than by an enum that would drop half the rows.
 */
export interface SkillCoverageEntry {
  category: string;
  percentage: number;
}

/** One scored slice on a learner's own timeline (key name kept: it is not a session). */
export interface SkillGrowthLearnerSession {
  /** Slice index; gaps are slices that failed scoring or are not yet scored. */
  ordinal: number;
  occurredAt: string | null;
  /** The slice's scenarios, distinct titles in practice order joined " · ". */
  scenarioTitle: string | null;
  /** Helping-skills composite, 1–4 (2 dp). */
  compositeScore: number;
  /** Always null since 2026-10 — per-skill levels are in `skillLevels`. */
  skillCoverage: SkillCoverageEntry[] | null;
  /** Level 1–4 per rubric skill the slice gave an opportunity for; absent = no opportunity. */
  skillLevels: Record<string, number>;
  /** True when the judge saw an unhelpful behaviour in the slice; null when not recorded. */
  hasUnhelpfulBehaviour: boolean | null;
}

export interface SkillGrowthKnowledgeAttempt {
  kind: "quiz" | "annotation";
  itemTitle: string | null;
  scorePct: number;
  attemptNumber: number;
  submittedAt: string | null;
}

export interface SkillGrowthLearnerSeriesResponse {
  learner: {
    id: number;
    name: string | null;
    email: string | null;
    tenantId: string | null;
    evaluatedSessions: number;
    firstWindowMean: number | null;
    lastWindowMean: number | null;
    delta: number | null;
    band: number | null;
    trend: SkillTrendClass;
  };
  sessions: SkillGrowthLearnerSession[];
  knowledgeAttempts: SkillGrowthKnowledgeAttempt[];
  /** True when a series hit the server row cap — the timeline is incomplete. */
  truncated: boolean;
  thresholds: SkillTrendThresholds;
  /** The ROLEPLAY (slice composite) axis: [1, 4]. */
  scoreDomain: [number, number];
  /** The quiz/annotation axis (`scorePct`): [0, 100]. Never shared with the roleplay axis. */
  knowledgeScoreDomain: [number, number];
  rubricVersion: string;
  provenance: { derivation: string; note: string };
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
  /** Mean of the raw 1–5 ratings (2 dp); null when nobody rated. `responses` is its n. */
  avgRating: number | null;
  top2BoxPct: number | null;
  /** Completed sessions in the bucket — the response-rate denominator. */
  completedSessions: number;
  responseRatePct: number | null;
}

/** Ratings at one ordinal, for one population (AAQ-229). Null below `minSampleSize` ratings. */
export interface SatisfactionOrdinalCell {
  /** One per learner: each learner has one Nth rated session. Always present. */
  ratings: number;
  avgRating: number | null;
  /** Share rated 4 or 5 (%), 1 dp. */
  highSharePct: number | null;
}

export interface SatisfactionOrdinalPoint {
  /** The learner's Nth RATED session (unrated sessions are not counted). */
  ordinal: number;
  all: SatisfactionOrdinalCell;
  /** Fixed panel: learners with `experiencedMinRatings`+ rated sessions in total. */
  experienced: SatisfactionOrdinalCell;
}

/**
 * Satisfaction by practice ordinal (AAQ-229). ALL-TIME whatever the endpoint's
 * window says; scoped by the session's tenant.
 */
export interface SatisfactionByOrdinal {
  window: "all";
  maxOrdinal: number;
  experiencedMinRatings: number;
  minSampleSize: number;
  ratedLearners: number;
  experiencedLearners: number;
  /** 1..maxOrdinal, contiguous: an ordinal nobody reached has zero counts and null values. */
  points: SatisfactionOrdinalPoint[];
  ratingsBeyondLastOrdinal: number;
  provenance: { derivation: string; note: string };
}

export interface QualityDistributionResponse {
  /** Additive (AAQ-229). Optional: a backend deployed before it omits the block. */
  byOrdinal?: SatisfactionByOrdinal;
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
    /** Mean of every raw rating in the window, not a mean of bucket means. */
    avgRating: number | null;
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

/** Why a competency has no score: no rubric skill to read, or too few slices. */
export type CompetencyScoreUnavailable = "noRubricSkill" | "tooFewCuts";

export interface CompetencyMapRow {
  competencyId: string;
  name: string;
  /** Completed sessions on scenarios carrying the tag — the volume axis. */
  completedSessions: number;
  learners: number;
  scenarios: number;
  /** The rubric skill key the competency names, or null when it names none. */
  skill: string | null;
  /** The rubric's display name for `skill`. */
  skillName: string | null;
  /**
   * Mean level (1–4) of `skill` over `scoredCuts`; null with `scoreUnavailable`
   * set. Since 2026-10 — before then the map plotted the AI actor's judge score.
   */
  score: number | null;
  /** Single-scenario scored slices on tagged scenarios, assessable or not. */
  taggedCuts: number;
  /** Of `taggedCuts`, slices that gave the skill an opportunity — the n behind `score`. */
  scoredCuts: number;
  /** Distinct learners behind `scoredCuts`. */
  scoreLearners: number;
  scoreUnavailable: CompetencyScoreUnavailable | null;
  /** @deprecated alias of `score` (a mean on 1–4 since 2026-10). */
  medianScore: number | null;
  /** @deprecated alias of `scoredCuts`. */
  evaluatedSessions: number;
  /** `scoreUnavailable === "tooFewCuts"`. */
  belowFloor: boolean;
}

export interface CompetencyMapResponse {
  /**
   * One row per competency, unscored rows included. A scenario tagged with
   * several competencies counts towards each, so these can sum to more than
   * `summary.completedSessions`.
   */
  competencies: CompetencyMapRow[];
  unattributed: {
    completedSessions: number;
    scoredCuts: number;
    /** @deprecated alias of `scoredCuts`. */
    evaluatedSessions: number;
    label: string;
  };
  minSampleSize: number;
  /** The rubric's [1, 4]. */
  scoreDomain: [number, number];
  rubricVersion: string;
  /** How much of the learner ruler the map can credit to a scenario's tags. */
  cutAttribution: {
    scoredCuts: number;
    singleScenarioCuts: number;
    /** singleScenarioCuts ÷ scoredCuts × 100 (1 dp); null below the floor. */
    singleScenarioPct: number | null;
    untaggedCuts: number;
  };
  summary: { competencies: number; completedSessions: number; evaluatedSessions: number };
  provenance: { derivation: string; note: string };
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
