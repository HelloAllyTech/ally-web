import { describe, expect, it } from "vitest";

import {
  BugAgentPerformanceCostWeek,
  BugAgentPerformanceFoundDay,
  BugAgentPerformancePrecisionWeek,
  BugAgentPerformanceReliabilityWeek,
  BugAgentPerformanceSourceAccuracy,
  BugAgentPerformanceSpeedWeek,
  BugAgentPerformanceThroughputWeek,
} from "@types";

import {
  buildCostTrend,
  buildFoundTrend,
  buildPrecisionTrend,
  buildReliabilityTrend,
  buildSourceAccuracyBreakdown,
  buildSpeedTrend,
  buildThroughputTrend,
  foundTakeaway,
} from "../bugAgentPerformanceChart";

const precisionWeek = (
  over: Partial<BugAgentPerformancePrecisionWeek> = {},
): BugAgentPerformancePrecisionWeek => ({
  week: "2026-01-05",
  accuracy: null,
  reversalRate: null,
  filed: 0,
  judged: 0,
  ...over,
});

describe("buildPrecisionTrend", () => {
  it("emits a point for each non-null rate", () => {
    const series = buildPrecisionTrend([
      precisionWeek({ week: "2026-01-05", accuracy: 0.9, reversalRate: 0.1 }),
    ]);

    expect(series).toEqual([
      { group: "Accuracy", key: "2026-01-05", value: 0.9 },
      { group: "Reversal rate", key: "2026-01-05", value: 0.1 },
    ]);
  });

  it("omits a null rate rather than plotting a fabricated zero", () => {
    const series = buildPrecisionTrend([
      precisionWeek({ week: "2026-01-05", accuracy: null, reversalRate: 0.2 }),
    ]);

    expect(series).toEqual([{ group: "Reversal rate", key: "2026-01-05", value: 0.2 }]);
  });

  it("returns nothing for a week with no judged findings", () => {
    expect(buildPrecisionTrend([precisionWeek()])).toEqual([]);
  });
});

describe("buildSourceAccuracyBreakdown", () => {
  const source = (
    over: Partial<BugAgentPerformanceSourceAccuracy> = {},
  ): BugAgentPerformanceSourceAccuracy => ({
    source: "code_review",
    accuracy: null,
    filed: 0,
    judged: 0,
    ...over,
  });

  it("sorts worst accuracy first", () => {
    const bars = buildSourceAccuracyBreakdown([
      source({ source: "test_failure", accuracy: 0.99 }),
      source({ source: "code_review", accuracy: 0.6 }),
    ]);

    expect(bars.map(b => b.group)).toEqual(["code_review", "test_failure"]);
  });

  it("drops a finder with no judged findings rather than showing a misleading 0%", () => {
    const bars = buildSourceAccuracyBreakdown([source({ source: "lint_error", accuracy: null })]);

    expect(bars).toEqual([]);
  });
});

describe("buildThroughputTrend", () => {
  const week = (
    over: Partial<BugAgentPerformanceThroughputWeek> = {},
  ): BugAgentPerformanceThroughputWeek => ({
    week: "2026-01-05",
    approvedToMergedRate: null,
    escalationRate: null,
    fallbackRate: null,
    approved: 0,
    merged: 0,
    fixSessionRuns: 0,
    escalations: 0,
    fallbacks: 0,
    ...over,
  });

  it("emits only the rates that have a real denominator that week", () => {
    const series = buildThroughputTrend([
      week({
        week: "2026-01-05",
        approvedToMergedRate: 0.8,
        escalationRate: null,
        fallbackRate: 0.1,
      }),
    ]);

    expect(series).toEqual([
      { group: "Approved → merged", key: "2026-01-05", value: 0.8 },
      { group: "Fallback rate", key: "2026-01-05", value: 0.1 },
    ]);
  });
});

describe("buildSpeedTrend", () => {
  const week = (
    over: Partial<BugAgentPerformanceSpeedWeek> = {},
  ): BugAgentPerformanceSpeedWeek => ({
    week: "2026-01-05",
    filedToDecidedMedianHours: null,
    filedToMergedMedianHours: null,
    mergedToReleasedMedianHours: null,
    queueToStartMedianHours: null,
    ...over,
  });

  it("plots queue-to-start on its own when no findings have reached a later stage yet", () => {
    const series = buildSpeedTrend([week({ week: "2026-01-05", queueToStartMedianHours: 0.5 })]);

    expect(series).toEqual([{ group: "Queue → start", key: "2026-01-05", value: 0.5 }]);
  });
});

