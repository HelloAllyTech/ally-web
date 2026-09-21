import {
  BugAgentPerformanceCostWeek,
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
