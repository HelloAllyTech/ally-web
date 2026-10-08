import {
  BugAgentPerformanceCostWeek,
  BugAgentPerformanceFoundDay,
  BugAgentPerformanceGoalWeek,
  BugAgentPerformanceGoalWindow,
  BugAgentPerformancePrecisionWeek,
  BugAgentPerformanceReliabilityWeek,
  BugAgentPerformanceSourceAccuracy,
  BugAgentPerformanceSpeedWeek,
  BugAgentPerformanceThroughputWeek,
} from "@types";

import { ColorScale, PALETTE } from "./chartScales";

export type WeeklyDatum = { group: string; key: string; value: number };

const PRECISION_GROUPS = { accuracy: "Accuracy", reversalRate: "Reversal rate" };
export const PRECISION_SCALE: ColorScale = {
  [PRECISION_GROUPS.accuracy]: PALETTE.blue,
  [PRECISION_GROUPS.reversalRate]: PALETTE.gold,
};

/**
 * Accuracy and reversal rate, one line each. Weeks where the rate is null
 * (nothing judged yet, or — for reversal rate — too little time has passed
 * for a reversal to be provable) are OMITTED from that line rather than
 * plotted as 0, matching `buildVoiceLatencySeries`'s own convention: a rate
 * with no denominator has no meaningful zero.
 */
export function buildPrecisionTrend(weekly: BugAgentPerformancePrecisionWeek[]): WeeklyDatum[] {
  return weekly.flatMap(w => [
    ...(w.accuracy == null
      ? []
      : [{ group: PRECISION_GROUPS.accuracy, key: w.week, value: w.accuracy }]),
    ...(w.reversalRate == null
      ? []
      : [{ group: PRECISION_GROUPS.reversalRate, key: w.week, value: w.reversalRate }]),
  ]);
}

export type SourceAccuracyDatum = { group: string; value: number };

/** Whole-window accuracy by finder — bars, not a trend; sorted worst-first so the finder most worth attention leads. */
export function buildSourceAccuracyBreakdown(
  bySource: BugAgentPerformanceSourceAccuracy[],
): SourceAccuracyDatum[] {
  return bySource
    .filter(r => r.accuracy != null)
    .map(r => ({ group: r.source, value: r.accuracy as number }))
    .sort((a, b) => a.value - b.value);
}

const THROUGHPUT_GROUPS = {
  approvedToMerged: "Approved → merged",
  escalation: "Escalation rate",
  fallback: "Fallback rate",
};
export const THROUGHPUT_SCALE: ColorScale = {
  [THROUGHPUT_GROUPS.approvedToMerged]: PALETTE.green,
  [THROUGHPUT_GROUPS.escalation]: PALETTE.orange,
  [THROUGHPUT_GROUPS.fallback]: PALETTE.magenta,
};

export function buildThroughputTrend(weekly: BugAgentPerformanceThroughputWeek[]): WeeklyDatum[] {
  return weekly.flatMap(w => [
    ...(w.approvedToMergedRate == null
      ? []
      : [
          { group: THROUGHPUT_GROUPS.approvedToMerged, key: w.week, value: w.approvedToMergedRate },
        ]),
    ...(w.escalationRate == null
      ? []
      : [{ group: THROUGHPUT_GROUPS.escalation, key: w.week, value: w.escalationRate }]),
    ...(w.fallbackRate == null
      ? []
      : [{ group: THROUGHPUT_GROUPS.fallback, key: w.week, value: w.fallbackRate }]),
  ]);
}

const SPEED_GROUPS = {
  filedToDecided: "Filed → decided",
  filedToMerged: "Filed → merged",
  mergedToReleased: "Merged → released",
  queueToStart: "Queue → start",
};
export const SPEED_SCALE: ColorScale = {
  [SPEED_GROUPS.filedToDecided]: PALETTE.cyan,
  [SPEED_GROUPS.filedToMerged]: PALETTE.blue,
  [SPEED_GROUPS.mergedToReleased]: PALETTE.indigo,
  [SPEED_GROUPS.queueToStart]: PALETTE.teal,
};

/**
 * Four median-hour lines. `queueToStart` isolates runner/queue delay from
 * actual fix time — the other three, `filedToMerged` cannot distinguish on
 * its own.
 */
