import {
  ActiveUsersPoint,
  CostPerSimPoint,
  CsatTrendPoint,
  PracticeMinutesPoint,
  QualityTrendPoint,
  RetentionPoint,
  TopOrgRow,
  TopOrgsBelowFloor,
  TrackFunnel,
  UserGrowthPoint,
  UsersByRolePoint,
} from "@types";

import { CONTEXT, ColorScale, PALETTE, STAT } from "./chartScales";
import { FunnelStage } from "./FunnelBars";

export type HighlightsDatum = { group: string; key: string; value: number | null };
export type HighlightsBarDatum = { group: string; value: number };

/** Series labels, keyed so the colour scales and data groups stay in sync. */
export const HIGHLIGHTS_GROUPS = {
  practiceMinutes: "Practice minutes",
  qualityScore: "Avg score",
  csat: "Avg rating",
  costPerSim: "Cost / sim",
  totalCost: "Total cost",
  newUsers: "New users",
  cumulativeUsers: "Cumulative users",
  newActive: "New",
  returningActive: "Returning",
  simulations: "Simulations",
  sessions: "Sessions",
};

/**
 * Bounded rubric ranges.
 *
 * These charts plot the FULL scale by default, so the reader sees where the value
 * sits on a scale they already know rather than against an arbitrary data-driven
 * ceiling. Both were previously zero-anchored to a data max, which compressed all
 * real movement into the top fifth of the plot; the zoomed view lives in the
 * chart's detail modal, where the truncation can be labelled.
 */
export const SCORE_DOMAIN: [number, number] = [0, 100];
export const RATING_DOMAIN: [number, number] = [1, 5];

/* -------------------------------------------------------------------------- */
/* Growth & engagement                                                        */
/* -------------------------------------------------------------------------- */

/**
 * New users per bucket. Split from the cumulative total: the two differ by orders
 * of magnitude, so sharing one zero-anchored axis pinned the weekly figure — the
 * thing the chart was titled after — flat against the baseline.
 */
export function buildNewUsersSeries(points: UserGrowthPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.newUsers,
    key: p.date,
    value: p.newUsers,
  }));
}

/** Cumulative user total per bucket — context for the new-user chart. */
export function buildCumulativeUsersSeries(points: UserGrowthPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.cumulativeUsers,
    key: p.date,
    value: p.cumulativeUsers,
  }));
}

export const NEW_USERS_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.newUsers]: PALETTE.purple,
};
export const CUMULATIVE_USERS_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.cumulativeUsers]: CONTEXT.line,
};

export const ACTIVE_WINDOW_LABEL = {
  dau: "Daily (DAU)",
  wau: "Weekly (WAU)",
  mau: "Monthly (MAU)",
};

/**
 * One active-user series per window, as SEPARATE datasets for small multiples.
 *
 * DAU/WAU/MAU are nested windows — every daily-active user is also
 * monthly-active — so on one axis MAU dominates and the DAU shape, which is the
 * volatile one worth watching, is unreadable. Small multiples give each its own
 * vertical scale while keeping the shared time axis.
 */
export function buildActiveUserMultiples(points: ActiveUsersPoint[]): {
  label: string;
  series: HighlightsDatum[];
  scale: ColorScale;
}[] {
  return [
    { label: ACTIVE_WINDOW_LABEL.dau, pick: (p: ActiveUsersPoint) => p.dau, color: STAT.p50 },
    { label: ACTIVE_WINDOW_LABEL.wau, pick: (p: ActiveUsersPoint) => p.wau, color: STAT.avg },
    { label: ACTIVE_WINDOW_LABEL.mau, pick: (p: ActiveUsersPoint) => p.mau, color: STAT.p95 },
  ].map(({ label, pick, color }) => ({
    label,
    series: points.map(p => ({ group: label, key: p.date, value: pick(p) })),
    scale: { [label]: color },
  }));
}

/** Weekly new-vs-returning active users, stacked (they partition the total). */
export function buildRetentionSeries(points: RetentionPoint[]): HighlightsDatum[] {
  return points.flatMap(p => [
    { group: HIGHLIGHTS_GROUPS.newActive, key: p.weekStart, value: p.newUsers },
    { group: HIGHLIGHTS_GROUPS.returningActive, key: p.weekStart, value: p.returningUsers },
  ]);
}

export const RETENTION_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.newActive]: PALETTE.green,
  [HIGHLIGHTS_GROUPS.returningActive]: PALETTE.blue,
};

/**
 * Completed simulations per bucket, keyed by bucket for a TIME bar chart.
 *
 * The `group` is a constant series label and the `key` is the period — which only
 * works with an x-axis mapped to `key`. Mapped to `group` (the categorical bar
 * default) every period collapses onto one bar labelled "Simulations".
 */
export function buildSimulationsSeries(
  points: { weekStart: string; count: number }[],
): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.simulations,
    key: p.weekStart,
    value: p.count,
  }));
}

/**
 * Users by role as sorted bars, with everything past the top four folded into
 * "Other".
 *
 * Was an unbounded-slice donut labelled with raw role enums: people estimate
 * wedge area badly, the slice count grew with the role table, and no colour scale
 * meant a role's colour changed with the data.
 */
