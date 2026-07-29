import { useMemo, useState } from "react";

import { LineChart, ScatterChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  AnalyticsWindowQuery,
  useGetActivationQuery,
  useGetCoachingLoopQuery,
  useGetCompetencyMapQuery,
  useGetCompletionRateQuery,
  useGetLanguageMixQuery,
  useGetOrgHealthQuery,
  useGetQualityDistributionQuery,
  useGetScribeAdoptionQuery,
  useGetSkillGrowthQuery,
  useGetTrackDropoffQuery,
} from "@api";
import { AnalyticsBucket } from "@types";

import { AnalyticsTabFilters, asOf, asOfStamp, windowLabel } from "../analyticsFilters";
import {
  DEFAULT_GROUPING,
  bucketTitle,
  groupingNote,
  inProgressCaption,
  isInProgress,
  useChartGrouping,
  withoutInProgress,
} from "../analyticsGrouping";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTile,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  barOpts,
  boundedDomainNote,
  buildSource,
  hBarOpts,
  lineOpts,
  scatterOpts,
  stackedBarOpts,
  timeBarOpts,
} from "../chartKit";
import { FunnelBars } from "../FunnelBars";
import { OrgHealthCard } from "../OrgHealthCard";
import {
  COMPETENCY_SCALE,
  COMPLETION_SCALE,
  PCT_DOMAIN,
  PRACTISING_SCALE,
  RATING_BAND_SCALE,
  SCORE_DOMAIN,
  SCRIBE_ORGS_SCALE,
  SCRIBE_SESSIONS_SCALE,
  SHARED_SCALE,
  SKILL_GROWTH_SCALE,
  SKILL_GROWTH_VARIANTS,
  SkillGrowthVariant,
  TESTING_GROUPS,
  TURNAROUND_SCALE,
  allRatesMissing,
  buildActivationFunnelStages,
  buildCompetencyScatter,
  buildCompletionRateSeries,
  buildItemTypeBars,
  buildItemTypeScale,
  buildLanguageMixScale,
  buildLanguageMixSeries,
  buildLowRatingTagBars,
  buildPractisingLearnersSeries,
  buildQualityBandSeries,
  buildRankedBarScale,
  buildSatisfactionMixSeries,
  buildScribeOrgsSeries,
  buildScribeSessionsSeries,
  buildSharedSessionsSeries,
  buildSkillGrowthSeries,
  buildTimeToFirstBars,
  buildTimeToFirstScale,
  buildTurnaroundSeries,
  competencyTakeaway,
  formatCount,
  formatHours,
  formatPct,
  formatScore,
  itemTypeLabel,
  itemTypeTakeaway,
  ordinalLabel,
  plottableOrdinals,
  practisingTakeaway,
  ratedBuckets,
  satisfactionTakeaway,
  skillGrowthTakeaway,
  suppressedCompetencies,
  suppressedItemTypes,
} from "../testingChart";

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/**
 * Charts on this tab that carry their own grouping control — one entry per chart
 * whose grain re-grains the SAME metric at a different resolution.
 *
 * The all-time panels are deliberately absent: an ordinal position in a learner's
 * history (skill growth), a lifetime distribution (time to first practice), a
 * per-competency total and a per-org row have no time axis to re-grain, and a
 * control that changes nothing reads as a control that is broken.
 */
type ChartId =
  | "wpl"
  | "completion"
  | "quality"
  | "satisfaction"
  | "coaching"
  | "languageMix"
  | "scribeAdoption";

/**
 * The north star is a WEEKLY count by definition — "practising learners this
 * week" is the metric, not a monthly figure read at a finer grain — so it opens
 * on week while everything else opens on the all-time default of month.
 */
const DEFAULT_GROUPINGS: Record<ChartId, AnalyticsBucket> = {
  wpl: "week",
  completion: DEFAULT_GROUPING,
  quality: DEFAULT_GROUPING,
  satisfaction: DEFAULT_GROUPING,
  coaching: DEFAULT_GROUPING,
  languageMix: DEFAULT_GROUPING,
  scribeAdoption: DEFAULT_GROUPING,
};

/** A weekly-or-coarser metric: a daily north star is noise, a yearly one hides it. */
const WPL_GRAINS: AnalyticsBucket[] = ["week", "month"];

type GrainQueries<T> = Record<AnalyticsBucket, T>;

/**
 * One query per grain, four hooks in a fixed order so hook order never changes,
 * each skipped unless a chart fed by this endpoint is reading that grain.
 *
 * Unlike the Highlights tab this does NOT also pin the base grain: every panel
 * here reads either a bucketed series or a bucket-INVARIANT summary (the KPI
 * scalars, the funnel, the distributions), so there is no panel that would blink
 * out when the last chart on a grain is switched away. Re-graining a chart
 * therefore replaces a request rather than adding one.
 */
const useGrainQueries = <T,>(
  useQueryHook: (arg: AnalyticsWindowQuery, opts: { skip: boolean }) => T,
  query: AnalyticsWindowQuery,
  grains: Set<AnalyticsBucket>,
): GrainQueries<T> => ({
  day: useQueryHook({ ...query, bucket: "day" }, { skip: !grains.has("day") }),
  week: useQueryHook({ ...query, bucket: "week" }, { skip: !grains.has("week") }),
  month: useQueryHook({ ...query, bucket: "month" }, { skip: !grains.has("month") }),
  year: useQueryHook({ ...query, bucket: "year" }, { skip: !grains.has("year") }),
});

/**
 * **Testing** — the staging surface for leadership charts.
 *
 * Everything here is a candidate for the Highlights tab and nothing here has
 * earned a place on it yet: the point of the tab is to run these panels against
 * real production data, see which ones actually change a decision, and move those
 * that do. Nothing on Highlights was altered to make room, so the two can be read
 * side by side — including where they measure the same thing differently (the
 * quality and satisfaction panels here are distribution-aware successors to the
 * two mean-lines there, which is the comparison worth making before either is
 * retired).
 *
 * ## Conventions inherited from Highlights, on purpose
 *
 * All-time window, no range picker, no KPI deltas (an all-time window has no
 * equal-length predecessor, so there is no basis to compare against and the arrow
 * goes rather than the basis being invented), per-chart server-side grain, and the
 * still-accruing period left off every plot but kept — flagged — in the expanded
 * table. A chart that graduates to Highlights should need no rework.
 *
 * ## What is deliberately NOT here
 *
 * Per-tenant AI cost, the browse-but-never-launched funnel stage, and abandonment
 * reasons: all three need instrumentation that does not exist yet. A panel built
 * on a column that is mostly null looks like a measurement and is not one, so
 * they stay on the logging roadmap rather than shipping as placeholders.
 */