export function buildSpeedTrend(weekly: BugAgentPerformanceSpeedWeek[]): WeeklyDatum[] {
  return weekly.flatMap(w => [
    ...(w.filedToDecidedMedianHours == null
      ? []
      : [{ group: SPEED_GROUPS.filedToDecided, key: w.week, value: w.filedToDecidedMedianHours }]),
    ...(w.filedToMergedMedianHours == null
      ? []
      : [{ group: SPEED_GROUPS.filedToMerged, key: w.week, value: w.filedToMergedMedianHours }]),
    ...(w.mergedToReleasedMedianHours == null
      ? []
      : [
          {
            group: SPEED_GROUPS.mergedToReleased,
            key: w.week,
            value: w.mergedToReleasedMedianHours,
          },
        ]),
    ...(w.queueToStartMedianHours == null
      ? []
      : [{ group: SPEED_GROUPS.queueToStart, key: w.week, value: w.queueToStartMedianHours }]),
  ]);
}

const COST_GROUP = "Total spend (USD)";
export const COST_SCALE: ColorScale = { [COST_GROUP]: PALETTE.purple };

/** Total weekly spend is a real sum, never null — a quiet week is a real $0. */
export function buildCostTrend(weekly: BugAgentPerformanceCostWeek[]): WeeklyDatum[] {
  return weekly.map(w => ({ group: COST_GROUP, key: w.week, value: w.totalUsd }));
}

const RELIABILITY_GROUPS = {
  completion: "Completion rate",
  fallback: "Fallback rate",
  regression: "Regression rate",
};
export const RELIABILITY_SCALE: ColorScale = {
  [RELIABILITY_GROUPS.completion]: PALETTE.green,
  [RELIABILITY_GROUPS.fallback]: PALETTE.magenta,
  [RELIABILITY_GROUPS.regression]: PALETTE.darkRed,
};

export function buildReliabilityTrend(weekly: BugAgentPerformanceReliabilityWeek[]): WeeklyDatum[] {
  return weekly.flatMap(w => [
    ...(w.completionRate == null
      ? []
      : [{ group: RELIABILITY_GROUPS.completion, key: w.week, value: w.completionRate }]),
    ...(w.fallbackRate == null
      ? []
      : [{ group: RELIABILITY_GROUPS.fallback, key: w.week, value: w.fallbackRate }]),
    ...(w.regressionRate == null
      ? []
      : [{ group: RELIABILITY_GROUPS.regression, key: w.week, value: w.regressionRate }]),
  ]);
}

const FOUND_GROUPS = { daily: "Bugs found", rolling: "7-day average" };
export const FOUND_SCALE: ColorScale = {
  [FOUND_GROUPS.daily]: PALETTE.lightBlue,
  [FOUND_GROUPS.rolling]: PALETTE.purple,
};

/**
 * Bugs found per day across every repo, plus the trailing seven-day mean.
 *
 * The raw count is a real series — a quiet night is a real 0 and is plotted,
 * since the whole point of this chart is to watch the count fall and a line
 * that skipped zeros would hide exactly the days that prove it. The mean is
 * null until seven days exist and is omitted there rather than plotted as 0,
 * same convention as every other null rate on this tab. Both are counts on
 * one axis; the mean is the line a reader judges the trend from, the daily
 * bars-as-line are the spiky truth under it.
 */
export function buildFoundTrend(days: BugAgentPerformanceFoundDay[]): WeeklyDatum[] {
  return days.flatMap(d => [
    { group: FOUND_GROUPS.daily, key: d.day, value: d.filed },
    ...(d.rollingAvg7 == null
      ? []
      : [{ group: FOUND_GROUPS.rolling, key: d.day, value: d.rollingAvg7 }]),
  ]);
}

/** Days each side of the comparison `foundTakeaway` makes. */
export const FOUND_COMPARE_DAYS = 7;

/**
 * The sentence the chart exists to let someone say: "N/day over the last
 * week, down X% on the week before". Undefined until there are two full
 * weeks to compare — a trend claimed from less would be noise with a sign.
 * "Flat" rather than "down 0%" when the two weeks match, and it is the raw
 * daily counts that are compared, not the smoothed line, so the figure is
 * reproducible from the table.
 */
