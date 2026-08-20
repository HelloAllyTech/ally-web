import { describe, expect, it } from "vitest";

import {
  OrgEngagementResponse,
  StickinessResponse,
  UsageLadderResponse,
} from "@types";

import {
  buildAttainmentSeries,
  buildCumulativeLadderSeries,
  buildLadderFunnelStages,
  buildOrgActivitySeries,
  buildOrgFunnelStages,
  buildStickinessStages,
  hasLadderData,
  periodLabel,
  stickinessPlateau,
} from "../ladderChart";

const LEVELS = [
  { id: "L1", label: "L1 · 1 hour", minMinutes: 60 },
  { id: "L2", label: "L2 · 5 hours", minMinutes: 300 },
];

const ladder = (overrides: Partial<UsageLadderResponse> = {}): UsageLadderResponse => ({
  grain: "month",
  levels: LEVELS,
  periods: [],
  currentPeriod: "2024-06-01",
  funnel: [],
  accounts: 0,
  certificationMinMinutes: 5000,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T00:00:00.000Z",
  ...overrides,
});

describe("periodLabel", () => {
  it("names a month", () => {
    expect(periodLabel("2024-04-01", "month")).toBe("Apr 2024");
  });

  it("names a quarter by its number, not its first month", () => {
    expect(periodLabel("2024-04-01", "quarter")).toBe("Q2 2024");
    expect(periodLabel("2024-01-01", "quarter")).toBe("Q1 2024");
    expect(periodLabel("2024-10-01", "quarter")).toBe("Q4 2024");
  });

  it("passes an unparseable value through rather than rendering Invalid Date", () => {
    expect(periodLabel("not-a-date", "month")).toBe("not-a-date");
  });
});

describe("buildAttainmentSeries", () => {
  it("emits one datum per (level, period)", () => {
    const series = buildAttainmentSeries(
      ladder({
        periods: [
          {
            period: "2024-04-01",
            newlyReached: [3, 1],
            cumulative: [3, 1],
            partial: false,
          },
        ],
      }),
    );

    expect(series).toEqual([
      { group: "L1 · 1 hour", key: "Apr 2024", value: 3 },
      { group: "L2 · 5 hours", key: "Apr 2024", value: 1 },
    ]);
  });

  it("drops the still-accruing period, which could only draw as a fall", () => {
    const series = buildAttainmentSeries(
      ladder({
        periods: [
          { period: "2024-05-01", newlyReached: [4, 0], cumulative: [4, 0], partial: false },
          { period: "2024-06-01", newlyReached: [1, 0], cumulative: [5, 0], partial: true },
        ],
      }),
    );

    expect(series.map(d => d.key)).toEqual(["May 2024", "May 2024"]);
  });

  it("is empty without a response, rather than throwing", () => {
    expect(buildAttainmentSeries(undefined)).toEqual([]);
  });
});

describe("buildCumulativeLadderSeries", () => {
  it("reads the cumulative field, not the flow", () => {
    const series = buildCumulativeLadderSeries(
      ladder({
        periods: [
          { period: "2024-04-01", newlyReached: [3, 1], cumulative: [10, 4], partial: false },
        ],
      }),
    );

    expect(series.map(d => d.value)).toEqual([10, 4]);
  });
});

describe("buildLadderFunnelStages", () => {
  it("carries the SERVER's shares, including suppressed nulls", () => {
    const stages = buildLadderFunnelStages(
      ladder({
        funnel: [
          {
            id: "accounts",
            label: "Account created",
            learners: 4,
            ofPreviousPct: null,
            ofTopPct: null,
          },
          {
            id: "L1",
            label: "L1 · 1 hour",
            learners: 2,
            ofPreviousPct: null,
            ofTopPct: null,
          },
        ],
      }),
    );

    // Both nulls must survive: FunnelBars falls back to computing shares from
    // the counts unless it sees explicit values, and computing them here would
    // undo the server's minimum-group-size suppression.
    expect(stages).toEqual([
      { label: "Account created", reached: 4, ofEnteredPct: null, ofPreviousPct: null },
      { label: "L1 · 1 hour", reached: 2, ofEnteredPct: null, ofPreviousPct: null },
    ]);
  });

  it("passes real shares through unchanged", () => {
    const stages = buildLadderFunnelStages(
      ladder({
        funnel: [
          {
            id: "accounts",
            label: "Account created",
            learners: 200,
            ofPreviousPct: null,
            ofTopPct: 100,
          },
          {
            id: "L1",
            label: "L1 · 1 hour",
            learners: 50,
            ofPreviousPct: 25,
            ofTopPct: 25,
          },
        ],
      }),
    );

    expect(stages[1]).toEqual({
      label: "L1 · 1 hour",
      reached: 50,
      ofEnteredPct: 25,
      ofPreviousPct: 25,
    });
  });
});

