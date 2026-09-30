import { describe, expect, it } from "vitest";

import {
  FHS_GROUPS,
  FoundationalSkillsCut,
  FoundationalSkillsResponse,
  buildFoundationalSkillsSeries,
  hasPlottedPoint,
  foundationalSkillsEmptyText,
  foundationalSkillsTable,
  foundationalSkillsTakeaway,
  formatChange,
} from "../foundationalSkillsChart";

const cut = (n: number, overrides: Partial<FoundationalSkillsCut> = {}): FoundationalSkillsCut => ({
  cut: n,
  learners: 40,
  avgScore: 2.4,
  baselineLearners: 40,
  pairedAvgScore: 2.4,
  baselineAvgScore: 2.2,
  pairedChange: 0.2,
  unhelpfulPct: 30,
  skills: [],
  ...overrides,
});

const response = (
  cuts: FoundationalSkillsCut[],
  coverage: Partial<FoundationalSkillsResponse["coverage"]> = {},
): FoundationalSkillsResponse => ({
  rubricVersion: "fhs-text-v1",
  cutSizeLearnerChars: 5000,
  minSampleSize: 20,
  scoreDomain: [1, 4],
  skills: [
    { skill: "verbal", name: "Verbal communication", tier: "engage" },
    { skill: "harm", name: "Assessment of harm", tier: "engage" },
  ],
  cuts,
  coverage: {
    learners: 60,
    cutsSealed: 100,
    cutsScored: 90,
    cutsFailed: 1,
    cutsPending: 9,
    ...coverage,
  },
  provenance: { derivation: "d", note: "n" },
  computedAt: "2026-09-30T00:00:00Z",
});

describe("buildFoundationalSkillsSeries", () => {
  it("plots both lines up to the last cut that cleared the floor, trimming thin trailing cuts", () => {
    const series = buildFoundationalSkillsSeries([
      cut(1, { avgScore: 2.2, baselineAvgScore: 2.2 }),
      cut(2),
      cut(3, { learners: 12, avgScore: null, baselineAvgScore: null, pairedChange: null }),
    ]);
    const average = series.filter(d => d.group === FHS_GROUPS.average);
    const baseline = series.filter(d => d.group === FHS_GROUPS.baseline);
    expect(average.map(d => d.key)).toEqual(["Cut 1", "Cut 2"]);
    expect(baseline.map(d => d.key)).toEqual(["Cut 1", "Cut 2"]);
    expect(average[1]).toEqual({
      group: FHS_GROUPS.average,
      key: "Cut 2",
      value: 2.4,
      learners: 40,
    });
    expect(baseline[1].value).toBe(2.2);
    expect("learners" in baseline[1]).toBe(false);
  });

  it("keeps a withheld cut between plotted ones on the axis as a gap, not a joined line", () => {
    const series = buildFoundationalSkillsSeries([
      cut(1),
      cut(2, { learners: 15, avgScore: null, baselineAvgScore: null, pairedChange: null }),
      cut(3, { learners: 22 }),
    ]);
    const average = series.filter(d => d.group === FHS_GROUPS.average);
    const baseline = series.filter(d => d.group === FHS_GROUPS.baseline);
    expect(average.map(d => [d.key, d.value])).toEqual([
      ["Cut 1", 2.4],
      ["Cut 2", null],
      ["Cut 3", 2.4],
    ]);
    expect(baseline.map(d => d.value)).toEqual([2.2, null, 2.2]);
  });

  it("draws nothing when nothing cleared the floor", () => {
    const series = buildFoundationalSkillsSeries([cut(1, { avgScore: null })]);
    expect(series).toEqual([]);
    expect(hasPlottedPoint(series)).toBe(false);
  });
});

describe("foundationalSkillsTakeaway", () => {
  it("states the change within learners at the last comparable cut", () => {
    const text = foundationalSkillsTakeaway([
      cut(1),
      cut(2, {
        learners: 41,
        avgScore: 2.7,
        baselineLearners: 38,
        pairedAvgScore: 2.61,
        baselineAvgScore: 2.3,
        pairedChange: 0.31,
      }),
      cut(3, { learners: 9, avgScore: null, pairedChange: null }),
    ]);
    expect(text).toContain("By cut 2, the 38 learners");
    expect(text).toContain("average 2.61");
    expect(text).not.toContain("2.70");
    expect(text).toContain("+0.31");
    expect(text).toContain("(2.30)");
    expect(text).toContain("Later cuts have fewer than the minimum");
  });

  it("says nothing until a second cut is comparable", () => {
    expect(foundationalSkillsTakeaway([cut(1)])).toBeNull();
    expect(foundationalSkillsTakeaway([cut(1), cut(2, { pairedChange: null })])).toBeNull();
  });
});

describe("formatChange", () => {
  it("signs the change and dashes a missing one", () => {
    expect(formatChange(0.2)).toBe("+0.20");
    expect(formatChange(-0.05)).toBe("-0.05");
    expect(formatChange(0)).toBe("0.00");
    expect(formatChange(null)).toBe("—");
  });
});

describe("foundationalSkillsEmptyText", () => {
  it("explains which stage the measure is at", () => {
    expect(foundationalSkillsEmptyText(response([], { cutsSealed: 0, cutsScored: 0 }))).toMatch(
      /No learner has reached 5,000 characters/,
    );
    expect(foundationalSkillsEmptyText(response([], { cutsSealed: 7, cutsScored: 0 }))).toMatch(
      /Scoring in progress: 0 of 7/,
    );
    expect(
      foundationalSkillsEmptyText(
        response([], { cutsSealed: 7, cutsScored: 0, cutsPending: 0, cutsFailed: 7 }),
      ),
    ).toMatch(/Scoring is failing: 0 of 7 cuts scored, 7 failed/);
    expect(
      foundationalSkillsEmptyText(
        response([], { cutsSealed: 7, cutsScored: 0, cutsPending: 4, cutsFailed: 3 }),
      ),
    ).toMatch(/Scoring in progress: 0 of 7 cuts scored, 3 failed so far/);
    expect(foundationalSkillsEmptyText(response([], { learners: 11 }))).toMatch(
      /Fewer than 20 learners .*11 learners/,
    );
  });
});

describe("foundationalSkillsTable", () => {
  it("lists every cut with each skill, showing only n below the floor", () => {
    const table = foundationalSkillsTable(
      response([
        cut(1, {
          skills: [
            { skill: "verbal", learners: 40, avgScore: 2.5 },
            { skill: "harm", learners: 6, avgScore: null },
          ],
        }),
        cut(2, {
          learners: 8,
          avgScore: null,
          baselineLearners: 8,
          pairedAvgScore: null,
          baselineAvgScore: null,
          pairedChange: null,
          unhelpfulPct: null,
        }),
      ]),
    );
    expect(table.columns.slice(-2)).toEqual(["Verbal communication", "Assessment of harm"]);
    expect(table.rows[0]).toEqual([
      "Cut 1",
      40,
      "2.40",
      40,
      "2.40",
      "2.20",
      "+0.20",
      "30.0%",
      "2.50 (n=40)",
      "n=6",
    ]);
    expect(table.rows[1]).toEqual(["Cut 2", 8, "—", 8, "—", "—", "—", "—", "—", "—"]);
  });
});