export const foundTakeaway = (days: BugAgentPerformanceFoundDay[]): string | undefined => {
  if (days.length < FOUND_COMPARE_DAYS * 2) return undefined;
  const recent = days.slice(-FOUND_COMPARE_DAYS);
  const before = days.slice(-FOUND_COMPARE_DAYS * 2, -FOUND_COMPARE_DAYS);
  const mean = (rows: BugAgentPerformanceFoundDay[]) =>
    rows.reduce((sum, d) => sum + d.filed, 0) / rows.length;
  const recentMean = mean(recent);
  const beforeMean = mean(before);
  const perDay = `${recentMean.toFixed(1)} bugs/day over the last ${FOUND_COMPARE_DAYS} days`;
  if (beforeMean === 0) {
    return recentMean === 0
      ? `Nothing found in the last ${FOUND_COMPARE_DAYS * 2} days`
      : `${perDay} · nothing was found the week before`;
  }
  const change = (recentMean - beforeMean) / beforeMean;
  if (Math.abs(change) < 0.005) return `${perDay} · flat on the week before`;
  const direction = change < 0 ? "down" : "up";
  return `${perDay} · ${direction} ${Math.round(Math.abs(change) * 100)}% on the week before (${beforeMean.toFixed(1)}/day)`;
};

/* ── the goal: finding bugs before people do (OPP-0778) ─────────────────── */

export const GOAL_FIRST_FINDER_GROUP = "Found by Bug Hunter first";
export const GOAL_ESCAPE_GROUP = "Escaped a recent sweep";

export const GOAL_SCALE: ColorScale = {
  [GOAL_FIRST_FINDER_GROUP]: PALETTE.green,
  [GOAL_ESCAPE_GROUP]: PALETTE.red,
};

/** Two rates per week: the share of real bugs Bug Hunter found first, and the share of human reports that got past a sweep. Weeks with nothing to rate are left out of that line. */
export function buildGoalTrend(weekly: BugAgentPerformanceGoalWeek[]): WeeklyDatum[] {
  const out: WeeklyDatum[] = [];
  for (const w of weekly) {
    if (w.firstFinderShare != null)
      out.push({ group: GOAL_FIRST_FINDER_GROUP, key: w.week, value: w.firstFinderShare });
    if (w.escapeRate != null)
      out.push({ group: GOAL_ESCAPE_GROUP, key: w.week, value: w.escapeRate });
  }
  return out;
}

/** The miss reasons, in the words the drawer uses, worst first. */
export const MISS_REASON_LABELS: Record<string, string> = {
  no_sense: "No sense could see it",
  sense_missed: "A sense missed it",
  detected_declined: "Found, then turned down",
  detected_not_fixed: "Found, not fixed in time",
  not_a_miss: "Not a miss",
  unclassified: "Not classified yet",
};

export type MissReasonDatum = { group: string; value: number };

export function buildMissReasons(reasons: Record<string, number>): MissReasonDatum[] {
  return Object.entries(reasons)
    .filter(([, value]) => value > 0)
    .map(([reason, value]) => ({ group: MISS_REASON_LABELS[reason] ?? reason, value }))
    .sort((a, b) => b.value - a.value);
}

/** One sentence under the goal chart: the window's share, its escapes, and the median time to fix. */
export const goalTakeaway = (
  window: BugAgentPerformanceGoalWindow | undefined,
): string | undefined => {
  if (!window) return undefined;
  const total = window.agentBugs + window.humanReports;
  if (total === 0) return "No real bugs found by anyone in this window.";
  const share =
    window.firstFinderShare == null ? "—" : `${Math.round(window.firstFinderShare * 100)}%`;
  const fix =
    window.timeToFixHoursMedian == null
      ? "no fix merged yet"
      : window.timeToFixHoursMedian < 48
        ? `median ${Math.round(window.timeToFixHoursMedian)} h from filing to merge`
        : `median ${Math.round(window.timeToFixHoursMedian / 24)} days from filing to merge`;
  return `Bug Hunter found ${window.agentBugs} of ${total} real bugs first (${share}); people reported ${window.humanReports}, of which ${window.escapes} had slipped past a sweep in the week before; ${fix}.`;
};
