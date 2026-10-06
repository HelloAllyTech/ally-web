import { describe, expect, it } from "vitest";

import {
  EffectivenessOrgChange,
  EffectivenessOrgMetrics,
  EffectivenessOrgsResponse,
  PLATFORM_KEY,
  completionCell,
  compositeCell,
  improvingCell,
  scorecardRows,
  scorecardTable,
  scorecardTakeaway,
  selfHarmCell,
  sparkAxisText,
  unhelpfulCell,
} from "../orgEffectivenessChart";

const change = (over: Partial<EffectivenessOrgChange> = {}): EffectivenessOrgChange => ({
  learners: 31,
  earlyAvg: 2.3,
  lateAvg: 2.45,
  change: 0.15,
  ci: [0.04, 0.26],
  up: 20,
  down: 8,
  tied: 3,
  signP: 0.02,
  detectable: true,
  ...over,
});

const nullChange = (learners: number): EffectivenessOrgChange =>
  change({ learners, earlyAvg: null, lateAvg: null, change: null, ci: null, detectable: false });

const metrics = (over: Partial<EffectivenessOrgMetrics> = {}): EffectivenessOrgMetrics => ({
  scoredLearners: 40,
  measurableLearners: 34,
  classifiableLearners: 31,
  scoredCuts: 260,
  belowFloor: false,
  composite: change(),
  trend: {
    classifiable: 31,
    improving: 9,
    steady: 19,
    declining: 3,
    unclassified: 0,
    improvingPct: 29,
    steadyPct: 61.3,
    decliningPct: 9.7,
  },
  unhelpful: change({ earlyAvg: 30, lateAvg: 22, change: -8, ci: [-13.2, -2.9] }),
  courses: { learnersStarted: 25, started: 30, completed: 12, completionPct: 40 },
  selfHarm: {
    internal: true,
    learnersWithCue: 12,
    cutsWithCue: 18,
    cutsFollowedUp: 11,
    cutsMissed: 4,
    cutsAmbiguous: 3,
    followedUpPct: 73.3,
  },
  spark: [null, 2.4, 2.5, null, 2.6, 2.6],
  sparkCuts: [2, 7, 9, 3, 11, 6],
  ...over,
});

const below = (): EffectivenessOrgMetrics =>
  metrics({
    measurableLearners: 6,
    classifiableLearners: 4,
    belowFloor: true,
    composite: nullChange(4),
    trend: {
      ...metrics().trend,
      classifiable: 4,
      improvingPct: null,
      steadyPct: null,
      decliningPct: null,
    },
    unhelpful: nullChange(4),
    courses: { learnersStarted: 3, started: 3, completed: 1, completionPct: null },
    selfHarm: { ...metrics().selfHarm, learnersWithCue: 2, followedUpPct: null },
    spark: [null, null, null, null, null, null],
  });

const response = (over: Partial<EffectivenessOrgsResponse> = {}): EffectivenessOrgsResponse => ({
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minCohortSize: 5,
  thresholds: { trendMinCuts: 4, learnerBandZ: 1.96 },
  scoreDomain: [1, 4],
  cutNoiseSd: 0.42,
  sparkMonths: ["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"],
  sparkMinCuts: 5,
  summary: {
    orgs: 12,
    orgsWithData: 2,
    orgsAboveFloor: 1,
    cutsUnattributed: 0,
    learnersUnattributed: 0,
  },
  platform: metrics({ measurableLearners: 40 }),
  orgs: [
    { ...metrics(), tenantId: "t-big", tenantName: "Big Org", code: "BIG" },
    { ...below(), tenantId: "t-small", tenantName: "Small Org", code: null },
  ],
  scoping: { tenantId: null, unscopedSections: [] },
  provenance: { derivation: "R1", note: "note" },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("org effectiveness scorecard (AAQ-232)", () => {
  it("puts the platform reference row on top, then orgs in the server's order", () => {
    const rows = scorecardRows(response());
    expect(rows.map(r => r.key)).toEqual([PLATFORM_KEY, "t-big", "t-small"]);
    expect(rows[0]).toMatchObject({ platform: true, name: "All orgs (platform)" });
  });

  it("states a change with its interval, coloured only when detectable", () => {
    expect(compositeCell(metrics())).toEqual({
      text: "+0.15",
      note: "[+0.04 to +0.26] · 31",
      detectable: true,
      change: 0.15,
    });
  });

  it("says withheld, with the count, for every rate of a row below the floor", () => {
    const m = below();
    expect(compositeCell(m)).toEqual({ text: "withheld", note: "n = 4", withheld: true });
    expect(improvingCell(m)).toEqual({ text: "withheld", note: "n = 4", withheld: true });
    expect(unhelpfulCell(m)).toEqual({ text: "withheld", note: "n = 4", withheld: true });
    expect(completionCell(m)).toEqual({ text: "withheld", note: "n = 3 started", withheld: true });
    expect(selfHarmCell(m)).toEqual({ text: "withheld", note: "n = 2 learners", withheld: true });
  });

  it("reads unhelpful change in points, flipping the colour direction (down is good)", () => {
    const c = unhelpfulCell(metrics());
    expect(c.text).toBe("−8.0 pts");
    expect(c.note).toBe("[−13.2 to −2.9]");
    expect(c.change).toBe(8);
  });

  it("shares with their counts, and a dash where there is nothing to share", () => {
    expect(improvingCell(metrics())).toEqual({ text: "29%", note: "9 of 31" });
    expect(completionCell(metrics())).toEqual({ text: "40%", note: "12 of 30" });
    expect(
      completionCell(
        metrics({ courses: { learnersStarted: 0, started: 0, completed: 0, completionPct: null } }),
      ),
    ).toEqual({
      text: "—",
      note: "no course started",
    });
    expect(selfHarmCell(metrics())).toEqual({
      text: "73.3%",
      note: "11 followed up, 4 missed, 3 unclear",
    });
    expect(
      selfHarmCell(metrics({ selfHarm: { ...metrics().selfHarm, learnersWithCue: 0 } })),
    ).toEqual({
      text: "—",
      note: "no cue met",
    });
  });

  it("names the sparkline's shared months", () => {
    expect(sparkAxisText(response().sparkMonths)).toMatch(/2026.*→.*2026/);
    expect(sparkAxisText([])).toBe("");
  });

  it("summarises orgs above the floor and the platform change", () => {
    expect(scorecardTakeaway(response())).toBe(
      "1 of 2 orgs have 20+ measurable learners. Platform: composite +0.15 start → now (95% CI +0.04 to +0.26); 29% of 31 classifiable learners improving beyond noise.",
    );
    expect(scorecardTakeaway(response({ platform: below() }))).toBe(
      "1 of 2 orgs have 20+ measurable learners. Platform change withheld (n = 4 learners with enough slices).",
    );
    expect(scorecardTakeaway(response({ orgs: [] }))).toBeUndefined();
  });

  it("exports every row with counts, nulls for withheld rates, and one column per month", () => {
    const t = scorecardTable(response());
    expect(t.rows).toHaveLength(3);
    expect(t.columns.at(-1)).toBe("Median composite 2026-10");
    const small = t.rows[2];
    expect(small[0]).toBe("Small Org");
    expect(small[6]).toBe("yes");
    expect(small[9]).toBeNull();
    expect(small.slice(-6)).toEqual([null, null, null, null, null, null]);
  });
});