export function buildRoleBars(
  points: UsersByRolePoint[],
  topN = 4,
): { bars: HighlightsBarDatum[]; otherRoles: number } {
  const humanise = (role: string) =>
    role
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());

  const sorted = [...points].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const bars = head.map(p => ({ group: humanise(p.role), value: p.count }));
  if (tail.length) {
    bars.push({
      group: `Other (${tail.length} roles)`,
      value: tail.reduce((sum, p) => sum + p.count, 0),
    });
  }
  return { bars, otherRoles: tail.length };
}

/* -------------------------------------------------------------------------- */
/* Engagement & outcomes                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Minutes practiced per bucket. The BE gap-fills this series, so zero buckets
 * are real zeros (nobody practised) rather than missing data — plot them.
 */
export function buildPracticeMinutesSeries(points: PracticeMinutesPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.practiceMinutes,
    key: p.bucket,
    value: p.minutes,
  }));
}

/** Distinct learners behind the practice-minutes series — its denominator. */
export function peakActiveLearners(points: PracticeMinutesPoint[]): number {
  return points.reduce((max, p) => Math.max(max, p.activeLearners), 0);
}

/**
 * Roleplay quality trend (mean composite score, 0-100).
 *
 * Buckets with no evaluated sessions are emitted as `null` rather than dropped:
 * dropping them let the line close the gap invisibly, so a fortnight with no
 * evaluations looked like a smooth trend across it. A null renders as a visible
 * break.
 */
export function buildQualityTrendSeries(points: QualityTrendPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.qualityScore,
    key: p.bucket,
    value: p.avgCompositeScore,
  }));
}

/** Learner CSAT trend; gapped for the same reason as the quality trend. */
export function buildCsatTrendSeries(points: CsatTrendPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.csat,
    key: p.bucket,
    value: p.avgRating,
  }));
}

export const QUALITY_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.qualityScore]: PALETTE.green,
};
export const CSAT_SCALE: ColorScale = { [HIGHLIGHTS_GROUPS.csat]: PALETTE.gold };
export const PRACTICE_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.practiceMinutes]: PALETTE.teal,
};

/**
 * Top orgs by completed simulations, worst-to-best left to right, plus the
 * aggregated below-floor tail so the total stays honest without naming orgs too
 * small to name (a two-learner org is two identifiable people).
 */
export function buildTopOrgBars(
  rows: TopOrgRow[],
  belowFloor?: TopOrgsBelowFloor,
): HighlightsBarDatum[] {
  const bars = rows.map(r => ({ group: r.tenantName, value: r.completedSimulations }));
  if (belowFloor && belowFloor.orgs > 0) {
    bars.push({
      group: `${belowFloor.orgs} smaller orgs`,
      value: belowFloor.completedSimulations,
    });
  }
  return bars;
}

/** Ordered learning-track funnel stages. */
export function buildTrackFunnelStages(funnel?: TrackFunnel): FunnelStage[] {
  if (!funnel) return [];
  return [
    { label: "Enrolled", reached: funnel.enrolled },
    { label: "Started", reached: funnel.started },
    { label: "Completed", reached: funnel.completed, terminal: true },
  ];
}

/* -------------------------------------------------------------------------- */
/* Unit economics                                                             */
/* -------------------------------------------------------------------------- */

/**
 * AI cost per completed simulation.
 *
 * Split from total spend: cost-per-sim runs in cents and total spend in hundreds
 * of dollars, so one shared `USD` axis flattened the per-sim line — the chart's
 * titled subject — onto the baseline. Buckets with no completed simulations have
 * a null ratio (never Infinity) and render as a gap.
 */
export function buildCostPerSimSeries(points: CostPerSimPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.costPerSim,
    key: p.bucket,
    value: p.costPerSimUsd,
  }));
}

/** Total AI spend per bucket — its own chart, its own axis. */
export function buildTotalCostSeries(points: CostPerSimPoint[]): HighlightsDatum[] {
  return points.map(p => ({
    group: HIGHLIGHTS_GROUPS.totalCost,
    key: p.bucket,
    value: p.estimatedCostUsd,
  }));
}

export const COST_PER_SIM_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.costPerSim]: PALETTE.magenta,
};
export const TOTAL_COST_SCALE: ColorScale = {
  [HIGHLIGHTS_GROUPS.totalCost]: CONTEXT.strong,
};

/** Unpriced calls across the window — the caveat on any cost figure. */
export function totalUnpricedCalls(points: CostPerSimPoint[]): number {
  return points.reduce((sum, p) => sum + p.unpricedCalls, 0);
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** Pre-formatted KPI value, or an em-dash when the metric has no value. */
export function formatKpi(
  value: number | null | undefined,
  opts: { suffix?: string; prefix?: string; decimals?: number } = {},
): string {
  if (value === null || value === undefined) return "—";
  const { suffix = "", prefix = "", decimals } = opts;
  const body =
    decimals === undefined
      ? value.toLocaleString()
      : value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return `${prefix}${body}${suffix}`;
}

/**
 * Absolute change between two windows, or null when either side is missing.
 *
 * Returned as a raw difference rather than a percentage: a percentage change on a
 * value that is itself a percentage (a success rate, a pass rate) reads as
 * percentage points to some people and relative change to others, and the
 * ambiguity is worse than the extra digit.
 */
export function delta(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  return current - previous;
}

/** Sparkline values from a series, preserving nulls as gaps. */
export function sparkValues(series: HighlightsDatum[]): (number | null)[] {
  return series.map(d => d.value);
}
