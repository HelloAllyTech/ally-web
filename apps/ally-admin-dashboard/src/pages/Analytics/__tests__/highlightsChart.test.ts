import { describe, expect, it } from "vitest";

import {
  CostPerSimPoint,
  CsatTrendPoint,
  PracticeMinutesPoint,
  QualityTrendPoint,
  UsersByRolePoint,
} from "@types";

import {
  HIGHLIGHTS_GROUPS,
  buildCostPerSimSeries,
  buildCsatTrendSeries,
  buildPracticeMinutesSeries,
  buildQualityTrendSeries,
  buildRoleBars,
  buildSimulationsSeries,
  buildTopOrgBars,
  buildTotalCostSeries,
  buildTrackFunnelStages,
  delta,
  formatKpi,
  sparkValues,
  totalUnpricedCalls,
} from "../highlightsChart";

const practicePoint = (over: Partial<PracticeMinutesPoint> = {}): PracticeMinutesPoint => ({
  bucket: "2024-06-10",
  minutes: 0,
  activeLearners: 0,
  ...over,
});

const qualityPoint = (over: Partial<QualityTrendPoint> = {}): QualityTrendPoint => ({
  bucket: "2024-06-10",
  avgCompositeScore: null,
  evaluatedSessions: 0,
  ...over,
});

const csatPoint = (over: Partial<CsatTrendPoint> = {}): CsatTrendPoint => ({
  bucket: "2024-06-10",
  avgRating: null,
  responses: 0,
  ...over,
});

const costPoint = (over: Partial<CostPerSimPoint> = {}): CostPerSimPoint => ({
  bucket: "2024-06-10",
  estimatedCostUsd: 0,
  completedSimulations: 0,
  costPerSimUsd: null,
  unpricedCalls: 0,
  ...over,
});

describe("buildPracticeMinutesSeries", () => {
  it("plots every bucket, including gap-filled zeros (a real 'nobody practised')", () => {
    const series = buildPracticeMinutesSeries([
      practicePoint({ bucket: "2024-06-10", minutes: 42.5 }),
      practicePoint({ bucket: "2024-06-11", minutes: 0 }),
    ]);

    expect(series).toEqual([
      { group: HIGHLIGHTS_GROUPS.practiceMinutes, key: "2024-06-10", value: 42.5 },
      { group: HIGHLIGHTS_GROUPS.practiceMinutes, key: "2024-06-11", value: 0 },
    ]);
  });

  it("returns nothing for an empty series", () => {
    expect(buildPracticeMinutesSeries([])).toEqual([]);
  });
});

describe("average trends preserve gaps", () => {
  it("emits null (not a dropped point) for a bucket with no evaluated sessions", () => {
    // Dropping the point let the line close the gap invisibly, so a period with
    // no evaluations looked like a smooth trend across it. A null renders as a
    // visible break.
    const series = buildQualityTrendSeries([
      qualityPoint({ bucket: "2024-06-10", avgCompositeScore: 82.5, evaluatedSessions: 4 }),
      qualityPoint({ bucket: "2024-06-11", avgCompositeScore: null }),
      qualityPoint({ bucket: "2024-06-12", avgCompositeScore: 79, evaluatedSessions: 6 }),
    ]);

    expect(series.map(d => d.value)).toEqual([82.5, null, 79]);
    expect(series).toHaveLength(3);
  });

  it("does the same for the CSAT trend", () => {
    const series = buildCsatTrendSeries([
      csatPoint({ avgRating: 4.25, responses: 8 }),
      csatPoint({ bucket: "2024-06-11", avgRating: null }),
    ]);

    expect(series.map(d => d.value)).toEqual([4.25, null]);
  });

  it("never fabricates a zero for a missing average", () => {
    const series = buildQualityTrendSeries([qualityPoint({ avgCompositeScore: null })]);

    expect(series[0].value).toBeNull();
    expect(series[0].value).not.toBe(0);
  });
});

describe("cost series are split by magnitude", () => {
  const points = [
    costPoint({ bucket: "2024-06-10", estimatedCostUsd: 120, costPerSimUsd: 0.4 }),
    costPoint({ bucket: "2024-06-11", estimatedCostUsd: 90, costPerSimUsd: null }),
  ];

  it("keeps cost-per-sim on its own series, gapping unmeasured buckets", () => {
    expect(buildCostPerSimSeries(points)).toEqual([
      { group: HIGHLIGHTS_GROUPS.costPerSim, key: "2024-06-10", value: 0.4 },
      { group: HIGHLIGHTS_GROUPS.costPerSim, key: "2024-06-11", value: null },
    ]);
  });

  it("keeps total spend on a separate series so it cannot flatten the ratio", () => {
    const total = buildTotalCostSeries(points);

    expect(new Set(total.map(d => d.group))).toEqual(new Set([HIGHLIGHTS_GROUPS.totalCost]));
    expect(total.map(d => d.value)).toEqual([120, 90]);
  });

  it("totals unpriced calls so the cost figure can be caveated", () => {
    expect(
      totalUnpricedCalls([costPoint({ unpricedCalls: 7 }), costPoint({ unpricedCalls: 3 })]),
    ).toBe(10);
  });
});