describe("hasLadderData", () => {
  it("is false for a gap-filled axis of zeros", () => {
    expect(
      hasLadderData(
        ladder({
          periods: [
            { period: "2024-05-01", newlyReached: [0, 0], cumulative: [0, 0], partial: false },
            { period: "2024-06-01", newlyReached: [0, 0], cumulative: [0, 0], partial: true },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("is true once anybody holds a rung", () => {
    expect(
      hasLadderData(
        ladder({
          periods: [
            { period: "2024-05-01", newlyReached: [0, 0], cumulative: [1, 0], partial: false },
          ],
        }),
      ),
    ).toBe(true);
  });
});

const stickiness = (
  overrides: Partial<StickinessResponse> = {},
): StickinessResponse => ({
  qualifyingMinutes: 5,
  steps: [],
  beyondLastStep: 0,
  medianActiveDays: null,
  minPopulation: 5,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T00:00:00.000Z",
  ...overrides,
});

const step = (n: number, learners: number, ofTopPct: number | null) => ({
  step: n,
  label: n === 1 ? "Practised once" : `Came back ${n - 1} times`,
  learners,
  ofPreviousPct: null,
  ofTopPct,
});

describe("stickinessPlateau", () => {
  it("finds the deepest step still holding the threshold", () => {
    const result = stickinessPlateau(
      stickiness({
        steps: [step(1, 100, 100), step(2, 60, 60), step(3, 30, 30), step(4, 10, 10)],
      }),
      25,
    );

    expect(result).toEqual({ step: 3, pct: 30 });
  });

  it("stops at the first step below the threshold, not the last", () => {
    // A late step back above the threshold cannot happen in a nested funnel, but
    // if it did, reporting it would claim a plateau that the curve does not have.
    const result = stickinessPlateau(
      stickiness({ steps: [step(1, 100, 100), step(2, 10, 10), step(3, 90, 90)] }),
      25,
    );

    expect(result).toEqual({ step: 1, pct: 100 });
  });

  it("is null when shares are suppressed", () => {
    expect(
      stickinessPlateau(stickiness({ steps: [step(1, 4, null), step(2, 2, null)] })),
    ).toBeNull();
  });

  it("is null on an empty platform", () => {
    expect(stickinessPlateau(stickiness())).toBeNull();
    expect(stickinessPlateau(undefined)).toBeNull();
  });
});

describe("buildStickinessStages", () => {
  it("maps to FunnelBars rows with the server's shares", () => {
    const stages = buildStickinessStages(
      stickiness({ steps: [step(1, 100, 100), step(2, 67, 67)] }),
    );

    expect(stages).toEqual([
      { label: "Practised once", reached: 100, ofEnteredPct: 100, ofPreviousPct: null },
      { label: "Came back 1 times", reached: 67, ofEnteredPct: 67, ofPreviousPct: null },
    ]);
  });
});

const orgs = (overrides: Partial<OrgEngagementResponse> = {}): OrgEngagementResponse => ({
  levels: [{ id: "L1", label: "L1 · 500 min", minMinutes: 500 }],
  funnel: [],
  orgs: 0,
  activityDays: 28,
  activeOrgs: 0,
  eligibleOrgs: 0,
  activeSharePct: null,
  activityTrend: [],
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T00:00:00.000Z",
  ...overrides,
});

describe("buildOrgFunnelStages", () => {
  it("maps org counts and shares", () => {
    const stages = buildOrgFunnelStages(
      orgs({
        funnel: [
          { id: "orgs", label: "Org created", orgs: 40, ofPreviousPct: null, ofTopPct: 100 },
          { id: "L1", label: "L1 · 500 min", orgs: 20, ofPreviousPct: 50, ofTopPct: 50 },
        ],
      }),
    );

    expect(stages).toEqual([
      { label: "Org created", reached: 40, ofEnteredPct: 100, ofPreviousPct: null },
      { label: "L1 · 500 min", reached: 20, ofEnteredPct: 50, ofPreviousPct: 50 },
    ]);
  });
});

describe("buildOrgActivitySeries", () => {
  it("emits the active count against the population, and the share separately", () => {
    const { counts, shares } = buildOrgActivitySeries(
      orgs({
        activityTrend: [
          { month: "2024-04-01", activeOrgs: 4, totalOrgs: 10, activeSharePct: 40 },
        ],
      }),
    );

    expect(counts).toEqual([
      { group: "Active orgs", key: "Apr 2024", value: 4 },
      { group: "All orgs", key: "Apr 2024", value: 10 },
    ]);
    expect(shares).toEqual([{ group: "Active share", key: "Apr 2024", value: 40 }]);
  });

  it("keeps a null share as null so the line breaks instead of hitting zero", () => {
    const { shares } = buildOrgActivitySeries(
      orgs({
        activityTrend: [
          { month: "2024-04-01", activeOrgs: 0, totalOrgs: 0, activeSharePct: null },
        ],
      }),
    );

    expect(shares[0].value).toBeNull();
  });
});
