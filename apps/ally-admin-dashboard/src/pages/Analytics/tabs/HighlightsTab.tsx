import { useMemo, useState } from "react";

import { ComboChart, LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import {
  useGetAnalyticsHighlightsQuery,
  useGetAnalyticsOverviewQuery,
  useGetQualitySentimentQuery,
} from "@api";
import { AnalyticsBucket } from "@types";

import {
  AnalyticsTabFilters,
  PLATFORM_WIDE_NOTE,
  asOf,
  isUnscoped,
  windowLabel,
} from "../analyticsFilters";
import {
  DEFAULT_GROUPING,
  bucketTitle,
  groupingNote,
  inProgressCaption,
  isInProgress,
  useChartGrouping,
  withoutInProgress,
} from "../analyticsGrouping";
import { CertificationCard } from "../CertificationCard";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  KpiTile,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  hBarOpts,
  lineOpts,
  stackedAreaLineOpts,
  stackedBarOpts,
  timeBarOpts,
} from "../chartKit";
import { CONTEXT } from "../chartScales";
import { CohortRetentionCard } from "../CohortRetentionCard";
import { FunnelBars } from "../FunnelBars";
import {
  CSAT_SCALE,
  COST_PER_SIM_SCALE,
  CUMULATIVE_USERS_SCALE,
  NEW_USERS_SCALE,
  PLAY_TIME_SCALE,
  PRACTICE_SCALE,
  RATING_DOMAIN,
  RETENTION_SCALE,
  SCORE_DOMAIN,
  TOTAL_COST_SCALE,
  buildActiveUserMultiples,
  buildCostPerSimSeries,
  buildCsatTrendSeries,
  buildCumulativeUsersSeries,
  buildNewUsersSeries,
  buildPlayTimeSeries,
  buildPracticeMinutesSeries,
  buildRetentionSeries,
  buildRoleBars,
  buildSimulationsSeries,
  buildTopOrgBars,
  buildTotalCostSeries,
  buildTrackFunnelStages,
  formatKpi,
  peakActiveLearners,
  sparkValues,
  totalPlayTimeSessions,
  totalUnpricedCalls,
} from "../highlightsChart";
import {
  QUALITY_INDEX_DIMENSIONS,
  QUALITY_INDEX_DIMENSION_LABELS,
  QUALITY_INDEX_DOMAIN,
  QUALITY_INDEX_LABEL,
  QUALITY_INDEX_SCALE,
  buildQualityIndexAreaSeries,
  buildQualityIndexSeries,
  isIndexFullyCalibrated,
  qualityIndexCoverageNotes,
} from "../qualityIndexChart";
import { RoleplayVolumeCard } from "../RoleplayVolumeCard";
import { UsageLevelCard } from "../UsageLevelCard";

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/** Note appended to a panel that stayed platform-wide under a tenant filter. */
const scopeNote = (unscoped: boolean) => (unscoped ? ` · ${PLATFORM_WIDE_NOTE}` : "");

/**
 * The charts on this tab that carry their own grouping control.
 *
 * A chart is listed here when re-grouping it re-grains the SAME metric. The
 * DAU/WAU/MAU small multiples are deliberately absent: those are trailing-window
 * definitions sampled once per day, so "monthly DAU" is not this metric at a
 * coarser grain, it is a different measurement. Users-by-role, the track funnel
 * and the per-org ranking have no time axis at all, and the three fixed-window
 * cards (cohort retention, usage levels, roleplay volume) own their own grain by
 * construction.
 */
type ChartId =
  | "newUsers"
  | "cumulative"
  | "retention"
  | "sims"
  | "practice"
  | "playTime"
  | "qualityIndex"
  | "csat"
  | "costPerSim"
  | "totalCost";

/**
 * Which endpoint feeds each chart.
 *
 * Split so a grain is only fetched from the endpoint that needs it: re-graining
 * a growth chart must not re-run the highlights aggregation (thirteen parallel
 * queries) for a grain nothing on that side is showing. `QUALITY_SENTIMENT_CHARTS`
 * is its own group for the same reason: the Roleplay Quality Index comes from a
 * third endpoint, not from `/highlights`, so re-graining it must not re-run
 * either of the other two aggregations.
 */
const OVERVIEW_CHARTS = ["newUsers", "cumulative", "retention", "sims"] as const;
const HIGHLIGHTS_CHARTS = ["practice", "playTime", "csat", "costPerSim", "totalCost"] as const;
const QUALITY_SENTIMENT_CHARTS = ["qualityIndex"] as const;

const CHART_IDS: ChartId[] = [
  ...OVERVIEW_CHARTS,
  ...HIGHLIGHTS_CHARTS,
  ...QUALITY_SENTIMENT_CHARTS,
];

/** Every chart opens on the same grain, so the first paint is two requests. */
const DEFAULT_GROUPINGS = Object.fromEntries(CHART_IDS.map(id => [id, DEFAULT_GROUPING])) as Record<
  ChartId,
  AnalyticsBucket
>;

/**
 * Highlights — the whole platform picture on one tab.
 *
 * This absorbed the former separate "Overview" tab. The two had four charts in
 * common, rendered identically from the same data, which meant a reader could
 * compare a number with itself and think they had corroborated it. Each chart now
 * lives in exactly one place.
 *
 * The tab is organised into five sections with **one focal tile each** and the
 * supporting tiles in greys: if every panel shouts, the page has no focus, and
 * salience has to be budgeted across the whole screen rather than per chart.
 *
 * ## Window and grain
 *
 * The tab is **all-time** and shows no time-range picker (declared by
 * `TabDef.uses.range` in Analytics.tsx, which drives both the picker and the
 * window queried, so the two cannot disagree). Leadership's question here is
 * about the whole history; what replaces the page-level range is **per-chart
 * grouping** — each time series carries its own day/week/month/year control, so
 * one reader can look at years of growth and weeks of quality at the same time.
 *
 * Grouping resolves SERVER-side: one query per grain currently on screen,
 * deduplicated by RTK Query. Re-binning on the client would be correct only for
 * counts and sums — a mean of monthly means weights a quiet month like a busy
 * one, and a median or p95 cannot be recovered from bucketed values at all. The
 * base grain stays fetched even when no chart shows it, because the KPI strip,
 * the funnel and the per-org ranking read from that response.
 *
 * Two consequences this surface states rather than hides:
 *  - **No KPI deltas.** An all-time window has no equal-length predecessor, so
 *    the server returns no comparison basis and each tile shows its bare value
 *    with its sample size. A "+12%" with no named basis is not a fact about
 *    anything, so the arrow goes rather than the basis being invented.
 *  - **The current period is left off every plot.** It is still accruing, so it
 *    can only rise and would draw as a fall. It stays in the expanded table and
 *    the export, flagged, which is where a provisional number belongs.
 */
