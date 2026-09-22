import { useCallback, useMemo, useState } from "react";

import { AnalyticsBucket, AnalyticsGrain } from "@types";

/**
 * Per-chart time grouping — the "by day / week / month / year" control that sits
 * on an individual chart rather than on the page.
 *
 * Why per chart and not per page: the window and the grain answer different
 * questions. The window says *what period is covered*; the grain says *at what
 * resolution it is read*. A leadership page covering all of history wants years
 * on the growth chart and weeks on the quality chart at the same time, and a
 * single page-level picker forces the reader to choose one and then remember
 * which charts it did not suit.
 *
 * Re-grouping is a SERVER operation here, deliberately. Re-binning on the client
 * would only be correct for counts and sums — a mean of monthly means weights a
 * quiet month equally with a busy one, and a median or p95 cannot be recovered
 * from bucketed values at all. So each grain is a query, and the cost is paid
 * only for grains actually on screen (see {@link useChartGrouping}).
 */

/**
 * The full grain vocabulary — every SQL-bucketable value plus `"allTime"`. This
 * is NOT the default {@link GroupingPicker} offers (that stays the legacy
 * 4-value list until a chart explicitly opts in by passing `options={GROUPINGS}`
 * or its own narrowed list); it exists so a migrating chart has one canonical
 * "everything" list to opt into rather than hand-rolling it.
 */
export const GROUPINGS: AnalyticsGrain[] = ["day", "week", "month", "quarter", "year", "allTime"];

/** Display + axis-title name for a grain. One table, used by both. */
export const GROUPING_LABEL: Record<AnalyticsGrain, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  allTime: "All time",
};

/**
 * The grain an all-time surface opens on.
 *
 * Month, because an all-time window is years wide: a daily axis over it is a
 * thousand ticks that read as noise, and a yearly one is too coarse to show a
 * trend at all. Matches the server's own all-time default, so the first paint
 * needs no override.
 */
export const DEFAULT_GROUPING: AnalyticsGrain = "month";

/**
 * Narrow a grain to the SQL-bucket-facing value a query param actually accepts.
 *
 * `"allTime"` is never sent as a `bucket` param — the endpoints that back an
 * All-time KPI tile return their whole-window aggregate (e.g.
 * `practiceMinutesOverall`) on the SAME response as the bucketed series,
 * regardless of which bucket was requested, so a chart in All-time mode still
 * needs a valid bucket to ask for; `fallback` is what it asks for while
 * reading the aggregate field instead of `points`.
 */
export const grainAsBucket = (
  grain: AnalyticsGrain,
  fallback: AnalyticsBucket = "month",
): AnalyticsBucket => (grain === "allTime" ? fallback : grain);

/** Axis / column title for a grain. Falls back to Week for unknown values. */
export const bucketTitle = (bucket?: AnalyticsBucket | string): string =>
  GROUPING_LABEL[bucket as AnalyticsGrain] ?? GROUPING_LABEL.week;

/** "Grouped by month" — for a provenance line or an export header. */
export const groupingNote = (bucket: AnalyticsGrain): string =>
  `grouped by ${GROUPING_LABEL[bucket].toLowerCase()}`;

/**
 * Drop the still-accruing bucket from a series that is about to be PLOTTED.
 *
 * The current month (or week, or year) is not finished: its figure can only
 * rise, so it is not comparable with the completed buckets beside it. There is
 * no way to draw "not finished yet" — an unfinished period renders as a fall,
 * and the reader explains that fall to themselves. So it comes off the plot.
 *
 * It is NOT dropped from the data: the detail table and the export still carry
 * it, flagged, which is where a provisional number belongs. Pass the raw points
 * and their bucket accessor; a null/undefined `inProgressBucket` (a window that
 * ended in the past) leaves the series untouched.
 */
export function withoutInProgress<T>(
  points: T[],
  bucketOf: (point: T) => string,
  inProgressBucket?: string | null,
): T[] {
  if (!inProgressBucket) return points;
  return points.filter(p => bucketOf(p) !== inProgressBucket);
}

/** True when this bucket is the one still accruing. */
export const isInProgress = (bucket: string, inProgressBucket?: string | null): boolean =>
  Boolean(inProgressBucket) && bucket === inProgressBucket;

/**
 * Caption fragment naming the omission, so the reader of a screenshot can see
 * that the last period is missing on purpose rather than wonder where it went.
 */
export const inProgressCaption = (
  grouping: AnalyticsGrain,
  inProgressBucket?: string | null,
): string =>
  inProgressBucket
    ? ` The current ${GROUPING_LABEL[grouping].toLowerCase()} is still accruing and is left off the plot; it is in the expanded view.`
    : "";

export interface ChartGrouping<K extends string> {
  /** The grain a given chart is currently read at. */
  groupingFor: (chart: K) => AnalyticsBucket;
  setGrouping: (chart: K, grouping: AnalyticsBucket) => void;
  /**
   * The grains a given SET of charts needs, plus `base`.
   *
   * Callers pass the charts backed by one endpoint and issue a query per member,
   * so the cost of that endpoint is exactly what its own charts are showing.
   * Asking with every chart at once instead would make re-graining a chart fed
   * by endpoint A also re-fetch endpoint B for a grain nothing there displays.
   */
  bucketsFor: (charts: readonly K[]) => Set<AnalyticsBucket>;
  /** Every grain on screen across all charts, plus `base`. */
  bucketsInUse: Set<AnalyticsBucket>;
}

