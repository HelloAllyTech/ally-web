import { useCallback, useMemo, useState } from "react";

import { AnalyticsBucket } from "@types";

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

export const GROUPINGS: AnalyticsBucket[] = ["day", "week", "month", "year"];

/** Display + axis-title name for a grain. One table, used by both. */
export const GROUPING_LABEL: Record<AnalyticsBucket, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

/**
 * The grain an all-time surface opens on.
 *
 * Month, because an all-time window is years wide: a daily axis over it is a
 * thousand ticks that read as noise, and a yearly one is too coarse to show a
 * trend at all. Matches the server's own all-time default, so the first paint
 * needs no override.
 */
export const DEFAULT_GROUPING: AnalyticsBucket = "month";

/** Axis / column title for a grain. Falls back to Week for unknown values. */
export const bucketTitle = (bucket?: AnalyticsBucket | string): string =>
  GROUPING_LABEL[bucket as AnalyticsBucket] ?? GROUPING_LABEL.week;

/** "Grouped by month" — for a provenance line or an export header. */
export const groupingNote = (bucket: AnalyticsBucket): string =>
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
  grouping: AnalyticsBucket,
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
  base: AnalyticsBucket = DEFAULT_GROUPING,
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

/** One query result per grain, so a chart can read the grain it is set to. */
export type GrainQueries<T> = Record<AnalyticsBucket, T>;

/**
 * Four hooks for one endpoint — one per grain, in a fixed order so hook order
 * never changes — each skipped unless a chart fed by that endpoint is currently
 * reading that grain.
 *
 * The shape a caller ends up with is `q[groupingFor("chart")]`: re-graining a
 * chart replaces one request rather than adding one, and an endpoint is never
 * fetched at a grain nothing on screen displays. Lifted out of the individual
 * sub-tabs because every panel with a grain control needs exactly this, and a
 * per-file copy is a per-file chance to get the skip condition wrong.
 *
 * Pass the base grain in `grains` as well when a bucket-invariant panel (a KPI
 * tile, a funnel, a ranking) reads from the same response: without it that panel
 * blinks out the moment the last chart on that grain is switched away.
 */
export const useGrainQueries = <A, T>(
  useQueryHook: (arg: A & { bucket: AnalyticsBucket }, opts: { skip: boolean }) => T,
  query: A,
  grains: Set<AnalyticsBucket>,
): GrainQueries<T> => ({
  day: useQueryHook({ ...query, bucket: "day" }, { skip: !grains.has("day") }),
  week: useQueryHook({ ...query, bucket: "week" }, { skip: !grains.has("week") }),
  month: useQueryHook({ ...query, bucket: "month" }, { skip: !grains.has("month") }),
  year: useQueryHook({ ...query, bucket: "year" }, { skip: !grains.has("year") }),
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
