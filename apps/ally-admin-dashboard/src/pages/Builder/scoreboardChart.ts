import { BuilderScoreboardBuild, BuilderScoreboardTrendWeek } from "@types";

/**
 * Pure transforms for the Builder scoreboard — kept out of the component so
 * the week-labelling, the trend series shape, and the table sort are
 * unit-testable without a DOM, the same split the analytics chart files use
 * (see `pages/Analytics/usageLevelChart.ts`).
 */

/**
 * "12 May" — deliberately short. Carbon truncates a LABELS-axis tick past 14
 * characters, and a year would push a lot of these over that line for no
 * reading benefit within one scoreboard window.
 */
export const weekLabel = (weekStart: string): string => {
  const date = new Date(weekStart);
  if (Number.isNaN(date.getTime())) return weekStart;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export interface ScoreboardTrendPoint {
  group: string;
  key: string;
  value: number;
}

const toSeries = (
  trends: BuilderScoreboardTrendWeek[],
  group: string,
  pick: (week: BuilderScoreboardTrendWeek) => number | null,
): ScoreboardTrendPoint[] =>
  trends
    .map(week => ({ week, value: pick(week) }))
    .filter((row): row is { week: BuilderScoreboardTrendWeek; value: number } => row.value !== null)
    .map(({ week, value }) => ({ group, key: weekLabel(week.weekStart), value }));

/**
 * Round, but keep a null null.
 *
 * `Math.round(null * places)` is 0, not null — so rounding before the
 * null-check would plot a week where nothing merged as a zero, and a gap in
 * the data would read as a collapse in cost or merge rate.
 */
const round = (value: number | null | undefined, places: number): number | null =>
  value === null || value === undefined || !Number.isFinite(value)
    ? null
    : Math.round(value * places) / places;

export const buildsStartedSeries = (trends: BuilderScoreboardTrendWeek[]): ScoreboardTrendPoint[] =>
  toSeries(trends, "Builds", week => week.builds);

// `mergeRate` is a 0–1 fraction on the wire (matching `totals.mergeRate`);
// the chart and the KPI tile both state it as a percentage.
export const mergeRateSeries = (trends: BuilderScoreboardTrendWeek[]): ScoreboardTrendPoint[] =>
  toSeries(trends, "Merge rate", week => round(week.mergeRate * 100, 10));

export const medianCostSeries = (trends: BuilderScoreboardTrendWeek[]): ScoreboardTrendPoint[] =>
  toSeries(trends, "Median cost", week => round(week.medianCostUsd, 100));

export const medianFixRunsSeries = (trends: BuilderScoreboardTrendWeek[]): ScoreboardTrendPoint[] =>
  toSeries(trends, "Median fix runs", week => round(week.medianFixRuns, 10));

/** "1.2h" / "45m" / "—" for a null (nothing merged that week). */
export const formatHours = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
};

/** "$1.23" — costUsd on a scoreboard row is always a real spend, never omitted like a session's optional cost. */
export const formatScoreboardCost = (usd: number | null | undefined): string => {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return "—";
  return `$${usd.toFixed(2)}`;
};

/* -------------------------------------------------------------------------- */
/* The per-build table                                                        */
/* -------------------------------------------------------------------------- */

export type ScoreboardSortKey =
  | "title"
  | "outcome"
  | "createdAt"
  | "durationHours"
  | "costUsd"
  | "runCount"
  | "fixRunCount"
  | "reviewCommentCount"
  | "ciFailureCount"
  | "timeToMergeHours";

export type ScoreboardSortDirection = "asc" | "desc";

/** Columns where "nothing yet" (null) should sort as the lowest value, not crash the comparator. */
const sortValue = (build: BuilderScoreboardBuild, key: ScoreboardSortKey): number | string => {
  switch (key) {
    case "title":
      return build.title.toLowerCase();
    case "outcome":
      return build.outcome;
    case "createdAt":
      return new Date(build.createdAt).getTime();
    case "durationHours":
      return build.durationHours ?? -1;
    case "timeToMergeHours":
      return build.timeToMergeHours ?? -1;
    default:
      return build[key];
  }
};

export const sortScoreboardBuilds = (
  builds: BuilderScoreboardBuild[],
  key: ScoreboardSortKey,
  direction: ScoreboardSortDirection,
): BuilderScoreboardBuild[] => {
  const sign = direction === "asc" ? 1 : -1;
  return [...builds].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av < bv) return -1 * sign;
    if (av > bv) return 1 * sign;
    return 0;
  });
};