export const HighlightsTab = ({ query }: AnalyticsTabFilters) => {
  const { groupingFor, setGrouping, bucketsFor } = useChartGrouping<ChartId>(
    DEFAULT_GROUPINGS,
    DEFAULT_GROUPING,
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  /* ------------------------- one query per grain --------------------------- */
  //
  // Four hooks per endpoint, fixed in number so hook order is stable, each
  // skipped unless a chart FED BY THAT ENDPOINT is reading that grain. Untouched,
  // this is exactly two requests — the same as before the control existed — and
  // re-graining one chart adds exactly one. `compare` is never requested: the
  // window is all-time, which has no comparison basis.
  const hBuckets = bucketsFor(HIGHLIGHTS_CHARTS);
  const oBuckets = bucketsFor(OVERVIEW_CHARTS);
  const qsBuckets = bucketsFor(QUALITY_SENTIMENT_CHARTS);

  const hQ = {
    day: useGetAnalyticsHighlightsQuery(
      { ...query, bucket: "day" },
      { skip: !hBuckets.has("day") },
    ),
    week: useGetAnalyticsHighlightsQuery(
      { ...query, bucket: "week" },
      { skip: !hBuckets.has("week") },
    ),
    month: useGetAnalyticsHighlightsQuery(
      { ...query, bucket: "month" },
      { skip: !hBuckets.has("month") },
    ),
    year: useGetAnalyticsHighlightsQuery(
      { ...query, bucket: "year" },
      { skip: !hBuckets.has("year") },
    ),
  };
  const oQ = {
    day: useGetAnalyticsOverviewQuery({ ...query, bucket: "day" }, { skip: !oBuckets.has("day") }),
    week: useGetAnalyticsOverviewQuery(
      { ...query, bucket: "week" },
      { skip: !oBuckets.has("week") },
    ),
    month: useGetAnalyticsOverviewQuery(
      { ...query, bucket: "month" },
      { skip: !oBuckets.has("month") },
    ),
    year: useGetAnalyticsOverviewQuery(
      { ...query, bucket: "year" },
      { skip: !oBuckets.has("year") },
    ),
  };
  const qsQ = {
    day: useGetQualitySentimentQuery({ ...query, bucket: "day" }, { skip: !qsBuckets.has("day") }),
    week: useGetQualitySentimentQuery(
      { ...query, bucket: "week" },
      { skip: !qsBuckets.has("week") },
    ),
    month: useGetQualitySentimentQuery(
      { ...query, bucket: "month" },
      { skip: !qsBuckets.has("month") },
    ),
    year: useGetQualitySentimentQuery(
      { ...query, bucket: "year" },
      { skip: !qsBuckets.has("year") },
    ),
  };

  // The base response. KPIs and the panels with no time axis read from here, so
  // they do not blink out when the last chart on this grain is switched away.
  const highlights = hQ[DEFAULT_GROUPING];
  const overview = oQ[DEFAULT_GROUPING];

  const highlightsLoading = highlights.isLoading && !highlights.data;
  const overviewLoading = overview.isLoading && !overview.data;

  const h = highlights.data;
  const o = overview.data;
  const summary = h?.summary;
  const overviewSummary = o?.summary;

  const hWindow = windowLabel(h?.window);
  const oWindow = windowLabel(o?.window);

  const costUnscoped = isUnscoped("costPerSim", h?.scoping);
  const orgsUnscoped = isUnscoped("topOrgs", h?.scoping);

  /**
   * The grouping control for one chart. A function returning an element, not a
   * component defined in the render body — a fresh component identity each
   * render would remount the picker (and unmount the chart's sibling subtree)
   * every time any state on this tab changed.
   */
  const picker = (chart: ChartId) => (
    <GroupingPicker
      id={`highlights-grouping-${chart}`}
      value={groupingFor(chart)}
      onChange={grouping => setGrouping(chart, grouping)}
    />
  );

  /**
   * Whether a chart's OWN grain is still in flight, not the tab as a whole.
   *
   * `isUninitialized` counts: on the render where a grain is first selected the
   * hook has only just stopped being skipped, so it reports neither loading nor
   * fetching yet. Without it the card renders its empty state ("No data for this
   * range") for a frame before the request it is waiting on has even started.
   */
  const busy = (q: {
    isLoading: boolean;
    isFetching: boolean;
    isUninitialized: boolean;
    data?: unknown;
  }) => !q.data && (q.isLoading || q.isFetching || q.isUninitialized);

  /* --------------------- per-chart responses and grains -------------------- */

  const newUsersQ = oQ[groupingFor("newUsers")];
  const cumulativeQ = oQ[groupingFor("cumulative")];
  const retentionQ = oQ[groupingFor("retention")];
  const simsQ = oQ[groupingFor("sims")];
  const practiceQ = hQ[groupingFor("practice")];
  const playTimeQ = hQ[groupingFor("playTime")];
  const qualityIndexQ = qsQ[groupingFor("qualityIndex")];
  const csatQ = hQ[groupingFor("csat")];
  const costPerSimQ = hQ[groupingFor("costPerSim")];
  const totalCostQ = hQ[groupingFor("totalCost")];

  const grain = {
    newUsers: groupingFor("newUsers"),
    cumulative: groupingFor("cumulative"),
    retention: groupingFor("retention"),
    sims: groupingFor("sims"),
    practice: groupingFor("practice"),
    playTime: groupingFor("playTime"),
    qualityIndex: groupingFor("qualityIndex"),
    csat: groupingFor("csat"),
    costPerSim: groupingFor("costPerSim"),
    totalCost: groupingFor("totalCost"),
  };

  /* ----------------------------- plotted series ---------------------------- */
  //
  // `withoutInProgress` strips the still-accruing period from what is PLOTTED
  // only. The detail tables below read the full arrays and flag that row.

  const newUsersPoints = newUsersQ.data?.userGrowth ?? [];
  const newUsersInProgress = newUsersQ.data?.window.inProgressBucket;
  const newUsers = useMemo(
    () => buildNewUsersSeries(withoutInProgress(newUsersPoints, p => p.date, newUsersInProgress)),
    [newUsersPoints, newUsersInProgress],
  );

  const cumulativePoints = cumulativeQ.data?.userGrowth ?? [];
  const cumulativeInProgress = cumulativeQ.data?.window.inProgressBucket;
  const cumulativeUsers = useMemo(
    () =>
      buildCumulativeUsersSeries(
        withoutInProgress(cumulativePoints, p => p.date, cumulativeInProgress),
      ),
    [cumulativePoints, cumulativeInProgress],
  );

  const retentionPoints = retentionQ.data?.retention ?? [];
  const retentionInProgress = retentionQ.data?.window.inProgressBucket;
  const retention = useMemo(
    () =>
      buildRetentionSeries(withoutInProgress(retentionPoints, p => p.bucket, retentionInProgress)),
    [retentionPoints, retentionInProgress],
  );

  const simsPoints = simsQ.data?.simulationsCompleted ?? [];
  const simsInProgress = simsQ.data?.window.inProgressBucket;
  const sims = useMemo(
    () => buildSimulationsSeries(withoutInProgress(simsPoints, p => p.bucket, simsInProgress)),
    [simsPoints, simsInProgress],
  );

  const practicePoints = practiceQ.data?.practiceMinutes ?? [];
  const practiceInProgress = practiceQ.data?.window.inProgressBucket;
  const practice = useMemo(
    () =>
      buildPracticeMinutesSeries(
        withoutInProgress(practicePoints, p => p.bucket, practiceInProgress),
      ),
    [practicePoints, practiceInProgress],
  );
  const learners = useMemo(() => peakActiveLearners(practicePoints), [practicePoints]);

  const playTimePoints = playTimeQ.data?.playTime ?? [];
  const playTimeInProgress = playTimeQ.data?.window.inProgressBucket;
  const playTime = useMemo(
    () => buildPlayTimeSeries(withoutInProgress(playTimePoints, p => p.bucket, playTimeInProgress)),
    [playTimePoints, playTimeInProgress],
  );
  const playTimeSessions = useMemo(() => totalPlayTimeSessions(playTimePoints), [playTimePoints]);

  // The index's stack layers are zero-filled (never null) when a dimension has
  // no data that period — see buildQualityIndexAreaSeries. The line is where
  // "nothing was measured" is a real gap, same convention as every mean series
  // on this tab.
  const qualityIndexPoints = qualityIndexQ.data?.points ?? [];
  const qualityIndexInProgress = qualityIndexQ.data?.window.inProgressBucket;
  const qualityAreas = useMemo(
    () =>
      buildQualityIndexAreaSeries(
        withoutInProgress(qualityIndexPoints, p => p.bucket, qualityIndexInProgress),
      ),
    [qualityIndexPoints, qualityIndexInProgress],
  );
  const qualityLine = useMemo(
    () =>
      buildQualityIndexSeries(
        withoutInProgress(qualityIndexPoints, p => p.bucket, qualityIndexInProgress),
      ),
    [qualityIndexPoints, qualityIndexInProgress],
  );
  const quality = useMemo(() => [...qualityAreas, ...qualityLine], [qualityAreas, qualityLine]);

  const qualityCoverage = qualityIndexQ.data?.indexCoverage ?? [];
  const qualityFullyCalibrated = isIndexFullyCalibrated(qualityCoverage);
  const qualityCoverageNotes = useMemo(
    () => qualityIndexCoverageNotes(qualityCoverage),
    [qualityCoverage],
  );

  const csatPoints = csatQ.data?.csatTrend ?? [];
  const csatInProgress = csatQ.data?.window.inProgressBucket;
  const csat = useMemo(
    () => buildCsatTrendSeries(withoutInProgress(csatPoints, p => p.bucket, csatInProgress)),
    [csatPoints, csatInProgress],
  );

  const costPoints = costPerSimQ.data?.costPerSim ?? [];
  const costInProgress = costPerSimQ.data?.window.inProgressBucket;
  const costPerSim = useMemo(
    () => buildCostPerSimSeries(withoutInProgress(costPoints, p => p.bucket, costInProgress)),
    [costPoints, costInProgress],
  );
  const unpriced = useMemo(() => totalUnpricedCalls(costPoints), [costPoints]);

  const totalCostPoints = totalCostQ.data?.costPerSim ?? [];
  const totalCostInProgress = totalCostQ.data?.window.inProgressBucket;
  const totalCost = useMemo(
    () =>
      buildTotalCostSeries(withoutInProgress(totalCostPoints, p => p.bucket, totalCostInProgress)),
    [totalCostPoints, totalCostInProgress],
  );

  /* --------------- base-response panels (no grain of their own) ------------- */

  const activeMultiples = useMemo(() => buildActiveUserMultiples(o?.activeUsers ?? []), [o]);
  const roles = useMemo(() => buildRoleBars(o?.usersByRole ?? []), [o]);
  const topOrgs = useMemo(() => buildTopOrgBars(h?.topOrgs ?? [], h?.topOrgsBelowFloor), [h]);
  const funnelStages = useMemo(() => buildTrackFunnelStages(h?.trackFunnel), [h]);

  /* ------------------------------- KPIs ----------------------------------- */

  const baseInProgress = h?.window.inProgressBucket;
  const baseOverviewInProgress = o?.window.inProgressBucket;

  // Sparklines come from the BASE grain, not from each chart's grain: a KPI's
  // trend should not change shape because someone re-grouped one chart below it.
  // They drop the accruing period for the same reason the plots do.
  const kpiSparks = useMemo(() => {
    const growth = withoutInProgress(o?.userGrowth ?? [], p => p.date, baseOverviewInProgress);
    return {
      cumulative: sparkValues(buildCumulativeUsersSeries(growth)),
      sims: sparkValues(
        buildSimulationsSeries(
          withoutInProgress(o?.simulationsCompleted ?? [], p => p.bucket, baseOverviewInProgress),
        ),
      ),
      practice: sparkValues(
        buildPracticeMinutesSeries(
          withoutInProgress(h?.practiceMinutes ?? [], p => p.bucket, baseInProgress),
        ),
      ),
      csat: sparkValues(
        buildCsatTrendSeries(withoutInProgress(h?.csatTrend ?? [], p => p.bucket, baseInProgress)),
      ),
      costPerSim: sparkValues(
        buildCostPerSimSeries(
          withoutInProgress(h?.costPerSim ?? [], p => p.bucket, baseInProgress),
        ),
      ),
    };
  }, [h, o, baseInProgress, baseOverviewInProgress]);

  // Each tile states what it counts, in one line, on its face. The strip is the
  // part of this page most likely to be screenshotted on its own, and a bare
  // "Active orgs: 0" is not interpretable without knowing that "active" means a
  // COMPLETED simulation and that the figure covers all of the platform's
  // history. Definitions are worded to match the derivations the charts cite.
  //
  // No `delta` / `comparisonLabel` on any tile: the window is all-time, so the
  // server returns no comparison basis and there is nothing honest to compare
  // against. The tiles fall back to showing their sample size.
  const kpis = [
    {
      label: "Total users",
      description: "Every registered account, all time.",
      value: formatKpi(overviewSummary?.totalUsers),
      spark: kpiSparks.cumulative,
      loading: overviewLoading,
    },
    {
      label: "Active users",
      description:
        "Distinct people who have started at least one simulation — started, not necessarily finished.",
      value: formatKpi(overviewSummary?.activeUsers),
      loading: overviewLoading,
    },
    {
      label: "Active orgs",
      description:
        "Organisations with at least one completed simulation. An org that only browsed does not count.",
      value: formatKpi(summary?.activeOrgs),
      loading: highlightsLoading,
    },
    {
      label: "Completed sims",
      description:
        "Roleplay sessions played through to the end. Abandoned and failed runs are excluded.",
      value: formatKpi(summary?.completedSimulations),
      spark: kpiSparks.sims,
      loading: highlightsLoading,
    },
    {
      label: "Practice minutes",
      description:
        "Total minutes learners spent practising, summed across everyone. A few heavy users can carry this on their own.",
      value: formatKpi(summary?.practiceMinutes),
      spark: kpiSparks.practice,
      loading: highlightsLoading,
    },
    {
      label: "Actor goal score",
      description: `Mean composite score of evaluated sessions, ${SCORE_DOMAIN[0]}–${SCORE_DOMAIN[1]}, judged by an LLM against the scenario rubric. One of the four inputs to the Quality index chart below — not the same figure.`,
      value: formatKpi(summary?.avgCompositeScore, { decimals: 1 }),
      // Below the documented minimum this tile shows "not enough data" instead:
      // a one-decimal mean of a handful of LLM-judged sessions is noise wearing
      // a decimal point.
      //
      // No `spark` here: its source, the per-bucket qualityTrend series, was
      // retired from the highlights payload along with the trend chart it fed
      // (superseded by the Roleplay Quality Index below). This tile keeps only
      // the whole-window figure `getQualityOverall` still provides.
      n: summary?.evaluatedSessions,
      nUnit: "evaluated sessions",
      minN: MIN_N_FOR_SCORE,
      loading: highlightsLoading,
    },
    {
      label: "Avg rating",
      description: `Mean ${RATING_DOMAIN[0]}–${RATING_DOMAIN[1]} rating learners gave after a session. Rating is optional, so this covers only those who answered.`,
      value: formatKpi(summary?.avgCsat, { decimals: 2 }),
      n: summary?.csatResponses,
      nUnit: "responses",
      minN: MIN_N_FOR_SCORE,
      spark: kpiSparks.csat,
      loading: highlightsLoading,
    },
    {
      label: "AI cost / sim",
      // The scope note is on the tile, not just on the chart below: this tile
      // draws from the same unattributable spend rows, so under a tenant filter
      // it is a platform-wide number and has to say so where it is read.
      description:
        "Estimated AI spend (LLM + speech-to-text + text-to-speech) divided by completed sims. Priced at read time, not a billed figure." +
        scopeNote(costUnscoped),
      value: formatKpi(summary?.costPerCompletedSimUsd, { prefix: "$", decimals: 2 }),
      spark: kpiSparks.costPerSim,
      loading: highlightsLoading,
    },
  ];

  /* ------------------------------ options --------------------------------- */
  //
  // Memoised on the chart's own grain: the axis title is the only thing in these
  // that varies, and a fresh options object on every render makes Carbon re-apply
  // (and re-animate) the chart.

  const newUsersOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "New users",
        bottomTitle: bucketTitle(grain.newUsers),
        colorScale: NEW_USERS_SCALE,
      }),
    [grain.newUsers],
  );
  const cumulativeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Users",
        bottomTitle: bucketTitle(grain.cumulative),
        colorScale: CUMULATIVE_USERS_SCALE,
        legend: false,
      }),
    [grain.cumulative],
  );
  const retentionOpts = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Active users",
        bottomTitle: bucketTitle(grain.retention),
        colorScale: RETENTION_SCALE,
      }),
    [grain.retention],
  );
  const simsOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "Completed",
        bottomTitle: bucketTitle(grain.sims),
        colorScale: { Simulations: CONTEXT.line },
      }),
    [grain.sims],
  );
  const rolesOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Users",
        colorScale: {
          ...roles.bars.reduce(
            (acc, b, i) => ({ ...acc, [b.group]: i === 0 ? "#264D8E" : CONTEXT.line }),
            {},
          ),
        },
      }),
    [roles],
  );
  const practiceOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Minutes",
        bottomTitle: bucketTitle(grain.practice),
        colorScale: PRACTICE_SCALE,
        legend: false,
      }),
    [grain.practice],
  );
  const playTimeOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Minutes per session",
        bottomTitle: bucketTitle(grain.playTime),
        colorScale: PLAY_TIME_SCALE,
      }),
    [grain.playTime],
  );
  const qualityIndexOpts = useMemo(
    () =>
      stackedAreaLineOpts({
        // Fixed stack order, not derived from the data present: the order is
        // part of the chart's contract, not something that should reshuffle
        // depending on which dimensions this window happens to cover.
        areaGroups: QUALITY_INDEX_DIMENSIONS.map(d => QUALITY_INDEX_DIMENSION_LABELS[d]),
        lineGroup: QUALITY_INDEX_LABEL,
        colorScale: QUALITY_INDEX_SCALE,
        leftTitle: "Quality index",
        bottomTitle: bucketTitle(grain.qualityIndex),
        domain: QUALITY_INDEX_DOMAIN,
      }),
    [grain.qualityIndex],
  );
  const csatOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Rating",
        bottomTitle: bucketTitle(grain.csat),
        colorScale: CSAT_SCALE,
        legend: false,
        domain: RATING_DOMAIN,
      }),
    [grain.csat],
  );
  const csatZoomedOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Rating",
        bottomTitle: bucketTitle(grain.csat),
        colorScale: CSAT_SCALE,
        legend: false,
      }),
    [grain.csat],
  );
  const orgsOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Completed simulations",
        colorScale: topOrgs.reduce(
          (acc, b, i) => ({ ...acc, [b.group]: i === 0 ? "#264D8E" : CONTEXT.line }),
          {},
        ),
      }),
    [topOrgs],
  );
  const costPerSimOpts = useMemo(
    () =>
      lineOpts({
        leftTitle: "USD per simulation",
        bottomTitle: bucketTitle(grain.costPerSim),
        colorScale: COST_PER_SIM_SCALE,
        legend: false,
      }),
    [grain.costPerSim],
  );
  const totalCostOpts = useMemo(
    () =>
      timeBarOpts({
        leftTitle: "USD",
        bottomTitle: bucketTitle(grain.totalCost),
        colorScale: TOTAL_COST_SCALE,
      }),
    [grain.totalCost],
  );

  /* --------------------------- detail tables ------------------------------ */

  /** Bucket label for a table row, flagged while the period is still accruing. */
  const rowKey = (bucket: string, inProgress?: string | null) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  /** The header lines every export carries: window, grain, and the omission. */
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

  const costUnpricedNote =
    unpriced > 0
      ? ` · ${unpriced.toLocaleString()} calls had no pricing entry, so this UNDERSTATES real spend`
      : " · every call in this window was priced";

  return (
    <div className="flex flex-col gap-4">
      {/* The hero card, ABOVE the KPI strip and alone in its row.
          
          Ally Certification is the platform's top-level outcome metric; every
          tile below it — practice minutes, sessions, retention — is an enabler
          of this one, and an enabler is only worth optimising because of what it
          enables. Salience has to be budgeted across the whole screen, so the
          ranking is expressed in the layout (first, full width, alone) rather
          than asserted in a caption nobody reads. It carries its own request:
          the threshold is a lifetime total, so it shares no window or grain with
          the endpoints feeding the rest of the tab. */}
      <CertificationCard tenantId={query.tenantId} />

      {/* KPI strip. Definitions and sample sizes live on the tiles, not in
          tooltips — a caveat that only appears on hover never reaches the
          screenshot that ends up in a board deck. No change-vs-previous on an
          all-time window: see the file header. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ------------------------- Growth & reach ------------------------- */}
      <SubHeading>Growth &amp; reach</SubHeading>
      {overview.isError ? (
        <ChartCard
          error
          onRetry={overview.refetch}
          errorTitle="Couldn't load platform metrics"
          errorSubtitle="There was a problem fetching growth and activity."
        >
          <div />
        </ChartCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard
            title="New users per period"
            caption={`Registrations in each period — the growth signal.${inProgressCaption(
              grain.newUsers,
              newUsersInProgress,
            )}`}
            source={buildSource({
              derivation: "users.createdAt, bucketed",
              window: windowLabel(newUsersQ.data?.window),
              extra: groupingNote(grain.newUsers),
              asOf: asOf(newUsersQ.data?.window),
            })}
            loading={busy(newUsersQ)}
            error={newUsersQ.isError}
            onRetry={newUsersQ.refetch}
            empty={!busy(newUsersQ) && newUsers.length === 0}
            controls={picker("newUsers")}
            onExpand={() => setExpanded("newUsers")}
          >
            <ScrollableChart data={newUsers}>
              <SimpleBarChart data={newUsers} options={newUsersOpts} />
            </ScrollableChart>
          </ChartCard>

          <ChartCard
            title="Cumulative users"
            caption={`Running total. Shown separately because it is two orders of magnitude larger than the per-period figure — on one axis it flattens the chart beside it.${inProgressCaption(
              grain.cumulative,
              cumulativeInProgress,
            )}`}
            source={buildSource({
              derivation: "Running total of registrations",
              window: windowLabel(cumulativeQ.data?.window),
              extra: groupingNote(grain.cumulative),
              asOf: asOf(cumulativeQ.data?.window),
            })}
            loading={busy(cumulativeQ)}
            error={cumulativeQ.isError}
            onRetry={cumulativeQ.refetch}
            empty={!busy(cumulativeQ) && cumulativeUsers.length === 0}
            controls={picker("cumulative")}
            onExpand={() => setExpanded("cumulative")}
          >
            <ScrollableChart data={cumulativeUsers}>
              <LineChart data={cumulativeUsers} options={cumulativeOpts} />
            </ScrollableChart>
          </ChartCard>

          <ChartCard
            title="Active users — new vs returning"
            caption={`Stacked because the two partition the period's active users. "New" means the account was created in that same period, so the split moves with the grouping — read yearly, most of a year's actives count as returning.${inProgressCaption(
              grain.retention,
              retentionInProgress,
            )}`}
            source={buildSource({
              derivation: "Distinct active users per period, split by account age",
              window: windowLabel(retentionQ.data?.window),
              extra: groupingNote(grain.retention),
              asOf: asOf(retentionQ.data?.window),
            })}
            loading={busy(retentionQ)}
            error={retentionQ.isError}
            onRetry={retentionQ.refetch}
            empty={!busy(retentionQ) && retention.length === 0}
            controls={picker("retention")}
            onExpand={() => setExpanded("retention")}
          >
            <ScrollableChart data={retention}>
              <StackedBarChart data={retention} options={retentionOpts} />
            </ScrollableChart>
          </ChartCard>

          <ChartCard
            title="Users by role"
            caption={
              roles.otherRoles > 0
                ? `Top 4 roles; the remaining ${roles.otherRoles} are grouped as "Other".`
                : "All roles."
            }
            source={buildSource({
              derivation: "Group membership, current (not windowed)",
              asOf: asOf(o?.window),
            })}
            loading={overviewLoading}
            empty={!overviewLoading && roles.bars.length === 0}
          >
            <SimpleBarChart data={roles.bars} options={rolesOpts} />
          </ChartCard>
        </div>
      )}

      {/* Sits next to "new vs returning" deliberately: both are retention, and
          adjacency is what tells the reader they are related. That chart
          re-partitions each period independently; this one follows one cohort
          forward, which is the only way to see whether newer intakes stick. It
          owns its own query and is month-grained by construction — a cohort
          triangle needs a fixed cohort grain, so it carries no grouping control. */}
      <div className="mt-4">
        <CohortRetentionCard tenantId={query.tenantId} />
      </div>

      {/* --------------------------- Engagement --------------------------- */}
      <SubHeading>Engagement</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Practice minutes"
          caption={`Total minutes learners spent practising. Zero periods are real zeros, not missing data.${inProgressCaption(
            grain.practice,
            practiceInProgress,
          )}`}
          source={buildSource({
            derivation: "Sum of user_daily_scores.minutesPlayed",
            window: windowLabel(practiceQ.data?.window),
            n: learners,
            nUnit: "learners at peak",
            extra: groupingNote(grain.practice),
            asOf: asOf(practiceQ.data?.window),
          })}
          loading={busy(practiceQ)}
          error={practiceQ.isError}
          onRetry={practiceQ.refetch}
          empty={!busy(practiceQ) && practice.length === 0}
          controls={picker("practice")}
          onExpand={() => setExpanded("practice")}
        >
          <ScrollableChart data={practice}>
            <LineChart data={practice} options={practiceOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Average simulation play time"
          caption={`How long one simulation lasts. The mean is the headline; the median and p95 are there because session length is skewed — a few very long sittings pull an average away from the typical session. Breaks in the lines are periods with no completed session, not zero-length ones.${inProgressCaption(
            grain.playTime,
            playTimeInProgress,
          )}`}
          source={buildSource({
            derivation:
              "scenario_session_details.callDuration over COMPLETED sessions, net of paused time",
            window: windowLabel(playTimeQ.data?.window),
            n: playTimeSessions,
            nUnit: "timed sessions",
            extra: groupingNote(grain.playTime),
            asOf: asOf(playTimeQ.data?.window),
          })}
          takeaway={
            summary?.avgPlayTimeMinutes !== null && summary?.avgPlayTimeMinutes !== undefined
              ? `${summary.avgPlayTimeMinutes} min per simulation on average, all time`
              : undefined
          }
          loading={busy(playTimeQ)}
          error={playTimeQ.isError}
          onRetry={playTimeQ.refetch}
          empty={!busy(playTimeQ) && playTime.every(d => d.value === null)}
          controls={picker("playTime")}
          onExpand={() => setExpanded("playTime")}
        >
          <ScrollableChart data={playTime}>
            <LineChart data={playTime} options={playTimeOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Completed simulations"
          caption={`Volume context for the quality and cost figures.${inProgressCaption(
            grain.sims,
            simsInProgress,
          )}`}
          source={buildSource({
            derivation: "Sessions with eventStatus COMPLETED, per period",
            window: windowLabel(simsQ.data?.window),
            extra: groupingNote(grain.sims),
            asOf: asOf(simsQ.data?.window),
          })}
          loading={busy(simsQ)}
          error={simsQ.isError}
          onRetry={simsQ.refetch}
          empty={!busy(simsQ) && sims.length === 0}
          controls={picker("sims")}
          onExpand={() => setExpanded("sims")}
        >
          <ScrollableChart data={sims}>
            <SimpleBarChart data={sims} options={simsOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* Sits directly under the practice-minutes total on purpose: that line
          says how much practice happened, which a handful of heavy users can
          carry on their own, and this says who it came from. Owns its own query
          because it is monthly and fixed-window, and says so on its face. */}
      <div className="mt-4">
        <UsageLevelCard tenantId={query.tenantId} />
      </div>

      {/* Next to the usage-level mix on purpose: both are distributions over the
          same learner population, and adjacency is what tells the reader they are
          two views of one question. That one bands a MONTH of minutes and shows
          whether the mix is shifting; this one bands a LIFETIME of completed
          roleplays and shows how deep engagement goes and how many learners never
          started. Owns its own query, all-time by construction. */}
      <div className="mt-4">
        <RoleplayVolumeCard tenantId={query.tenantId} />
      </div>

      {/* Active users as small multiples: DAU/WAU/MAU are nested windows, so on
          one axis MAU dominates and the volatile DAU shape is unreadable. No
          grouping control here — these are trailing-window definitions sampled
          once per day, so a coarser grain would answer a different question
          rather than the same one at lower resolution. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeMultiples.map(m => (
          <ChartCard
            key={m.label}
            title={`Active users — ${m.label}`}
            caption="Sampled daily, and not re-groupable: a trailing 7- or 30-day count read monthly would be a different measure. Each window has its own vertical scale; they are nested, so they are not comparable by height."
            source={buildSource({
              derivation: "Distinct users with session activity in the trailing window",
              window: oWindow,
            })}
            loading={overviewLoading}
            empty={!overviewLoading && m.series.length === 0}
          >
            <ScrollableChart data={m.series}>
              <LineChart
                data={m.series}
                options={lineOpts({
                  leftTitle: "Distinct users",
                  bottomTitle: "Day",
                  colorScale: m.scale,
                  legend: false,
                  extra: { points: { enabled: false } },
                })}
              />
            </ScrollableChart>
          </ChartCard>
        ))}
      </div>

      {/* ----------------------- Outcomes & quality ----------------------- */}
      <SubHeading>Outcomes &amp; quality</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Roleplay quality"
          caption={
            `Weighted blend of four dimensions per ${bucketTitle(grain.qualityIndex).toLowerCase()} — ` +
            `the stack is what it's made of, the line is their sum. ` +
            `${boundedDomainNote(QUALITY_INDEX_DOMAIN)} A period with no data in ANY ` +
            `dimension breaks the line rather than dropping to zero.${inProgressCaption(
              grain.qualityIndex,
              qualityIndexInProgress,
            )}` +
            (qualityFullyCalibrated
              ? ""
              : " Some dimensions are still on PLACEHOLDER anchors, not yet " +
                "measured from production traffic — see the note below the tab.")
          }
          source={buildSource({
            derivation:
              "Weighted blend of actor-goal score, in-character rate, language " +
              "quality and response latency; each normalised 0-100 and re-weighted " +
              "over whichever dimensions had data" +
              (qualityIndexQ.data?.indexVersion
                ? ` (index v${qualityIndexQ.data.indexVersion})`
                : ""),
            window: windowLabel(qualityIndexQ.data?.window),
            n: summary?.evaluatedSessions,
            nUnit: "evaluated sessions",
            extra: groupingNote(grain.qualityIndex),
            asOf: asOf(qualityIndexQ.data?.window),
          })}
          loading={busy(qualityIndexQ)}
          error={qualityIndexQ.isError}
          onRetry={qualityIndexQ.refetch}
          n={summary?.evaluatedSessions}
          nUnit="evaluated sessions"
          minN={MIN_N_FOR_SCORE}
          empty={!busy(qualityIndexQ) && qualityLine.every(d => d.value === null)}
          controls={picker("qualityIndex")}
          onExpand={() => setExpanded("qualityIndex")}
        >
          <ScrollableChart data={quality}>
            <ComboChart data={quality} options={qualityIndexOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Learner satisfaction"
          caption={`Mean post-session rating. ${boundedDomainNote(
            RATING_DOMAIN,
          )} Gaps are periods with no ratings.${inProgressCaption(grain.csat, csatInProgress)}`}
          source={buildSource({
            derivation: "Mean of scenario_session_feedbacks.rating",
            window: windowLabel(csatQ.data?.window),
            n: summary?.csatResponses,
            nUnit: "responses",
            extra: groupingNote(grain.csat),
            asOf: asOf(csatQ.data?.window),
          })}
          loading={busy(csatQ)}
          error={csatQ.isError}
          onRetry={csatQ.refetch}
          n={summary?.csatResponses}
          nUnit="responses"
          minN={MIN_N_FOR_SCORE}
          empty={!busy(csatQ) && csat.every(d => d.value === null)}
          controls={picker("csat")}
          onExpand={() => setExpanded("csat")}
        >
          <ScrollableChart data={csat}>
            <LineChart data={csat} options={csatOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* Per-dimension coverage/calibration for the index above, one line each.
          Not a paraphrase of a server string — built from `indexCoverage`, the
          same array the card's own caption checks via `qualityFullyCalibrated`,
          so the two can't disagree. */}
      {qualityCoverageNotes.length > 0 && (
        <div className="max-w-3xl text-xs leading-relaxed text-typography-500">
          <strong>On the quality index:</strong> each dimension is normalised against anchors
          measured from production traffic, pinned to one judge version, and re-weighted whenever a
          dimension has no data in a period.
          <ul className="mt-1 list-disc pl-5">
            {qualityCoverageNotes.map((note, i) => (
              <li key={QUALITY_INDEX_DIMENSIONS[i]}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <ChartCard
        title="Learning track funnel"
        caption="Every enrollment ever created. Recent cohorts have had less time to finish, so a low completion share here is not necessarily a drop-off."
        source={buildSource({
          derivation: "track_enrollments cohort created in window",
          window: hWindow,
          n: h?.trackFunnel.enrolled,
          nUnit: "enrollments",
          asOf: asOf(h?.window),
        })}
        loading={highlightsLoading}
        empty={!highlightsLoading && !funnelStages.some(st => st.reached > 0)}
        wide
      >
        <div className="flex flex-col gap-4">
          <FunnelBars stages={funnelStages} unit="enrollments" />
          {h?.trackFunnel && h.trackFunnel.quizAttempts > 0 && (
            <p className="text-xs" style={{ color: CONTEXT.strong }}>
              Quiz pass rate: {formatKpi(h.trackFunnel.quizPassRatePct, { suffix: "%" })} (
              {h.trackFunnel.quizPassed.toLocaleString()} of{" "}
              {h.trackFunnel.quizAttempts.toLocaleString()} graded attempts)
            </p>
          )}
        </div>
      </ChartCard>

      {/* ---------------------------- Adoption ---------------------------- */}
      <SubHeading>Adoption</SubHeading>
      <ChartCard
        title="Completed simulations by organisation"
        caption={
          h?.topOrgsBelowFloor && h.topOrgsBelowFloor.orgs > 0
            ? `Top orgs by volume, all time. ${h.topOrgsBelowFloor.orgs} smaller orgs are grouped unnamed — naming an org with a handful of sessions identifies its learners.`
            : "Top orgs by volume, all time."
        }
        source={
          buildSource({
            derivation: "Completed sessions grouped by tenant",
            window: hWindow,
            asOf: asOf(h?.window),
          }) + scopeNote(orgsUnscoped)
        }
        loading={highlightsLoading}
        error={highlights.isError}
        onRetry={highlights.refetch}
        empty={!highlightsLoading && topOrgs.length === 0}
        wide
      >
        <SimpleBarChart data={topOrgs} options={orgsOpts} />
      </ChartCard>

      {/* ------------------------- Unit economics ------------------------- */}
      <SubHeading>Unit economics</SubHeading>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="AI cost per completed simulation"
          caption={`All platform AI spend (LLM + STT + TTS) divided by completed simulations. Gaps are periods with no completed simulations.${inProgressCaption(
            grain.costPerSim,
            costInProgress,
          )}`}
          source={
            buildSource({
              derivation: "Estimated from the pricing table at read time — not a billed figure",
              window: windowLabel(costPerSimQ.data?.window),
              extra: groupingNote(grain.costPerSim),
              asOf: asOf(costPerSimQ.data?.window),
            }) +
            costUnpricedNote +
            scopeNote(costUnscoped)
          }
          loading={busy(costPerSimQ)}
          error={costPerSimQ.isError}
          onRetry={costPerSimQ.refetch}
          errorTitle="Couldn't load AI cost"
          errorSubtitle="There was a problem fetching cost metrics."
          empty={!busy(costPerSimQ) && costPerSim.every(d => d.value === null)}
          controls={picker("costPerSim")}
          onExpand={() => setExpanded("costPerSim")}
        >
          <ScrollableChart data={costPerSim}>
            <LineChart data={costPerSim} options={costPerSimOpts} />
          </ScrollableChart>
        </ChartCard>

        <ChartCard
          title="Total AI spend"
          caption={`Absolute spend per period. Separate from cost-per-sim because the two differ by orders of magnitude.${inProgressCaption(
            grain.totalCost,
            totalCostInProgress,
          )}`}
          source={
            buildSource({
              derivation: "Estimated from the pricing table at read time — not a billed figure",
              window: windowLabel(totalCostQ.data?.window),
              extra: groupingNote(grain.totalCost),
              asOf: asOf(totalCostQ.data?.window),
            }) +
            costUnpricedNote +
            scopeNote(costUnscoped)
          }
          loading={busy(totalCostQ)}
          error={totalCostQ.isError}
          onRetry={totalCostQ.refetch}
          empty={!busy(totalCostQ) && totalCost.length === 0}
          controls={picker("totalCost")}
          onExpand={() => setExpanded("totalCost")}
        >
          <ScrollableChart data={totalCost}>
            <SimpleBarChart data={totalCost} options={totalCostOpts} />
          </ScrollableChart>
        </ChartCard>
      </div>

      {/* ---------------------------- Detail views ------------------------- */}
      {/*
        The tables read the FULL arrays, including the accruing period, whose row
        is flagged. That is where a provisional number belongs: a reader looking
        at a grid can see "in progress" beside the figure, where a line chart can
        only draw it as a fall.
      */}

      {expanded === "newUsers" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="New users per period"
          source={buildSource({
            derivation: "users.createdAt, bucketed",
            window: windowLabel(newUsersQ.data?.window),
            extra: groupingNote(grain.newUsers),
          })}
          table={{
            columns: [bucketTitle(grain.newUsers), "New users"],
            rows: newUsersPoints.map(p => [rowKey(p.date, newUsersInProgress), p.newUsers]),
          }}
          exportContext={exportLines(
            windowLabel(newUsersQ.data?.window),
            grain.newUsers,
            newUsersInProgress,
          )}
          render={({ height }) => (
            <ScrollableChart data={newUsers}>
              <SimpleBarChart data={newUsers} options={{ ...newUsersOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "cumulative" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Cumulative users"
          source={buildSource({
            derivation: "Running total of registrations",
            window: windowLabel(cumulativeQ.data?.window),
            extra: groupingNote(grain.cumulative),
          })}
          table={{
            columns: [bucketTitle(grain.cumulative), "Cumulative users"],
            rows: cumulativePoints.map(p => [
              rowKey(p.date, cumulativeInProgress),
              p.cumulativeUsers,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(cumulativeQ.data?.window),
            grain.cumulative,
            cumulativeInProgress,
          )}
          render={({ height }) => (
            <ScrollableChart data={cumulativeUsers}>
              <LineChart data={cumulativeUsers} options={{ ...cumulativeOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "retention" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Active users — new vs returning"
          caption='"New" is relative to the grouping: an account created in the same period as the activity. Re-grouping this chart genuinely changes the question, not just the resolution.'
          source={buildSource({
            derivation: "Distinct active users per period, split by account age",
            window: windowLabel(retentionQ.data?.window),
            extra: groupingNote(grain.retention),
          })}
          table={{
            columns: [bucketTitle(grain.retention), "New", "Returning"],
            rows: retentionPoints.map(p => [
              rowKey(p.bucket, retentionInProgress),
              p.newUsers,
              p.returningUsers,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(retentionQ.data?.window),
            grain.retention,
            retentionInProgress,
          )}
          render={({ height }) => (
            <ScrollableChart data={retention}>
              <StackedBarChart data={retention} options={{ ...retentionOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "sims" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Completed simulations"
          source={buildSource({
            derivation: "Sessions with eventStatus COMPLETED, per period",
            window: windowLabel(simsQ.data?.window),
            extra: groupingNote(grain.sims),
          })}
          table={{
            columns: [bucketTitle(grain.sims), "Completed"],
            rows: simsPoints.map(p => [rowKey(p.bucket, simsInProgress), p.count]),
          }}
          exportContext={exportLines(windowLabel(simsQ.data?.window), grain.sims, simsInProgress)}
          render={({ height }) => (
            <ScrollableChart data={sims}>
              <SimpleBarChart data={sims} options={{ ...simsOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "practice" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Practice minutes"
          source={buildSource({
            derivation: "Sum of user_daily_scores.minutesPlayed",
            window: windowLabel(practiceQ.data?.window),
            n: learners,
            nUnit: "learners at peak",
            extra: groupingNote(grain.practice),
          })}
          table={{
            columns: [bucketTitle(grain.practice), "Minutes", "Active learners"],
            rows: practicePoints.map(p => [
              rowKey(p.bucket, practiceInProgress),
              p.minutes,
              p.activeLearners,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(practiceQ.data?.window),
            grain.practice,
            practiceInProgress,
          )}
          render={({ height }) => (
            <ScrollableChart data={practice}>
              <LineChart data={practice} options={{ ...practiceOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "playTime" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Average simulation play time"
          caption="Mean, median and p95 length of one completed simulation. Where the mean sits well above the median, a minority of long sittings is carrying it."
          source={buildSource({
            derivation:
              "scenario_session_details.callDuration over COMPLETED sessions, net of paused time",
            window: windowLabel(playTimeQ.data?.window),
            n: playTimeSessions,
            nUnit: "timed sessions",
            extra: groupingNote(grain.playTime),
          })}
          table={{
            columns: [
              bucketTitle(grain.playTime),
              "Mean (min)",
              "Median (min)",
              "p95 (min)",
              "Sessions",
            ],
            rows: playTimePoints.map(p => [
              rowKey(p.bucket, playTimeInProgress),
              p.avgMinutes ?? "—",
              p.medianMinutes ?? "—",
              p.p95Minutes ?? "—",
              p.sessions,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(playTimeQ.data?.window),
            grain.playTime,
            playTimeInProgress,
            `Timed sessions: ${playTimeSessions}`,
          )}
          render={({ height }) => (
            <ScrollableChart data={playTime}>
              <LineChart data={playTime} options={{ ...playTimeOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "qualityIndex" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Roleplay quality index"
          caption="Sample size per dimension per period is the column the chart cannot show — a coverage gap moves the index for reasons that are not quality, and the notes below the tab name every dimension's coverage."
          source={buildSource({
            derivation:
              "Weighted blend of actor-goal score, in-character rate, language " +
              "quality and response latency; each normalised 0-100 and " +
              "re-weighted over whichever dimensions had data",
            window: windowLabel(qualityIndexQ.data?.window),
            n: summary?.evaluatedSessions,
            nUnit: "evaluated sessions",
            extra: groupingNote(grain.qualityIndex),
          })}
          // No zoomable variant: the index is 0-100 by construction, and the
          // whole point of the stack is reading how much of that fixed scale
          // is covered — auto-fitting the axis to the data would distort
          // exactly that reading.
          table={{
            columns: [
              bucketTitle(grain.qualityIndex),
              QUALITY_INDEX_LABEL,
              "Actor goal score",
              "Evaluated sessions",
            ],
            rows: qualityIndexPoints.map(p => [
              rowKey(p.bucket, qualityIndexInProgress),
              p.qualityIndex,
              p.avgCompositeScore,
              p.evaluatedSessions,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(qualityIndexQ.data?.window),
            grain.qualityIndex,
            qualityIndexInProgress,
            `Minimum n for a stated score: ${MIN_N_FOR_SCORE}`,
            ...qualityCoverageNotes,
          )}
          render={({ height }) => (
            <ScrollableChart data={quality}>
              <ComboChart data={quality} options={{ ...qualityIndexOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "csat" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Learner satisfaction"
          caption="Response count per period is the column the chart cannot show."
          source={buildSource({
            derivation: "Mean of scenario_session_feedbacks.rating",
            window: windowLabel(csatQ.data?.window),
            n: summary?.csatResponses,
            nUnit: "responses",
            extra: groupingNote(grain.csat),
          })}
          zoomable
          zoomNote={`Axis zoomed to the data instead of the full ${RATING_DOMAIN[0]}–${RATING_DOMAIN[1]} scale. This magnifies small changes — read the shape, not the height.`}
          table={{
            columns: [bucketTitle(grain.csat), "Avg rating", "Responses"],
            rows: csatPoints.map(p => [rowKey(p.bucket, csatInProgress), p.avgRating, p.responses]),
          }}
          exportContext={exportLines(
            windowLabel(csatQ.data?.window),
            grain.csat,
            csatInProgress,
            `Minimum n for a stated score: ${MIN_N_FOR_SCORE}`,
          )}
          render={({ height, zoomed }) => (
            <ScrollableChart data={csat}>
              <LineChart
                data={csat}
                options={{ ...(zoomed ? csatZoomedOpts : csatOpts), height }}
              />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "costPerSim" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="AI cost per completed simulation"
          caption="Unpriced calls contribute $0, so a period with many of them understates cost."
          source={buildSource({
            derivation: "Estimated from the pricing table at read time — not a billed figure",
            window: windowLabel(costPerSimQ.data?.window),
            extra: groupingNote(grain.costPerSim),
          })}
          table={{
            columns: [
              bucketTitle(grain.costPerSim),
              "Cost / sim (USD)",
              "Total (USD)",
              "Sims",
              "Unpriced calls",
            ],
            rows: costPoints.map(p => [
              rowKey(p.bucket, costInProgress),
              p.costPerSimUsd,
              p.estimatedCostUsd,
              p.completedSimulations,
              p.unpricedCalls,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(costPerSimQ.data?.window),
            grain.costPerSim,
            costInProgress,
            "Costs are estimated from the pricing table at read time, not billed figures",
            `Unpriced calls in window: ${unpriced.toLocaleString()}`,
          )}
          render={({ height }) => (
            <ScrollableChart data={costPerSim}>
              <LineChart data={costPerSim} options={{ ...costPerSimOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "totalCost" && (
        <ChartDetailModal
          open
          onClose={() => setExpanded(null)}
          title="Total AI spend"
          source={buildSource({
            derivation: "Estimated from the pricing table at read time — not a billed figure",
            window: windowLabel(totalCostQ.data?.window),
            extra: groupingNote(grain.totalCost),
          })}
          table={{
            columns: [bucketTitle(grain.totalCost), "Total (USD)"],
            rows: totalCostPoints.map(p => [
              rowKey(p.bucket, totalCostInProgress),
              p.estimatedCostUsd,
            ]),
          }}
          exportContext={exportLines(
            windowLabel(totalCostQ.data?.window),
            grain.totalCost,
            totalCostInProgress,
            `Unpriced calls in window: ${unpriced.toLocaleString()}`,
          )}
          render={({ height }) => (
            <ScrollableChart data={totalCost}>
              <SimpleBarChart data={totalCost} options={{ ...totalCostOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </div>
  );
};
