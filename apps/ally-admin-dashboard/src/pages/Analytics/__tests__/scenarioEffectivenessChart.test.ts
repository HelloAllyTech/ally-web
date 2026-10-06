import { describe, expect, it } from "vitest";

import {
  ScenarioCoverageSkill,
  ScenarioOpportunityCoverageResponse,
  ScenarioOpportunityRow,
  ScenarioRepeatImprovementResponse,
  ScenarioRepeatRow,
  belowFloorText,
  coverageCell,
  coverageColumns,
  coverageTable,
  coverageTakeaway,
  opportunityCellStyle,
  repeatPickerItems,
  repeatTable,
  repeatTakeaway,
  scoringEditNote,
  selectedRow,
  singleScenarioNote,
  slopeAxis,
  tagGapRows,
  tagGapTakeaway,
  tierSpans,
  versionLabel,
} from "../scenarioEffectivenessChart";

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "R1", note: "Opportunity is the judge's call." };

// Rubric order interleaves tiers; the grid groups them.
const skills: ScenarioCoverageSkill[] = [
  { skill: "verbal", name: "Verbal communication", tier: "engage" },
  { skill: "feelings", name: "Exploring feelings", tier: "understand" },
  { skill: "rapport", name: "Rapport", tier: "engage" },
  { skill: "hope", name: "Instilling hope", tier: "support" },
];

const scenario = (over: Partial<ScenarioOpportunityRow> = {}): ScenarioOpportunityRow => ({
  scenarioId: 1,
  title: "Grieving parent",
  cuts: 40,
  learners: 18,
  sessionsPlayed: 220,
  taggedSkills: ["feelings", "hope"],
  untranslatableTags: ["Non-Verbal Communication"],
  customTags: 1,
  cells: [
    { skill: "verbal", tagged: false, opportunities: 36, opportunityPct: 90 },
    { skill: "feelings", tagged: true, opportunities: 30, opportunityPct: 75 },
    { skill: "rapport", tagged: false, opportunities: 20, opportunityPct: 50 },
    { skill: "hope", tagged: true, opportunities: 4, opportunityPct: 10 },
  ],
  ...over,
});

