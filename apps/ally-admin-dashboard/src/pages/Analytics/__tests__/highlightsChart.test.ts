import { describe, expect, it } from "vitest";

import { CostPerSimPoint, CsatTrendPoint, PracticeMinutesPoint, QualityTrendPoint } from "@types";

import {
  buildCostPerSimSeries,
  buildCsatTrendSeries,
  buildPracticeMinutesSeries,
  buildQualityTrendSeries,
  buildTopOrgBars,
  buildTrackFunnelRows,
  formatKpi,
  HIGHLIGHTS_GROUPS,
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
  it("plots every bucket, including gap-filled zeros", () => {
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

describe("buildQualityTrendSeries", () => {
  it("drops null-average buckets so the line gaps instead of plotting zero", () => {
    const series = buildQualityTrendSeries([
      qualityPoint({ bucket: "2024-06-10", avgCompositeScore: 82.5, evaluatedSessions: 4 }),
      qualityPoint({ bucket: "2024-06-11" }),
      qualityPoint({ bucket: "2024-06-12", avgCompositeScore: 0, evaluatedSessions: 1 }),
    ]);

    expect(series).toEqual([
      { group: HIGHLIGHTS_GROUPS.qualityScore, key: "2024-06-10", value: 82.5 },
      // A genuine 0 average is data, not a gap — it must survive the filter.
      { group: HIGHLIGHTS_GROUPS.qualityScore, key: "2024-06-12", value: 0 },
    ]);
  });
});

describe("buildCsatTrendSeries", () => {
  it("drops null-rating buckets and keeps real ratings", () => {
    const series = buildCsatTrendSeries([
      csatPoint({ bucket: "2024-06-10", avgRating: 4.25, responses: 8 }),
      csatPoint({ bucket: "2024-06-11" }),
    ]);

    expect(series).toEqual([{ group: HIGHLIGHTS_GROUPS.csat, key: "2024-06-10", value: 4.25 }]);
  });
});

describe("buildTopOrgBars", () => {
  it("maps orgs to bars keyed by tenant name", () => {
    expect(
      buildTopOrgBars([
        { tenantId: "abc", tenantName: "Acme Health", completedSimulations: 12 },
        { tenantId: "ally", tenantName: "ally", completedSimulations: 3 },
      ]),
    ).toEqual([
      { group: "Acme Health", value: 12 },
      // Unresolvable tenants fall back to the raw id as the label.
      { group: "ally", value: 3 },
    ]);
  });

  it("returns nothing for an empty list", () => {
    expect(buildTopOrgBars([])).toEqual([]);
  });
});

describe("buildTrackFunnelRows", () => {
  it("emits the three phases in funnel order", () => {
    expect(
      buildTrackFunnelRows({
        enrolled: 10,
        started: 7,
        completed: 3,
        quizAttempts: 5,
        quizPassed: 4,
        quizPassRatePct: 80,
      }),
    ).toEqual([
      { phase: "Enrolled", reached: 10 },
      { phase: "Started", reached: 7 },
      { phase: "Completed", reached: 3 },
    ]);
  });

  it("returns nothing when the funnel is missing", () => {
    expect(buildTrackFunnelRows(undefined)).toEqual([]);
  });
});

describe("buildCostPerSimSeries", () => {
  it("emits both lines when the bucket had completed simulations", () => {
    const series = buildCostPerSimSeries([
      costPoint({ estimatedCostUsd: 10, completedSimulations: 4, costPerSimUsd: 2.5 }),
    ]);

    expect(series).toEqual([
      { group: HIGHLIGHTS_GROUPS.costPerSim, key: "2024-06-10", value: 2.5 },
      { group: HIGHLIGHTS_GROUPS.totalCost, key: "2024-06-10", value: 10 },
    ]);
  });

  it("plots only total cost when the ratio is null (no completed sims)", () => {
    const series = buildCostPerSimSeries([costPoint({ estimatedCostUsd: 10 })]);

    expect(series).toEqual([{ group: HIGHLIGHTS_GROUPS.totalCost, key: "2024-06-10", value: 10 }]);
  });
});

describe("formatKpi", () => {
  it("renders an em-dash for null and undefined", () => {
    expect(formatKpi(null)).toBe("—");
    expect(formatKpi(undefined)).toBe("—");
  });

  it("keeps a real zero as a number, not an em-dash", () => {
    expect(formatKpi(0)).toBe("0");
  });

  it("applies prefix, suffix and fixed decimals", () => {
    expect(formatKpi(4.5, { suffix: "%" })).toBe("4.5%");
    expect(formatKpi(2.5, { prefix: "$", decimals: 2 })).toBe("$2.50");
    expect(formatKpi(82, { decimals: 1 })).toBe("82.0");
  });
});