describe("buildSimulationsSeries", () => {
  it("keys each point by its PERIOD, not by a constant series label", () => {
    // The x-axis maps to `key`. If the period lived in `group` instead, every
    // week would collapse onto a single bar — which is what used to happen.
    const series = buildSimulationsSeries([
      { weekStart: "2024-06-03", count: 4 },
      { weekStart: "2024-06-10", count: 9 },
    ]);

    expect(series.map(d => d.key)).toEqual(["2024-06-03", "2024-06-10"]);
    expect(new Set(series.map(d => d.group)).size).toBe(1);
  });
});

describe("buildRoleBars", () => {
  const role = (r: string, count: number): UsersByRolePoint => ({ role: r, count });

  it("sorts descending, humanises enum labels and groups the tail as Other", () => {
    const { bars, otherRoles } = buildRoleBars(
      [
        role("LEARNER", 100),
        role("SUPER_ADMIN", 2),
        role("ADMIN", 30),
        role("COUNSELLOR", 50),
        role("REVIEWER", 5),
        role("TRAINER", 3),
      ],
      4,
    );

    expect(bars.slice(0, 4)).toEqual([
      { group: "Learner", value: 100 },
      { group: "Counsellor", value: 50 },
      { group: "Admin", value: 30 },
      { group: "Reviewer", value: 5 },
    ]);
    // Past the top few, slices and colours stop being distinguishable — the tail
    // becomes one bar rather than an unbounded rainbow.
    expect(bars[4]).toEqual({ group: "Other (2 roles)", value: 5 });
    expect(otherRoles).toBe(2);
  });

  it("adds no Other bar when everything fits", () => {
    const { bars, otherRoles } = buildRoleBars([role("LEARNER", 3)], 4);

    expect(bars).toHaveLength(1);
    expect(otherRoles).toBe(0);
  });
});

describe("buildTopOrgBars", () => {
  const rows = [
    { tenantId: "t1", tenantName: "Big Org", completedSimulations: 40 },
    { tenantId: "t2", tenantName: "Mid Org", completedSimulations: 12 },
  ];

  it("appends the unnamed below-floor tail so the total stays honest", () => {
    expect(buildTopOrgBars(rows, { orgs: 6, completedSimulations: 11 })).toEqual([
      { group: "Big Org", value: 40 },
      { group: "Mid Org", value: 12 },
      { group: "6 smaller orgs", value: 11 },
    ]);
  });

  it("omits the tail bar when every org cleared the floor", () => {
    expect(buildTopOrgBars(rows, { orgs: 0, completedSimulations: 0 })).toHaveLength(2);
  });

  it("works with no below-floor data at all", () => {
    expect(buildTopOrgBars(rows)).toHaveLength(2);
  });
});

describe("buildTrackFunnelStages", () => {
  it("returns ordered stages and marks the terminal one", () => {
    const stages = buildTrackFunnelStages({
      enrolled: 100,
      started: 60,
      completed: 25,
      quizAttempts: 40,
      quizPassed: 30,
      quizPassRatePct: 75,
    });

    expect(stages.map(s => [s.label, s.reached])).toEqual([
      ["Enrolled", 100],
      ["Started", 60],
      ["Completed", 25],
    ]);
    expect(stages[2].terminal).toBe(true);
  });

  it("returns nothing when there is no funnel", () => {
    expect(buildTrackFunnelStages(undefined)).toEqual([]);
  });
});

describe("delta", () => {
  it("is the raw difference between the two windows", () => {
    expect(delta(120, 100)).toBe(20);
    expect(delta(80, 100)).toBe(-20);
  });

  it("is null when either side is missing, so no change is claimed", () => {
    expect(delta(100, null)).toBeNull();
    expect(delta(null, 100)).toBeNull();
    expect(delta(100, undefined)).toBeNull();
  });
});

describe("sparkValues", () => {
  it("preserves nulls so a sparkline gap stays a gap", () => {
    expect(
      sparkValues([
        { group: "g", key: "a", value: 1 },
        { group: "g", key: "b", value: null },
        { group: "g", key: "c", value: 3 },
      ]),
    ).toEqual([1, null, 3]);
  });
});

describe("formatKpi", () => {
  it("renders an em-dash for a missing value rather than a zero", () => {
    expect(formatKpi(null)).toBe("—");
    expect(formatKpi(undefined)).toBe("—");
    expect(formatKpi(0)).toBe("0");
  });

  it("applies prefix, suffix and fixed decimals", () => {
    expect(formatKpi(1234.5, { prefix: "$", decimals: 2 })).toBe("$1,234.50");
    expect(formatKpi(92.5, { suffix: "%" })).toBe("92.5%");
  });
});
