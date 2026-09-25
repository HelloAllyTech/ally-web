import { describe, expect, it } from "vitest";

import { OrgEngagementResponse, StickinessResponse } from "@types";

import {
  buildOrgActivitySeries,
  buildStickinessStages,
  periodLabel,
  stickinessPlateau,
} from "../engagementChart";

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

const stickiness = (overrides: Partial<StickinessResponse> = {}): StickinessResponse => ({
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

describe("buildOrgActivitySeries", () => {
  it("emits the active count against the population, and the share separately", () => {
    const { counts, shares } = buildOrgActivitySeries(
      orgs({
        activityTrend: [{ month: "2024-04-01", activeOrgs: 4, totalOrgs: 10, activeSharePct: 40 }],
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
        activityTrend: [{ month: "2024-04-01", activeOrgs: 0, totalOrgs: 0, activeSharePct: null }],
      }),
    );

    expect(shares[0].value).toBeNull();
  });
});