describe("buildCostTrend", () => {
  const week = (over: Partial<BugAgentPerformanceCostWeek> = {}): BugAgentPerformanceCostWeek => ({
    week: "2026-01-05",
    totalUsd: 0,
    costPerMergedFixUsd: null,
    merged: 0,
    ...over,
  });

  it("plots a real $0 week rather than omitting it — cost is always a real sum, never unmeasured", () => {
    const series = buildCostTrend([week({ week: "2026-01-05", totalUsd: 0 })]);

    expect(series).toEqual([{ group: "Total spend (USD)", key: "2026-01-05", value: 0 }]);
  });
});

describe("buildReliabilityTrend", () => {
  const week = (
    over: Partial<BugAgentPerformanceReliabilityWeek> = {},
  ): BugAgentPerformanceReliabilityWeek => ({
    week: "2026-01-05",
    completionRate: null,
    fallbackRate: null,
    regressionRate: null,
    runs: 0,
    completed: 0,
    failed: 0,
    ...over,
  });

  it("emits completion rate without the other two when nothing merged or fell back yet", () => {
    const series = buildReliabilityTrend([week({ week: "2026-01-05", completionRate: 1 })]);

    expect(series).toEqual([{ group: "Completion rate", key: "2026-01-05", value: 1 }]);
  });
});

describe("buildFoundTrend", () => {
  const day = (over: Partial<BugAgentPerformanceFoundDay> = {}): BugAgentPerformanceFoundDay => ({
    day: "2026-01-05",
    filed: 0,
    rollingAvg7: null,
    ...over,
  });

  /** A quiet night is a real zero and is plotted — those are the days that prove a decline. */
  it("plots every day's count, zeros included, and the mean only where it exists", () => {
    expect(
      buildFoundTrend([
        day({ day: "2026-01-05", filed: 0 }),
        day({ day: "2026-01-11", filed: 3, rollingAvg7: 2.5 }),
      ]),
    ).toEqual([
      { group: "Bugs found", key: "2026-01-05", value: 0 },
      { group: "Bugs found", key: "2026-01-11", value: 3 },
      { group: "7-day average", key: "2026-01-11", value: 2.5 },
    ]);
  });
});

describe("foundTakeaway", () => {
  const series = (counts: number[]): BugAgentPerformanceFoundDay[] =>
    counts.map((filed, index) => ({
      day: `2026-01-${String(index + 1).padStart(2, "0")}`,
      filed,
      rollingAvg7: null,
    }));

  it("says nothing until there are two full weeks to compare", () => {
    expect(foundTakeaway(series(Array(13).fill(5)))).toBeUndefined();
  });

  it("states the recent rate and the change on the week before", () => {
    expect(foundTakeaway(series([...Array(7).fill(10), ...Array(7).fill(6)]))).toBe(
      "6.0 bugs/day over the last 7 days · down 40% on the week before (10.0/day)",
    );
    expect(foundTakeaway(series([...Array(7).fill(4), ...Array(7).fill(5)]))).toBe(
      "5.0 bugs/day over the last 7 days · up 25% on the week before (4.0/day)",
    );
  });

  it("calls a matching week flat rather than 'down 0%'", () => {
    expect(foundTakeaway(series(Array(14).fill(3)))).toBe(
      "3.0 bugs/day over the last 7 days · flat on the week before",
    );
  });

  it("does not divide by a quiet week", () => {
    expect(foundTakeaway(series([...Array(7).fill(0), ...Array(7).fill(2)]))).toBe(
      "2.0 bugs/day over the last 7 days · nothing was found the week before",
    );
    expect(foundTakeaway(series(Array(14).fill(0)))).toBe("Nothing found in the last 14 days");
  });

  it("compares only the last two weeks of a longer window", () => {
    expect(
      foundTakeaway(series([...Array(10).fill(99), ...Array(7).fill(8), ...Array(7).fill(4)])),
    ).toBe("4.0 bugs/day over the last 7 days · down 50% on the week before (8.0/day)");
  });
});