const coverage = (
  over: Partial<ScenarioOpportunityCoverageResponse> = {},
): ScenarioOpportunityCoverageResponse => ({
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  skills,
  scoredCuts: 200,
  singleScenarioCuts: 150,
  singleScenarioShare: 75,
  scenarios: [scenario()],
  belowFloor: [
    { scenarioId: 2, title: "New scenario", cuts: 12 },
    { scenarioId: 3, title: "Rare scenario", cuts: 3 },
  ],
  tagGaps: [
    { scenarioId: 1, title: "Grieving parent", skill: "hope", opportunityPct: 10, cuts: 40, sessionsPlayed: 220 },
  ],
  thresholds: { maxOpportunityPct: 30, minCuts: 20 },
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("opportunity coverage grid", () => {
  it("groups columns by tier with short labels, one header span per run", () => {
    const columns = coverageColumns(skills);
    expect(columns.map(c => c.skill)).toEqual(["verbal", "rapport", "feelings", "hope"]);
    expect(columns[1].short).toBe("Rapport");
    expect(tierSpans(columns)).toEqual([
      { tier: "engage", label: "Engage", span: 2 },
      { tier: "understand", label: "Understand", span: 1 },
      { tier: "support", label: "Support", span: 1 },
    ]);
  });

  it("reads each cell by skill key, with the tag and the n on hover", () => {
    const columns = coverageColumns(skills);
    const hope = coverageCell(scenario(), columns[3]);
    expect(hope).toMatchObject({ value: 10, tagged: true });
    expect(hope.title).toBe(
      "Instilling hope: a chance in 4 of 40 slices (10%) · the scenario is tagged with this skill",
    );
    // A skill the row does not carry is blank, never 0.
    expect(coverageCell(scenario({ cells: [] }), columns[0]).value).toBeNull();
  });

  it("shades on one hue, darker for more often", () => {
    expect(opportunityCellStyle(null).background).toBe("transparent");
    expect(opportunityCellStyle(10).background).not.toBe(opportunityCellStyle(90).background);
    expect(opportunityCellStyle(90).color).toBe("#ffffff");
  });

  it("says outright when the rows describe a minority of practice", () => {
    expect(singleScenarioNote(coverage())).toBe(
      "75% of scored slices (150 of 200) played one scenario throughout; only those are attributed to a scenario.",
    );
    expect(singleScenarioNote(coverage({ singleScenarioShare: 41.5, singleScenarioCuts: 83 }))).toMatch(
      /^Restricted to single-scenario slices: only 41\.5% of scored slices/,
    );
    expect(singleScenarioNote(coverage({ singleScenarioShare: null, scoredCuts: 9, singleScenarioCuts: 4 }))).toContain(
      "too few to state a share",
    );
  });

  it("counts tagged cells against the server's gap list", () => {
    expect(coverageTakeaway(coverage())).toBe(
      "1 scenario with 20+ single-scenario slices: 1 of their 2 tagged skills get a chance in under 30% of slices.",
    );
    expect(coverageTakeaway(coverage({ scenarios: [] }))).toBeUndefined();
    expect(belowFloorText(coverage())).toBe(
      "2 more scenarios have fewer than 20 single-scenario slices: New scenario (n = 12), Rare scenario (n = 3).",
    );
  });

  it("exports tags by name and marks tagged shares", () => {
    const table = coverageTable(coverage());
    const row = table.rows[0];
    expect(row[table.columns.indexOf("Tagged skills")]).toBe("Exploring feelings, Instilling hope");
    expect(row[table.columns.indexOf("Tags with no helping skill")]).toBe("Non-Verbal Communication");
    expect(row[table.columns.indexOf("Instilling hope %")]).toBe("10 (tagged)");
    expect(row[table.columns.indexOf("Verbal communication %")]).toBe(90);
  });

  it("names the fix list's first entry by its full skill name", () => {
    expect(tagGapRows(coverage())[0]).toMatchObject({ scenario: "Grieving parent", skill: "Instilling hope" });
    expect(tagGapTakeaway(coverage())).toBe(
      "Fix first: Grieving parent. It is tagged with Instilling hope, but gives a chance at it in 10% of 40 slices, across 220 sessions played.",
    );
    expect(tagGapTakeaway(coverage({ tagGaps: [] }))).toBeUndefined();
  });
});

const repeatRow = (over: Partial<ScenarioRepeatRow> = {}): ScenarioRepeatRow => ({
  scenarioId: 5,
  title: "Angry caller",
  versionId: "v-5-3",
  versionNumber: 3,
  repeaters: 30,
  pairs: 24,
  firstAvg: 42.5,
  latestAvg: 61,
  change: 18.5,
  changeCi: [9.2, 27.8],
  up: 18,
  down: 4,
  tied: 2,
  signP: 0.004,
  detectable: true,
  scoringChangedAt: "2026-09-03T10:00:00.000Z",
  pairsSpanningScoringChange: 6,
  ...over,
});

const repeat = (
  over: Partial<ScenarioRepeatImprovementResponse> = {},
): ScenarioRepeatImprovementResponse => ({
  minSampleSize: 20,
  thresholds: { minSpanHours: 24, pickerSize: 10 },
  repeatGroups: 50,
  scenarios: [
    repeatRow({ versionId: "v-5-2", versionNumber: 2, pairs: 3, change: null, changeCi: null }),
    repeatRow(),
  ],
  pooled: { pairs: 40, learners: 32, up: 22, down: 8, tied: 2, improvingPct: 73.3, signP: 0.016 },
  selected: {
    scenarioId: 5,
    title: "Angry caller",
    versionId: "v-5-3",
    versionNumber: 3,
    repeaters: 30,
    pairs: 24,
    learners: [],
  },
  picker: [
    { scenarioId: 5, title: "Angry caller", versionId: "v-5-3", pairs: 24 },
    { scenarioId: 9, title: "Quiet teen", versionId: null, pairs: 1 },
  ],
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("repeat improvement", () => {
  it("finds the selected version's row, not just the scenario's first", () => {
    expect(selectedRow(repeat())?.versionId).toBe("v-5-3");
    expect(selectedRow(repeat({ selected: null }))).toBeNull();
  });

  it("offers the picker with string ids and pair counts", () => {
    expect(repeatPickerItems(repeat())).toEqual([
      { id: "5", label: "Angry caller · 24 pairs" },
      { id: "9", label: "Quiet teen · 1 pair" },
    ]);
  });

  it("leads with the pooled share improving, then the selected change", () => {
    expect(repeatTakeaway(repeat())).toBe(
      "Across every scenario, 73.3% of 32 learners who replayed one scored higher on balance (22 up, 8 down, 2 level, p=0.02). Angry caller v3: +18.5 points (95% CI +9.2 to +27.8), a detectable change.",
    );
    const thin = repeat({
      pooled: { pairs: 5, learners: 5, up: 3, down: 1, tied: 1, improvingPct: null, signP: null },
    });
    expect(repeatTakeaway(thin)).toMatch(
      /^5 learners have replayed a scenario a day or more apart; need 20 before a share improving is stated\./,
    );
    expect(
      repeatTakeaway(repeat({ pooled: { ...repeat().pooled, learners: 0 } })),
    ).toBeUndefined();
  });

  it("warns when pairs straddle a scoring edit, and stays quiet when none do", () => {
    expect(scoringEditNote(repeatRow())).toBe(
      "6 of these 24 pairs straddle a scoring edit on 2026-09-03 — read the change with care.",
    );
    expect(scoringEditNote(repeatRow({ pairsSpanningScoringChange: 0 }))).toBeNull();
    expect(scoringEditNote(repeatRow({ pairsSpanningScoringChange: undefined }))).toBeNull();
  });

  it("tables every version, nulls kept, with the scoring-edit column", () => {
    const table = repeatTable(repeat());
    expect(table.rows[0][table.columns.indexOf("Version")]).toBe("v2");
    expect(table.rows[0][table.columns.indexOf("Change (pts)")]).toBeNull();
    expect(table.rows[1][table.columns.indexOf("Pairs across the last scoring edit")]).toBe(
      "6 (edit 2026-09-03)",
    );
    expect(versionLabel(null)).toBe("unversioned");
  });

  it("fits the slope axis to raw points with round ends, zero in view when straddled", () => {
    expect(slopeAxis([12, 47, 63])).toEqual({ domain: [0, 80], ticks: [0, 20, 40, 60, 80] });
    const straddle = slopeAxis([-15, 40]);
    expect(straddle.domain[0]).toBeLessThanOrEqual(-15);
    expect(straddle.ticks).toContain(0);
    expect(slopeAxis([]).domain).toEqual([0, 1]);
    expect(slopeAxis([5, 5]).domain[0]).toBeLessThan(5);
  });
});