export const TestingTab = ({ query }: AnalyticsTabFilters) => {
  const { groupingFor, setGrouping } = useChartGrouping<ChartId>(
    DEFAULT_GROUPINGS,
    DEFAULT_GROUPING,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [skillVariant, setSkillVariant] = useState<SkillGrowthVariant>("all");

  const grain = {
    wpl: groupingFor("wpl"),
    completion: groupingFor("completion"),
    quality: groupingFor("quality"),
    satisfaction: groupingFor("satisfaction"),
    coaching: groupingFor("coaching"),
    languageMix: groupingFor("languageMix"),
    scribeAdoption: groupingFor("scribeAdoption"),
  };

  /* --------------------------- windowed endpoints -------------------------- */

  const activationQ = useGrainQueries(useGetActivationQuery, query, new Set([grain.wpl]));
  const completionQ = useGrainQueries(
    useGetCompletionRateQuery,
    query,
    new Set([grain.completion]),
  );
  const qualityQ = useGrainQueries(
    useGetQualityDistributionQuery,
    query,
    new Set([grain.quality, grain.satisfaction]),
  );
  const coachingQ = useGrainQueries(useGetCoachingLoopQuery, query, new Set([grain.coaching]));
  const languageQ = useGrainQueries(useGetLanguageMixQuery, query, new Set([grain.languageMix]));
  const scribeQ = useGrainQueries(
    useGetScribeAdoptionQuery,
    query,
    new Set([grain.scribeAdoption]),
  );

  const activation = activationQ[grain.wpl];
  const completion = completionQ[grain.completion];
  const quality = qualityQ[grain.quality];
  const satisfaction = qualityQ[grain.satisfaction];
  const coaching = coachingQ[grain.coaching];
  const languageMix = languageQ[grain.languageMix];
  const scribe = scribeQ[grain.scribeAdoption];

  /* --------------------------- all-time endpoints -------------------------- */
  //
  // These take only the org filter: their quantity is a lifetime or all-time
  // measure, so a window would change what is being counted rather than narrow it.

  const tenantOnly = useMemo(() => ({ tenantId: query.tenantId }), [query.tenantId]);
  const skillGrowth = useGetSkillGrowthQuery(tenantOnly);
  const competencyMap = useGetCompetencyMapQuery(tenantOnly);
  const trackDropoff = useGetTrackDropoffQuery(tenantOnly);
  const orgHealth = useGetOrgHealthQuery(tenantOnly);

  /**
   * Whether a panel's OWN request is still in flight. `isUninitialized` counts:
   * on the render where a grain is first selected the hook has only just stopped
   * being skipped, so it reports neither loading nor fetching and the card would
   * flash its empty state for a frame.
   */
  const busy = (q: {
    isLoading: boolean;
    isFetching: boolean;
    isUninitialized: boolean;
    data?: unknown;
  }) => !q.data && (q.isLoading || q.isFetching || q.isUninitialized);

  const picker = (chart: ChartId, options?: AnalyticsBucket[]) => (
    <GroupingPicker
      id={`testing-grouping-${chart}`}
      value={groupingFor(chart)}
      onChange={g => setGrouping(chart, g)}
      options={options}
    />
  );

  /* ------------------------------ plotted series --------------------------- */

  const a = activation.data;
  const wplInProgress = a?.window.inProgressBucket;
  const wplPoints = useMemo(
    () => withoutInProgress(a?.practisingLearners ?? [], p => p.bucket, wplInProgress),
    [a, wplInProgress],
  );
  const wplSeries = useMemo(() => buildPractisingLearnersSeries(wplPoints), [wplPoints]);

  const funnelStages = useMemo(() => buildActivationFunnelStages(a?.funnel), [a]);
  const ttfBars = useMemo(() => buildTimeToFirstBars(a?.timeToFirstPractice), [a]);
  const ttfScale = useMemo(() => buildTimeToFirstScale(a?.timeToFirstPractice), [a]);

  const c = completion.data;
  const completionInProgress = c?.window.inProgressBucket;
  const completionPoints = useMemo(
    () => withoutInProgress(c?.points ?? [], p => p.bucket, completionInProgress),
    [c, completionInProgress],
  );
  const completionSeries = useMemo(
    () => buildCompletionRateSeries(completionPoints),
    [completionPoints],
  );

  const sg = skillGrowth.data;
  const skillSeries = useMemo(
    () => buildSkillGrowthSeries(sg?.ordinals ?? [], skillVariant),
    [sg, skillVariant],
  );
  const skillPlotted = useMemo(
    () => plottableOrdinals(sg?.ordinals ?? [], skillVariant),
    [sg, skillVariant],
  );
  const skillVariantMeta =
    SKILL_GROWTH_VARIANTS.find(v => v.key === skillVariant) ?? SKILL_GROWTH_VARIANTS[0];

  const q = quality.data;
  const qualityInProgress = q?.window.inProgressBucket;
  const qualityPoints = useMemo(
    () => withoutInProgress(q?.quality ?? [], p => p.bucket, qualityInProgress),
    [q, qualityInProgress],
  );
  const qualitySeries = useMemo(() => buildQualityBandSeries(qualityPoints), [qualityPoints]);

  const s = satisfaction.data;
  const satisfactionInProgress = s?.window.inProgressBucket;
  const satisfactionPoints = useMemo(
    () => withoutInProgress(s?.satisfaction ?? [], p => p.bucket, satisfactionInProgress),
    [s, satisfactionInProgress],
  );
  const satisfactionSeries = useMemo(
    () => buildSatisfactionMixSeries(satisfactionPoints),
    [satisfactionPoints],
  );
  // How many periods actually carry a stateable mix — a 100%-stacked chart hides
  // its own base, so the caption says how many bars are real.
  const satisfactionRated = useMemo(() => ratedBuckets(satisfactionPoints), [satisfactionPoints]);
  const tagBars = useMemo(() => buildLowRatingTagBars(q?.lowRatingTags ?? []), [q]);
  const tagScale = useMemo(() => buildRankedBarScale(tagBars), [tagBars]);

  const cm = competencyMap.data;
  const competencyPoints = useMemo(() => buildCompetencyScatter(cm?.competencies ?? []), [cm]);
  const competencyHeld = useMemo(() => suppressedCompetencies(cm?.competencies ?? []), [cm]);

  const td = trackDropoff.data;
  const itemBars = useMemo(() => buildItemTypeBars(td?.itemTypes ?? []), [td]);
  const itemScale = useMemo(() => buildItemTypeScale(itemBars), [itemBars]);
  const itemHeld = useMemo(() => suppressedItemTypes(td?.itemTypes ?? []), [td]);

  const cl = coaching.data;
  const coachingInProgress = cl?.window.inProgressBucket;
  const coachingPoints = useMemo(
    () => withoutInProgress(cl?.points ?? [], p => p.bucket, coachingInProgress),
    [cl, coachingInProgress],
  );
  const sharedSeries = useMemo(() => buildSharedSessionsSeries(coachingPoints), [coachingPoints]);
  const turnaroundSeries = useMemo(() => buildTurnaroundSeries(coachingPoints), [coachingPoints]);

  const lm = languageMix.data;
  const languageInProgress = lm?.window.inProgressBucket;
  const languageTotals = useMemo(
    () => withoutInProgress(lm?.bucketTotals ?? [], t => t.bucket, languageInProgress),
    [lm, languageInProgress],
  );
  const languageSeries = useMemo(
    () => buildLanguageMixSeries(lm?.labels ?? [], lm?.points ?? [], languageTotals),
    [lm, languageTotals],
  );
  const languageScaleMap = useMemo(() => buildLanguageMixScale(lm?.labels ?? []), [lm]);

  const sa = scribe.data;
  const scribeInProgress = sa?.window.inProgressBucket;
  const scribePoints = useMemo(
    () => withoutInProgress(sa?.points ?? [], p => p.bucket, scribeInProgress),
    [sa, scribeInProgress],
  );
  const scribeOrgsSeries = useMemo(() => buildScribeOrgsSeries(scribePoints), [scribePoints]);
  const scribeSessionsSeries = useMemo(
    () => buildScribeSessionsSeries(scribePoints),
    [scribePoints],
  );

  /* --------------------------------- options ------------------------------- */

  const wplOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Learners",
        bottomTitle: bucketTitle(grain.wpl),
        colorScale: PRACTISING_SCALE,
        legend: false,
      }),
    [grain.wpl],
  );
  const ttfOpts = useMemo(
    () =>
      barOpts({
        leftTitle: "Learners",
        bottomTitle: "Days to first session",
        colorScale: ttfScale,
      }),
    [ttfScale],
  );
  const completionOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Completed of started (%)",
        bottomTitle: bucketTitle(grain.completion),
        colorScale: COMPLETION_SCALE,
        legend: false,
        domain: PCT_DOMAIN,
      }),
    [grain.completion],
  );
  const completionZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Completed of started (%)",
        bottomTitle: bucketTitle(grain.completion),
        colorScale: COMPLETION_SCALE,
        legend: false,
      }),
    [grain.completion],
  );
  const skillOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: "Session number for that learner",
        colorScale: SKILL_GROWTH_SCALE,
        domain: SCORE_DOMAIN,
      }),
    [],
  );
  const skillZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: "Session number for that learner",
        colorScale: SKILL_GROWTH_SCALE,
      }),
    [],
  );
  const qualityOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle(grain.quality),
        colorScale: SKILL_GROWTH_SCALE,
        domain: SCORE_DOMAIN,
      }),
    [grain.quality],
  );
  const qualityZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Composite score",
        bottomTitle: bucketTitle(grain.quality),
        colorScale: SKILL_GROWTH_SCALE,
      }),
    [grain.quality],
  );
  const satisfactionOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of ratings (%)",
        bottomTitle: bucketTitle(grain.satisfaction),
        colorScale: RATING_BAND_SCALE,
        domain: PCT_DOMAIN,
      }),
    [grain.satisfaction],
  );
  const tagOpts = useMemo(
    () => hBarOpts({ bottomTitle: "Low-rated sessions", colorScale: tagScale }),
    [tagScale],
  );
  const competencyOpts = useMemo(
    () =>
      scatterOpts({
        leftTitle: "Median composite score",
        bottomTitle: "Completed sessions",
        colorScale: COMPETENCY_SCALE,
        domain: SCORE_DOMAIN,
      }),
    [],
  );
  const itemOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Completed of reached (%)",
        colorScale: itemScale,
        domain: PCT_DOMAIN,
      }),
    [itemScale],
  );
  const sharedOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Sessions shared",
        bottomTitle: bucketTitle(grain.coaching),
        colorScale: SHARED_SCALE,
      }),
    [grain.coaching],
  );
  const turnaroundOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Hours to first comment",
        bottomTitle: bucketTitle(grain.coaching),
        colorScale: TURNAROUND_SCALE,
        legend: false,
      }),
    [grain.coaching],
  );
  const languageOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Share of sessions (%)",
        bottomTitle: bucketTitle(grain.languageMix),
        colorScale: languageScaleMap,
        domain: PCT_DOMAIN,
      }),
    [grain.languageMix, languageScaleMap],
  );
  const scribeOrgsOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Organisations",
        bottomTitle: bucketTitle(grain.scribeAdoption),
        colorScale: SCRIBE_ORGS_SCALE,
      }),
    [grain.scribeAdoption],
  );
  const scribeSessionsOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Sessions",
        bottomTitle: bucketTitle(grain.scribeAdoption),
        colorScale: SCRIBE_SESSIONS_SCALE,
        legend: false,
      }),
    [grain.scribeAdoption],
  );

  /* ---------------------------------- KPIs -------------------------------- */
  //
  // Four candidate tiles, each with its definition on its face. Two of them are
  // proposed REPLACEMENTS for tiles on Highlights — median quality for the mean,
  // and top-2-box for the mean rating — because a mean over a small sample and a
  // mean of an ordinal scale both hide the thing the reader would act on. They sit
  // here so the two can be compared on the same data before either is retired.

  const kpis = [
    {
      label: "Practising learners",
      description: `Distinct learners who completed a scored session in the latest full ${bucketTitle(
        grain.wpl,
      ).toLowerCase()}. The candidate north-star metric: people reaching value, not sessions played.`,
      value: formatCount(a?.summary.latestPractisingLearners),
      loading: busy(activation),
    },
    {
      label: "Activation rate",
      description:
        "Share of all learner accounts that have ever completed a simulation. All-time, so it falls when a new org is onboarded and rises as those learners start.",
      value: formatPct(a?.summary.activationRatePct),
      n: a?.summary.registeredLearners,
      nUnit: "learner accounts",
      loading: busy(activation),
    },
    {
      label: "Median quality score",
      description: `Median composite score of evaluated sessions, ${SCORE_DOMAIN[0]}–${SCORE_DOMAIN[1]}, judged by an LLM against the scenario rubric. Median, not mean: one outlying session moves a mean and not a median.`,
      value: formatScore(q?.summary.medianScore),
      n: q?.summary.evaluatedSessions,
      nUnit: "evaluated sessions",
      minN: MIN_N_FOR_SCORE,
      loading: busy(quality),
    },
    {
      label: "Rated 4–5",
      description:
        "Share of post-session ratings that were 4 or 5. Rating is optional, so this covers only sessions that were rated.",
      value: formatPct(q?.summary.top2BoxPct),
      n: q?.summary.responses,
      nUnit: "ratings",
      minN: MIN_N_FOR_SCORE,
      loading: busy(quality),
    },
  ];

  /* ------------------------------ detail tables --------------------------- */

  const rowKey = (bucket: string, inProgress?: string | null) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  const exportLines = (
    window: string,
    grouping: AnalyticsBucket,
    inProgress?: string | null,
    ...extra: string[]
  ) => [
    `Window: ${window}`,
    `Grouping: ${bucketTitle(grouping)}`,
    ...(inProgress
      ? [`${inProgress} is still accruing — provisional, and omitted from the chart`]
      : []),
    ...extra,
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* --------------------------- North star ---------------------------- */}
      <SubHeading>North star</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Practising learners per period"
          caption={`Distinct learners who completed a scored session. Counts people reaching value rather than sessions played, so it cannot be inflated by a handful of enthusiasts.${inProgressCaption(
            grain.wpl,
            wplInProgress,
          )}`}
          source={buildSource({
            derivation: "Distinct learners with >=1 completed session, bucketed",
            window: windowLabel(a?.window),
            extra: groupingNote(grain.wpl),
            asOf: asOf(a?.window),
          })}
          takeaway={practisingTakeaway(wplPoints)}
          loading={busy(activation)}
          error={activation.isError}
          onRetry={activation.refetch}
          empty={!busy(activation) && wplSeries.length === 0}
          controls={picker("wpl", WPL_GRAINS)}
          onExpand={() => setExpanded("wpl")}
        >
          <ScrollableChart data={wplSeries}>
            <LineChart data={wplSeries} options={wplOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Session completion rate"
          caption={`Of the sessions learners launched, the share that reached a scored ending. A leading friction signal — and the caveat behind every efficacy panel below, which can only see the sessions that finished. A period with no launches is a gap, not 0%.${inProgressCaption(
            grain.completion,
            completionInProgress,
          )}`}
          source={buildSource({
            derivation: "Completed / launched sessions per period",
            window: windowLabel(c?.window),
            n: c?.summary.started,
            nUnit: "sessions launched",
            extra: groupingNote(grain.completion),
            asOf: asOf(c?.window),
          })}
          takeaway={
            c?.summary.completionRatePct !== null && c?.summary.completionRatePct !== undefined
              ? `${formatPct(c.summary.completionRatePct)} of ${formatCount(
                  c.summary.started,
                )} launched sessions reached a scored ending`
              : undefined
          }
          loading={busy(completion)}
          error={completion.isError}
          onRetry={completion.refetch}
          empty={!busy(completion) && allRatesMissing(completionPoints)}
          emptyText="No sessions launched in any period on this axis"
          controls={picker("completion")}
          onExpand={() => setExpanded("completion")}
        >
          <ScrollableChart data={completionSeries}>
            <LineChart data={completionSeries} options={completionOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* -------------------------- Activation ---------------------------- */}
      <SubHeading>Activation &amp; onboarding</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="New-learner activation funnel"
          caption={`Of every ${a?.funnel.denominatorLabel ?? "learner account"}, how many reached each step. The first bar is 100% by construction — it is the population, not a measurement. All-time: this is a question about accounts, not about a period.`}
          source={buildSource({
            derivation: "users joined to completed sessions, all time",
            n: a?.summary.registeredLearners,
            nUnit: "learner accounts",
            asOf: asOf(a?.window),
          })}
          loading={busy(activation)}
          error={activation.isError}
          onRetry={activation.refetch}
          empty={!busy(activation) && funnelStages.length === 0}
          height="auto"
        >
          <FunnelBars stages={funnelStages} unit="learners" />
        </ChartCard>

        <ChartCard
          title="Time to first practice"
          caption={`Days from signing up to completing a first session, as counts of learners. ${
            a?.timeToFirstPractice.boundsNote ?? ""
          } "${TESTING_GROUPS.neverPractised}" is a residual — a learner who has never practised has no first session to measure — so it is greyed as context rather than coloured as the slowest band.`}
          source={buildSource({
            derivation: "users.createdAt to first completed session, all time",
            n: a?.summary.registeredLearners,
            nUnit: "learner accounts",
            asOf: asOf(a?.window),
          })}
          takeaway={
            a && a.summary.registeredLearners > 0
              ? `${formatCount(a.timeToFirstPractice.neverPractised)} of ${formatCount(
                  a.summary.registeredLearners,
                )} learner accounts have never completed a session`
              : undefined
          }
          loading={busy(activation)}
          error={activation.isError}
          onRetry={activation.refetch}
          empty={!busy(activation) && ttfBars.length === 0}
          onExpand={() => setExpanded("timeToFirst")}
        >
          <ScrollableChart data={ttfBars} on="group">
            <SimpleBarChart data={ttfBars} options={ttfOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ------------------------ Learning efficacy ----------------------- */}
      <SubHeading>Learning efficacy</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          wide
          title="Skill growth — score by session number"
          caption={`Median composite score at a learner's 1st, 2nd, …, ${
            sg?.maxOrdinal ?? 12
          }th evaluated session, with the interquartile range around it. Read over ${skillVariantMeta.description(
            sg?.experiencedMinSessions ?? 6,
          )}. The axis stops where the sample falls below ${
            sg?.minSampleSize ?? MIN_N_FOR_SCORE
          } sessions. ${boundedDomainNote(SCORE_DOMAIN)} ${sg?.provenance.note ?? ""}`}
          source={buildSource({
            derivation: sg?.provenance.derivation ?? "LLM judge over completed sessions",
            window: "All time — an ordinal is a position in a learner's history, not a date",
            n: sg?.summary.evaluatedSessions,
            nUnit: "evaluated sessions",
            asOf: asOfStamp(sg?.computedAt),
          })}
          takeaway={skillGrowthTakeaway(
            sg?.ordinals ?? [],
            skillVariant,
            sg?.minSampleSize ?? MIN_N_FOR_SCORE,
          )}
          loading={skillGrowth.isLoading && !sg}
          error={skillGrowth.isError}
          onRetry={skillGrowth.refetch}
          empty={!skillGrowth.isLoading && skillSeries.length === 0}
          emptyText={`No session ordinal yet has ${sg?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions behind it`}
          controls={
            <div className="w-56 shrink-0">
              {/* Both readings come from ONE response computed in one pass, so
                  switching cannot make them divide different numerators. */}
              <Dropdown
                id="testing-skill-variant"
                size="sm"
                titleText="Read over"
                hideLabel
                label="Read over"
                items={SKILL_GROWTH_VARIANTS.map(v => ({ id: v.key, label: v.label }))}
                selectedItem={{ id: skillVariantMeta.key, label: skillVariantMeta.label }}
                itemToString={item => item?.label ?? ""}
                onChange={({ selectedItem }) => {
                  if (selectedItem) setSkillVariant(selectedItem.id as SkillGrowthVariant);
                }}
              />
            </div>
          }
          onExpand={() => setExpanded("skillGrowth")}
        >
          <ScrollableChart data={skillSeries}>
            <LineChart data={skillSeries} options={skillOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Roleplay quality — median and spread"
          caption={`The distribution behind the quality average: the median with its interquartile range. A median that climbs while the quartiles stay wide is a different story from one that climbs while they converge. Periods with fewer than ${
            q?.minSampleSize ?? MIN_N_FOR_SCORE
          } evaluated sessions carry no percentiles. ${boundedDomainNote(SCORE_DOMAIN)}${inProgressCaption(
            grain.quality,
            qualityInProgress,
          )}`}
          source={buildSource({
            derivation: "LLM-judged composite score per session, percentiles per period",
            window: windowLabel(q?.window),
            n: q?.summary.evaluatedSessions,
            nUnit: "evaluated sessions",
            extra: groupingNote(grain.quality),
            asOf: asOf(q?.window),
          })}
          loading={busy(quality)}
          error={quality.isError}
          onRetry={quality.refetch}
          empty={!busy(quality) && qualitySeries.length === 0}
          controls={picker("quality")}
          onExpand={() => setExpanded("quality")}
        >
          <ScrollableChart data={qualitySeries}>
            <LineChart data={qualitySeries} options={qualityOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Competency map — volume against proficiency"
          caption={`One point per competency: how much it is practised, against how well it scores. High volume with a low score is a teaching gap; low volume is a coverage gap. Points are one colour on purpose — colour by identity here would encode nothing — so the expanded table names them.${
            competencyHeld.length > 0
              ? ` ${competencyHeld.length} competenc${competencyHeld.length === 1 ? "y is" : "ies are"} not plotted: fewer than ${cm?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions.`
              : ""
          }`}
          source={buildSource({
            derivation:
              "Completed sessions and median score per competency, via the scenario's tags",
            window: "All time",
            n: cm?.summary.evaluatedSessions,
            nUnit: "evaluated sessions",
            extra:
              cm && cm.unattributed.completedSessions > 0
                ? `${formatCount(cm.unattributed.completedSessions)} sessions ran scenarios with no competency tagged and are excluded`
                : undefined,
            asOf: asOfStamp(cm?.computedAt),
          })}
          takeaway={competencyTakeaway(cm?.competencies ?? [])}
          loading={competencyMap.isLoading && !cm}
          error={competencyMap.isError}
          onRetry={competencyMap.refetch}
          empty={!competencyMap.isLoading && competencyPoints.length === 0}
          emptyText={`No competency yet has ${cm?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions`}
          onExpand={() => setExpanded("competency")}
        >
          <ScatterChart data={competencyPoints} options={competencyOpts} />
        </ChartCard>
      </div>

      {/* --------------------------- Curriculum --------------------------- */}
      <SubHeading>Curriculum</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Track drop-off by item format"
          caption={`Of the track items learners actually reached, the share they finished — by format, in the platform's own order. Position in a track is confounded with format; format is the lever anyone can pull.${
            itemHeld.length > 0
              ? ` ${itemHeld.length} format${itemHeld.length === 1 ? "" : "s"} not plotted: too few learners to state a rate over identifiable people. Sizes are in the expanded view.`
              : ""
          }`}
          source={buildSource({
            derivation: "track_item_progress completed / reached, by item type",
            window: "All time",
            n: td?.summary.learners,
            nUnit: "enrolled learners",
            asOf: asOfStamp(td?.computedAt),
          })}
          takeaway={itemTypeTakeaway(td?.itemTypes ?? [])}
          loading={trackDropoff.isLoading && !td}
          error={trackDropoff.isError}
          onRetry={trackDropoff.refetch}
          empty={!trackDropoff.isLoading && itemBars.length === 0}
          emptyText="No track progress recorded yet"
          onExpand={() => setExpanded("itemTypes")}
        >
          <SimpleBarChart data={itemBars} options={itemOpts} />
        </ChartCard>

        <ChartCard
          title="Language mix of completed sessions"
          caption={`Share of completed sessions by language — is the mix shifting? Shares hide their own base, so the session count per period travels in the expanded table. The tail beyond ${
            lm?.maxSeries ?? 8
          } languages is pooled into "Other" on the server, in grey with "Unknown".${inProgressCaption(
            grain.languageMix,
            languageInProgress,
          )}`}
          source={buildSource({
            derivation: "Completed sessions by configured language",
            window: windowLabel(lm?.window),
            n: lm?.summary.totalSessions,
            nUnit: "completed sessions",
            extra: groupingNote(grain.languageMix),
            asOf: asOf(lm?.window),
          })}
          loading={busy(languageMix)}
          error={languageMix.isError}
          onRetry={languageMix.refetch}
          empty={!busy(languageMix) && languageSeries.length === 0}
          controls={picker("languageMix")}
          onExpand={() => setExpanded("languageMix")}
        >
          <ScrollableChart data={languageSeries}>
            <StackedBarChart data={languageSeries} options={languageOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ----------------------- Voice of the learner --------------------- */}
      <SubHeading>Voice of the learner</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Satisfaction mix"
          caption={`Ratings split into 1–2 / 3 / 4–5 rather than averaged: a mean of 3.8 from all-4s and a mean of 3.8 from half-5s-and-half-2s call for opposite responses. ${satisfactionRated.length} period${
            satisfactionRated.length === 1 ? "" : "s"
          } carry ratings; periods with none are absent, because a mix over nobody is undefined.${inProgressCaption(
            grain.satisfaction,
            satisfactionInProgress,
          )}`}
          source={buildSource({
            derivation: "Post-session ratings grouped into bands, share per period",
            window: windowLabel(s?.window),
            n: s?.summary.responses,
            nUnit: "ratings",
            extra: `${groupingNote(grain.satisfaction)} · ${formatPct(
              s?.summary.responseRatePct,
            )} of completed sessions were rated`,
            asOf: asOf(s?.window),
          })}
          takeaway={satisfactionTakeaway(satisfactionPoints)}
          loading={busy(satisfaction)}
          error={satisfaction.isError}
          onRetry={satisfaction.refetch}
          empty={!busy(satisfaction) && satisfactionSeries.length === 0}
          emptyText="No ratings in any period on this axis"
          controls={picker("satisfaction")}
          onExpand={() => setExpanded("satisfaction")}
        >
          <ScrollableChart data={satisfactionSeries}>
            <StackedBarChart data={satisfactionSeries} options={satisfactionOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="What low-rated sessions were tagged with"
          caption={`Tags on sessions rated 3 or below, ranked. Counts, not shares: tagging is optional, so the denominator is the tagged low ratings and not all sessions. The leader is in the accent colour and the tail in grey — the order is the point.`}
          source={buildSource({
            derivation: "Tags on post-session ratings <= 3",
            window: windowLabel(q?.window),
            n: q?.summary.taggedLowRatings,
            nUnit: "tagged low ratings",
            asOf: asOf(q?.window),
          })}
          loading={busy(quality)}
          error={quality.isError}
          onRetry={quality.refetch}
          empty={!busy(quality) && tagBars.length === 0}
          emptyText="No tags on low-rated sessions yet"
          onExpand={() => setExpanded("tags")}
        >
          <ScrollableChart data={tagBars} on="group">
            <SimpleBarChart data={tagBars} options={tagOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* --------------------------- Coaching loop ------------------------ */}
      <SubHeading>Coaching loop</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Sessions shared for review"
          caption={`How much of the human feedback loop is being used. Paired with the turnaround panel beside it rather than drawn on a second axis — a count and a duration on one pair of axes invite a correlation the data does not support.${inProgressCaption(
            grain.coaching,
            coachingInProgress,
          )}`}
          source={buildSource({
            derivation: "Reviews created per period",
            window: windowLabel(cl?.window),
            n: cl?.summary.sharedSessions,
            nUnit: "sessions shared",
            extra: `${groupingNote(grain.coaching)} · ${formatPct(
              cl?.summary.sharePct,
            )} of completed sessions`,
            asOf: asOf(cl?.window),
          })}
          loading={busy(coaching)}
          error={coaching.isError}
          onRetry={coaching.refetch}
          empty={!busy(coaching) && sharedSeries.length === 0}
          controls={picker("coaching")}
          onExpand={() => setExpanded("coaching")}
        >
          <ScrollableChart data={sharedSeries}>
            <SimpleBarChart data={sharedSeries} options={sharedOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Time to first comment"
          caption={`Median hours from a session being shared to the first comment on it from someone else. Periods with fewer than ${
            cl?.minSampleSize ?? 5
          } reviews carry no median — a median over two reviews is a name, not a statistic. Aggregate only: this panel never breaks down by trainer.`}
          source={buildSource({
            derivation: "Median hours from review created to first comment by another person",
            window: windowLabel(cl?.window),
            n: cl?.summary.reviewsWithComment,
            nUnit: "reviews with a comment",
            extra: groupingNote(grain.coaching),
            asOf: asOf(cl?.window),
          })}
          takeaway={
            cl?.summary.medianHoursToFirstComment !== null &&
            cl?.summary.medianHoursToFirstComment !== undefined
              ? `Half of commented reviews get their first reply within ${formatHours(
                  cl.summary.medianHoursToFirstComment,
                )}`
              : undefined
          }
          loading={busy(coaching)}
          error={coaching.isError}
          onRetry={coaching.refetch}
          empty={!busy(coaching) && turnaroundSeries.every(d => d.value === null)}
          emptyText="No review has enough comments to state a turnaround"
        >
          <ScrollableChart data={turnaroundSeries}>
            <LineChart data={turnaroundSeries} options={turnaroundOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ------------------------ Second value stream --------------------- */}
      <SubHeading>Live support (Scribe) adoption</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Organisations using Scribe"
          caption={`Breadth, not volume: one enthusiastic org can carry a session count on its own, so the question is how many customers use it at all. Failure rates and provider reliability stay on the Scribe tab.${inProgressCaption(
            grain.scribeAdoption,
            scribeInProgress,
          )}`}
          source={buildSource({
            derivation: "Distinct orgs with >=1 scribe session per period",
            window: windowLabel(sa?.window),
            n: sa?.summary.orgs,
            nUnit: "orgs, all time",
            extra: groupingNote(grain.scribeAdoption),
            asOf: asOf(sa?.window),
          })}
          loading={busy(scribe)}
          error={scribe.isError}
          onRetry={scribe.refetch}
          empty={!busy(scribe) && scribeOrgsSeries.length === 0}
          controls={picker("scribeAdoption")}
          onExpand={() => setExpanded("scribe")}
        >
          <ScrollableChart data={scribeOrgsSeries}>
            <SimpleBarChart data={scribeOrgsSeries} options={scribeOrgsOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Scribe sessions"
          caption="Volume beside the breadth panel, in grey: it is context for the org count rather than the subject. A rising line over a flat org count is deepening use by the same customers."
          source={buildSource({
            derivation: "Scribe sessions per period",
            window: windowLabel(sa?.window),
            n: sa?.summary.sessions,
            nUnit: "sessions",
            extra: groupingNote(grain.scribeAdoption),
            asOf: asOf(sa?.window),
          })}
          loading={busy(scribe)}
          error={scribe.isError}
          onRetry={scribe.refetch}
          empty={!busy(scribe) && scribeSessionsSeries.length === 0}
        >
          <ScrollableChart data={scribeSessionsSeries}>
            <LineChart data={scribeSessionsSeries} options={scribeSessionsOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ---------------------------- Customers --------------------------- */}
      <SubHeading>Customers</SubHeading>
      <div className="grid grid-cols-1 gap-4">
        <OrgHealthCard
          data={orgHealth.data}
          loading={orgHealth.isLoading && !orgHealth.data}
          error={orgHealth.isError}
          onRetry={orgHealth.refetch}
        />
      </div>

      {/* ------------------------- Detail / export ------------------------ */}

      <ChartDetailModal
        open={expanded === "wpl"}
        onClose={() => setExpanded(null)}
        title="Practising learners per period"
        caption="Distinct learners who completed a scored session."
        source={buildSource({
          derivation: "Distinct learners with >=1 completed session",
          window: windowLabel(a?.window),
          extra: groupingNote(grain.wpl),
          asOf: asOf(a?.window),
        })}
        render={({ height }) => <LineChart data={wplSeries} options={{ ...wplOpts, height }} />}
        table={{
          columns: [bucketTitle(grain.wpl), "Learners", "Sessions"],
          rows: (a?.practisingLearners ?? []).map(p => [
            rowKey(p.bucket, wplInProgress),
            p.learners,
            p.sessions,
          ]),
        }}
        exportContext={exportLines(windowLabel(a?.window), grain.wpl, wplInProgress)}
        exportFilename="practising-learners"
      />

      <ChartDetailModal
        open={expanded === "completion"}
        onClose={() => setExpanded(null)}
        title="Session completion rate"
        caption="Completed of launched sessions. A period with no launches has no rate — the cell is blank, not zero."
        source={buildSource({
          derivation: "Completed / launched sessions per period",
          window: windowLabel(c?.window),
          extra: groupingNote(grain.completion),
          asOf: asOf(c?.window),
        })}
        zoomable
        zoomNote="Axis zoomed to the data range — magnifies small changes; the tile shows the full 0–100% scale."
        render={({ height, zoomed }) => (
          <LineChart
            data={completionSeries}
            options={{ ...(zoomed ? completionZoomedOpts : completionOpts), height }}
          />
        )}
        table={{
          columns: [bucketTitle(grain.completion), "Launched", "Completed", "Abandoned", "Rate %"],
          rows: (c?.points ?? []).map(p => [
            rowKey(p.bucket, completionInProgress),
            p.started,
            p.completed,
            p.abandoned,
            p.completionRatePct,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(c?.window),
          grain.completion,
          completionInProgress,
          "A blank rate means no sessions launched in that period — undefined, not 0%",
        )}
        exportFilename="session-completion-rate"
      />

      <ChartDetailModal
        open={expanded === "timeToFirst"}
        onClose={() => setExpanded(null)}
        title="Time to first practice"
        caption={a?.timeToFirstPractice.boundsNote}
        source={buildSource({
          derivation: "users.createdAt to first completed session",
          window: "All time",
          n: a?.summary.registeredLearners,
          nUnit: "learner accounts",
          asOf: asOf(a?.window),
        })}
        render={({ height }) => <SimpleBarChart data={ttfBars} options={{ ...ttfOpts, height }} />}
        table={{
          columns: ["Days to first session", "Learners", "Cumulative activated", "% activated"],
          rows: [
            ...(a?.timeToFirstPractice.bands ?? []).map((b, i) => {
              const cumulative = a?.timeToFirstPractice.cumulative.find(
                cp => cp.days === (b.maxDays ?? b.minDays),
              );
              return [
                b.label,
                a?.timeToFirstPractice.learnersByBand[i] ?? 0,
                cumulative?.activated ?? null,
                cumulative?.activatedPct ?? null,
              ];
            }),
            [TESTING_GROUPS.neverPractised, a?.timeToFirstPractice.neverPractised ?? 0, null, null],
          ],
        }}
        exportContext={[
          "Window: All time",
          `Bands: ${a?.timeToFirstPractice.boundsNote ?? ""}`,
          `"${TESTING_GROUPS.neverPractised}" is a residual: learner accounts minus learners who ever completed a session`,
        ]}
        exportFilename="time-to-first-practice"
      />

      <ChartDetailModal
        open={expanded === "skillGrowth"}
        onClose={() => setExpanded(null)}
        title="Skill growth — score by session number"
        caption={`Read over ${skillVariantMeta.description(sg?.experiencedMinSessions ?? 6)}. ${
          sg?.provenance.note ?? ""
        }`}
        source={buildSource({
          derivation: sg?.provenance.derivation ?? "LLM judge over completed sessions",
          window: "All time",
          n: sg?.summary.evaluatedSessions,
          nUnit: "evaluated sessions",
          asOf: asOfStamp(sg?.computedAt),
        })}
        zoomable
        zoomNote="Axis zoomed to the data range — magnifies a movement the full 0–100 scale flattens."
        render={({ height, zoomed }) => (
          <LineChart
            data={skillSeries}
            options={{ ...(zoomed ? skillZoomedOpts : skillOpts), height }}
          />
        )}
        table={{
          columns: ["Session number", "Median", "25th pct", "75th pct", "n", "Plotted"],
          rows: (sg?.ordinals ?? []).map(o => {
            const stat = o[skillVariant];
            const plotted = skillPlotted.some(p => p.ordinal === o.ordinal);
            return [
              ordinalLabel(o.ordinal),
              stat.median,
              stat.p25,
              stat.p75,
              stat.n,
              plotted ? "yes" : `no — need ${sg?.minSampleSize ?? MIN_N_FOR_SCORE}`,
            ];
          }),
        }}
        exportContext={[
          "Window: All time (ordinal = position in a learner's own history)",
          `Read over: ${skillVariantMeta.label}`,
          `Percentiles are blank below ${sg?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions for that ordinal`,
          sg?.provenance.note ?? "",
        ]}
        exportFilename="skill-growth"
      />

      <ChartDetailModal
        open={expanded === "quality"}
        onClose={() => setExpanded(null)}
        title="Roleplay quality — median and spread"
        caption="Percentiles are blank for periods below the sample floor."
        source={buildSource({
          derivation: "LLM-judged composite score, percentiles per period",
          window: windowLabel(q?.window),
          extra: groupingNote(grain.quality),
          asOf: asOf(q?.window),
        })}
        zoomable
        zoomNote="Axis zoomed to the data range — the tile shows the full 0–100 scale."
        render={({ height, zoomed }) => (
          <LineChart
            data={qualitySeries}
            options={{ ...(zoomed ? qualityZoomedOpts : qualityOpts), height }}
          />
        )}
        table={{
          columns: [bucketTitle(grain.quality), "Median", "25th pct", "75th pct", "Evaluated"],
          rows: (q?.quality ?? []).map(p => [
            rowKey(p.bucket, qualityInProgress),
            p.median,
            p.p25,
            p.p75,
            p.evaluatedSessions,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(q?.window),
          grain.quality,
          qualityInProgress,
          `Percentiles are blank below ${q?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions`,
        )}
        exportFilename="roleplay-quality-distribution"
      />

      <ChartDetailModal
        open={expanded === "satisfaction"}
        onClose={() => setExpanded(null)}
        title="Satisfaction mix"
        caption="The counts behind the shares, plus the response rate the shares are silent about."
        source={buildSource({
          derivation: "Post-session ratings grouped into bands",
          window: windowLabel(s?.window),
          extra: groupingNote(grain.satisfaction),
          asOf: asOf(s?.window),
        })}
        render={({ height }) => (
          <StackedBarChart data={satisfactionSeries} options={{ ...satisfactionOpts, height }} />
        )}
        table={{
          columns: [
            bucketTitle(grain.satisfaction),
            "1–2",
            "3",
            "4–5",
            "Ratings",
            "4–5 %",
            "Completed sessions",
            "Response rate %",
          ],
          rows: (s?.satisfaction ?? []).map(p => [
            rowKey(p.bucket, satisfactionInProgress),
            p.low,
            p.mid,
            p.high,
            p.responses,
            p.top2BoxPct,
            p.completedSessions,
            p.responseRatePct,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(s?.window),
          grain.satisfaction,
          satisfactionInProgress,
          "Rating is optional: the response rate is the share of completed sessions that were rated",
        )}
        exportFilename="satisfaction-mix"
      />

      <ChartDetailModal
        open={expanded === "tags"}
        onClose={() => setExpanded(null)}
        title="What low-rated sessions were tagged with"
        caption="Tags on ratings of 3 or below. Optional, so counts — not shares of all sessions."
        source={buildSource({
          derivation: "Tags on post-session ratings <= 3",
          window: windowLabel(q?.window),
          n: q?.summary.taggedLowRatings,
          nUnit: "tagged low ratings",
          asOf: asOf(q?.window),
        })}
        render={({ height }) => <SimpleBarChart data={tagBars} options={{ ...tagOpts, height }} />}
        table={{
          columns: ["Tag", "Low-rated sessions"],
          rows: (q?.lowRatingTags ?? []).map(t => [t.tag, t.count]),
        }}
        exportContext={[
          `Window: ${windowLabel(q?.window)}`,
          "Tags on post-session ratings of 3 or below; tagging is optional",
        ]}
        exportFilename="low-rating-tags"
      />

      <ChartDetailModal
        open={expanded === "competency"}
        onClose={() => setExpanded(null)}
        title="Competency map — volume against proficiency"
        caption="The table is where the points get their names. A scenario tagged with several competencies counts towards each, so the session column can sum to more than the platform total."
        source={buildSource({
          derivation: "Completed sessions and median score per competency",
          window: "All time",
          n: cm?.summary.evaluatedSessions,
          nUnit: "evaluated sessions",
          asOf: asOfStamp(cm?.computedAt),
        })}
        render={({ height }) => (
          <ScatterChart data={competencyPoints} options={{ ...competencyOpts, height }} />
        )}
        table={{
          columns: [
            "Competency",
            "Completed sessions",
            "Evaluated",
            "Median score",
            "Learners",
            "Scenarios",
          ],
          rows: [
            ...(cm?.competencies ?? []).map(r => [
              r.name,
              r.completedSessions,
              r.evaluatedSessions,
              r.belowFloor
                ? `n = ${r.evaluatedSessions} · need ${cm?.minSampleSize}`
                : r.medianScore,
              r.learners,
              r.scenarios,
            ]),
            ...(cm && cm.unattributed.completedSessions > 0
              ? [
                  [
                    cm.unattributed.label,
                    cm.unattributed.completedSessions,
                    cm.unattributed.evaluatedSessions,
                    null,
                    null,
                    null,
                  ],
                ]
              : []),
          ],
        }}
        exportContext={[
          "Window: All time",
          `Median score is blank below ${cm?.minSampleSize ?? MIN_N_FOR_SCORE} evaluated sessions`,
          "Multi-competency scenarios count towards every competency they are tagged with",
        ]}
        exportFilename="competency-map"
      />

      <ChartDetailModal
        open={expanded === "itemTypes"}
        onClose={() => setExpanded(null)}
        title="Track drop-off by item format"
        caption="Formats held back from the chart keep their counts here."
        source={buildSource({
          derivation: "track_item_progress completed / reached, by item type",
          window: "All time",
          n: td?.summary.learners,
          nUnit: "enrolled learners",
          asOf: asOfStamp(td?.computedAt),
        })}
        render={({ height }) => (
          <SimpleBarChart data={itemBars} options={{ ...itemOpts, height }} />
        )}
        table={{
          columns: ["Format", "Reached", "Completed", "Rate %", "Learners", "Plotted"],
          rows: (td?.itemTypes ?? []).map(r => [
            itemTypeLabel(r.type),
            r.reached,
            r.completed,
            r.belowFloor ? null : r.completionRatePct,
            r.learners,
            r.belowFloor
              ? `no — n = ${r.learners}, need ${td?.minGroupSize}`
              : r.completionRatePct === null
                ? "no — nothing reached"
                : "yes",
          ]),
        }}
        exportContext={[
          "Window: All time",
          `Rates are suppressed for formats with fewer than ${td?.minGroupSize ?? 5} learners; the counts still stand`,
        ]}
        exportFilename="track-dropoff-by-format"
      />

      <ChartDetailModal
        open={expanded === "languageMix"}
        onClose={() => setExpanded(null)}
        title="Language mix of completed sessions"
        caption="The session counts behind the shares — the denominator the stacked view hides."
        source={buildSource({
          derivation: "Completed sessions by configured language",
          window: windowLabel(lm?.window),
          extra: groupingNote(grain.languageMix),
          asOf: asOf(lm?.window),
        })}
        render={({ height }) => (
          <StackedBarChart data={languageSeries} options={{ ...languageOpts, height }} />
        )}
        table={{
          columns: [bucketTitle(grain.languageMix), ...(lm?.labels ?? []), "Total"],
          rows: (lm?.bucketTotals ?? []).map(t => [
            rowKey(t.bucket, languageInProgress),
            ...(lm?.labels ?? []).map(
              label =>
                (lm?.points ?? []).find(p => p.bucket === t.bucket && p.label === label)
                  ?.sessions ?? 0,
            ),
            t.sessions,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(lm?.window),
          grain.languageMix,
          languageInProgress,
          `Languages beyond the top ${(lm?.maxSeries ?? 8) - 1} are pooled into "Other"`,
        )}
        exportFilename="language-mix"
      />

      <ChartDetailModal
        open={expanded === "coaching"}
        onClose={() => setExpanded(null)}
        title="Coaching loop"
        caption="Sharing and responsiveness side by side, never on one axis."
        source={buildSource({
          derivation: "Reviews created and hours to first comment, per period",
          window: windowLabel(cl?.window),
          extra: groupingNote(grain.coaching),
          asOf: asOf(cl?.window),
        })}
        render={({ height }) => (
          <SimpleBarChart data={sharedSeries} options={{ ...sharedOpts, height }} />
        )}
        table={{
          columns: [
            bucketTitle(grain.coaching),
            "Shared",
            "Completed sessions",
            "Share %",
            "With a comment",
            "Median hours",
            "p90 hours",
            "Comments",
          ],
          rows: (cl?.points ?? []).map(p => [
            rowKey(p.bucket, coachingInProgress),
            p.sharedSessions,
            p.completedSessions,
            p.sharePct,
            p.reviewsWithComment,
            p.medianHoursToFirstComment,
            p.p90HoursToFirstComment,
            p.comments,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(cl?.window),
          grain.coaching,
          coachingInProgress,
          `Turnaround percentiles are blank below ${cl?.minSampleSize ?? 5} reviews in the period`,
        )}
        exportFilename="coaching-loop"
      />

      <ChartDetailModal
        open={expanded === "scribe"}
        onClose={() => setExpanded(null)}
        title="Scribe adoption"
        caption="Orgs and counsellors using Scribe, with session volume as context."
        source={buildSource({
          derivation: "Distinct orgs, counsellors and sessions per period",
          window: windowLabel(sa?.window),
          extra: groupingNote(grain.scribeAdoption),
          asOf: asOf(sa?.window),
        })}
        render={({ height }) => (
          <SimpleBarChart data={scribeOrgsSeries} options={{ ...scribeOrgsOpts, height }} />
        )}
        table={{
          columns: [bucketTitle(grain.scribeAdoption), "Orgs", "Counsellors", "Sessions"],
          rows: (sa?.points ?? []).map(p => [
            rowKey(p.bucket, scribeInProgress),
            p.orgs,
            p.counsellors,
            p.sessions,
          ]),
        }}
        exportContext={exportLines(
          windowLabel(sa?.window),
          grain.scribeAdoption,
          scribeInProgress,
          "Archived sessions are excluded",
        )}
        exportFilename="scribe-adoption"
      />
    </div>
  );
};