/**
 * Per-chart grouping state for a tab.
 *
 * `base` is always included in {@link ChartGrouping.bucketsInUse} even when no
 * chart is currently showing it: the panels that have no grain of their own — a
 * KPI strip, a funnel, a per-org ranking — read from that one response, and they
 * must not blink out because the last chart using that grain was switched away.
 * It also means the common case (nothing touched) is a single request per
 * endpoint, the same as before the control existed.
 */
export function useChartGrouping<K extends string>(
  defaults: Record<K, AnalyticsBucket>,
  // `DEFAULT_GROUPING` is typed `AnalyticsGrain` (the shared vocabulary this
  // hook does not yet speak — see Phase-4 migration notes on the tabs that use
  // it); the value itself ("month") is always a valid `AnalyticsBucket`.
  base: AnalyticsBucket = DEFAULT_GROUPING as AnalyticsBucket,
): ChartGrouping<K> {
  const [byChart, setByChart] = useState<Record<K, AnalyticsBucket>>(defaults);

  const setGrouping = useCallback((chart: K, grouping: AnalyticsBucket) => {
    setByChart(prev => ({ ...prev, [chart]: grouping }));
  }, []);

  const groupingFor = useCallback((chart: K) => byChart[chart] ?? base, [byChart, base]);

  const bucketsFor = useCallback(
    (charts: readonly K[]) =>
      new Set<AnalyticsBucket>([base, ...charts.map(c => byChart[c] ?? base)]),
    [byChart, base],
  );

  const bucketsInUse = useMemo(
    () => new Set<AnalyticsBucket>([base, ...Object.values<AnalyticsBucket>(byChart)]),
    [byChart, base],
  );

  return { groupingFor, setGrouping, bucketsFor, bucketsInUse };
}

/** One query result per bucketed grain, so a chart can read the grain it is set to. */
export type GrainQueries<T> = Record<AnalyticsBucket, T>;

/**
 * One hook per bucketed grain, in a fixed order so hook order never changes,
 * plus one `allTime` hook — each skipped unless a chart fed by that endpoint is
 * currently reading that grain.
 *
 * `allTime` is a different shape from the rest on purpose: it collapses the
 * chart's current window into a single KPI number, so it cannot be answered by
 * calling the bucketed series endpoint with a wider bucket (a mean of means, or
 * a percentile, cannot be recovered from already-bucketed values) — it needs
 * its own whole-window aggregate endpoint, hence the separate `overallHook`.
 *
 * `overallHook` is optional and defaults to a no-op skip-state hook so existing
 * callers — none of which offer an All-time option yet — keep compiling
 * unmodified; a chart wires up a real `overallHook` only once it actually adds
 * "All-time" to its own `options` list.
 *
 * The shape a caller ends up with is `q[groupingFor("chart")]` for the bucketed
 * grains, or `q.allTime` once wired. Lifted out of the individual sub-tabs
 * because every panel with a grain control needs exactly this, and a per-file
 * copy is a per-file chance to get the skip condition wrong.
 *
 * Pass the base grain in `grains` as well when a bucket-invariant panel (a KPI
 * tile, a funnel, a ranking) reads from the same response: without it that panel
 * blinks out the moment the last chart on that grain is switched away.
 */
const noOverallHook = <O>(): O => ({ data: undefined, isLoading: false }) as O;

export const useGrainQueries = <A, T, O = { data: undefined; isLoading: false }>(
  seriesHook: (arg: A & { bucket: AnalyticsBucket }, opts: { skip: boolean }) => T,
  query: A,
  grains: Set<AnalyticsGrain>,
  overallHook: (arg: A, opts: { skip: boolean }) => O = noOverallHook<O>,
): GrainQueries<T> & { allTime: O } => ({
  day: seriesHook({ ...query, bucket: "day" }, { skip: !grains.has("day") }),
  week: seriesHook({ ...query, bucket: "week" }, { skip: !grains.has("week") }),
  month: seriesHook({ ...query, bucket: "month" }, { skip: !grains.has("month") }),
  quarter: seriesHook({ ...query, bucket: "quarter" }, { skip: !grains.has("quarter") }),
  year: seriesHook({ ...query, bucket: "year" }, { skip: !grains.has("year") }),
  allTime: overallHook(query, { skip: !grains.has("allTime") }),
});

/**
 * Whether a panel's OWN request is still in flight.
 *
 * `isUninitialized` counts: on the render where a grain is first selected the
 * hook has only just stopped being skipped, so it reports neither loading nor
 * fetching and the card would flash its empty state for a frame.
 */
export const isBusy = (q: {
  isLoading: boolean;
  isFetching: boolean;
  isUninitialized: boolean;
  data?: unknown;
}): boolean => !q.data && (q.isLoading || q.isFetching || q.isUninitialized);
