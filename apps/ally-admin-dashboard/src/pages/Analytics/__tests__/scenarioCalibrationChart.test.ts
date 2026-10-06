import { describe, expect, it } from "vitest";

import { PALETTE } from "../chartScales";
import {
  PROGRESSION_SCALE,
  PROGRESSION_SERIES,
  ScenarioCalibrationResponse,
  ScenarioCalibrationRow,
  ScenarioProgressionPoint,
  ScenarioProgressionResponse,
  bandScale,
  calibrationBelowFloor,
  calibrationFlagText,
  calibrationRows,
  calibrationTable,
  calibrationTakeaway,
  progressionSeries,
  progressionTable,
  progressionTakeaway,
  thinBuckets,
  untrackedNote,
} from "../scenarioCalibrationChart";

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "R2", note: "Difficulty is an authoring label." };

const DERIVED = [
  { key: "below0", label: "< 0" },
  { key: "pct0to25", label: "0–25%" },
  { key: "pct25to50", label: "25–50%" },
  { key: "pct50to75", label: "50–75%" },
  { key: "pct75to100", label: "75–100%" },
  { key: "over100", label: "> 100%" },
];
const RAW = [
  { key: "below0", label: "< 0" },
  { key: "raw0to49", label: "0–49" },
  { key: "raw50to99", label: "50–99" },
  { key: "raw100plus", label: "100+" },
];

const bands = (defs: { key: string; label: string }[], pcts: number[], n: number) =>
  defs.map((d, i) => ({ ...d, pct: pcts[i], count: Math.round((pcts[i] / 100) * n) }));

const row = (over: Partial<ScenarioCalibrationRow> = {}): ScenarioCalibrationRow => ({
  scenarioId: 3,
  versionId: "v-3-2",
  versionNumber: 2,
  title: "Angry caller",
  difficultyLevel: "HARD",
  sessions: 120,
  bandedSessions: 100,
  rangeSource: "derived",
  rangeReason: null,
  attainableMax: 80,
  attainableMin: -20,
  ceilingIsHard: true,
  uncappedContributors: 0,
  configStableSince: "2026-08-01T00:00:00.000Z",
  bands: bands(DERIVED, [0, 2, 3, 10, 85, 0], 100),
  medianScore: 68,
  flag: "tooEasy",
  rangeSuspect: false,
  ...over,
});

const calibration = (
  over: Partial<ScenarioCalibrationResponse> = {},
): ScenarioCalibrationResponse => ({
  minSampleSize: 20,
  rows: [
    row(),
    row({
      scenarioId: 4,
      versionId: null,
      versionNumber: null,
      title: "Quiet teen",
      difficultyLevel: null,
      rangeSource: "raw",
      rangeReason: "noScoredContributors",
      attainableMax: null,
      attainableMin: null,
      ceilingIsHard: null,
      bands: bands(RAW, [60, 30, 10, 0], 40),
      bandedSessions: 40,
      sessions: 40,
      medianScore: -5,
      flag: "tooHard",
    }),
  ],
  belowFloor: [{ scenarioId: 7, versionId: "v-7-1", versionNumber: 1, title: "New one", sessions: 6 }],
  totals: { sessions: 166, unresolvedExcluded: 9, rows: 2, derivedRows: 1, tooEasy: 1, tooHard: 1 },
  bandDefinitions: { derived: DERIVED, raw: RAW },
  thresholds: { tooEasyTopBandPct: 80, tooHardBelowZeroPct: 50 },
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("calibration", () => {
  it("ramps the in-range bands and gives the out-of-range bands their own hues", () => {
    const scale = bandScale(DERIVED);
    expect(scale.below0).toBe(PALETTE.orange);
    expect(scale.over100).toBe(PALETTE.purple);
    expect(new Set([scale.pct0to25, scale.pct25to50, scale.pct50to75, scale.pct75to100]).size).toBe(4);
  });

  it("stacks each row on its own band set, dropping empty bands", () => {
    const [derived, raw] = calibrationRows(calibration());
    expect(derived.label).toBe("Angry caller v2");
    expect(derived.difficulty).toBe("Hard");
    expect(derived.sublabel).toBe("100 sessions · share of its −20 to 80 point range · median 68 points");
    expect(derived.segments.map(s => s.key)).toEqual(["pct0to25", "pct25to50", "pct50to75", "pct75to100"]);
    expect(derived.notes).toEqual(["too easy: 85% of sessions in the top band"]);
    expect(raw.label).toBe("Quiet teen unversioned");
    expect(raw.sublabel).toContain("raw points: nothing in its scoring adds points");
    expect(raw.segments.map(s => s.key)).toEqual(["below0", "raw0to49", "raw50to99"]);
    expect(raw.notes).toEqual(["too hard: 60% of sessions below 0"]);
  });

  it("marks a suspect range and a nominal ceiling", () => {
    const [r] = calibrationRows(
      calibration({ rows: [row({ flag: null, rangeSuspect: true, uncappedContributors: 2 })] }),
    );
    expect(r.notes).toEqual([
      "scores above a hard ceiling: the scoring changed under these sessions, or the range misses something",
      "nominal ceiling: 2 uncapped scoring items counted once, so scores above 100% are expected",
    ]);
    expect(calibrationFlagText(row({ flag: null }))).toBeNull();
  });

  it("names flagged versions with their authored label", () => {
    expect(calibrationTakeaway(calibration())).toBe(
      "2 of 2 scenario versions with 20+ scored sessions to check: Angry caller v2, labelled hard (too easy); Quiet teen unversioned (too hard).",
    );
    expect(calibrationTakeaway(calibration({ rows: [row({ flag: null })] }))).toBe(
      "None of 1 scenario version with 20+ scored sessions lands as too easy or too hard.",
    );
    expect(calibrationTakeaway(calibration({ rows: [] }))).toBeUndefined();
    expect(calibrationBelowFloor(calibration())).toBe("New one v1 (n = 6)");
  });

  it("tables the range, ceiling and every band", () => {
    const table = calibrationTable(calibration());
    const r0 = table.rows[0];
    expect(r0[table.columns.indexOf("Attainable range")]).toBe("-20 to 80");
    expect(r0[table.columns.indexOf("Ceiling")]).toBe("hard");
    expect(r0[table.columns.indexOf("Scoring stable since")]).toBe("2026-08-01");
    expect(String(r0[table.columns.indexOf("Bands (share, count)")])).toContain("75–100%: 85% (85)");
    expect(table.rows[1][table.columns.indexOf("Bands")]).toBe("raw points (noScoredContributors)");
  });
});

const point = (bucket: string, over: Partial<ScenarioProgressionPoint> = {}): ScenarioProgressionPoint => ({
  bucket,
  sessions: 40,
  reachedTerminal: 10,
  advanced: 18,
  neverAdvanced: 12,
  reachedTerminalPct: 25,
  advancedPct: 45,
  neverAdvancedPct: 30,
  fellBackOnly: 2,
  untracked: 5,
  ...over,
});

const progression = (
  over: Partial<ScenarioProgressionResponse> = {},
): ScenarioProgressionResponse => ({
  minSampleSize: 20,
  window: {
    from: "2026-08-01",
    to: "2026-10-05",
    label: "Last 90 days",
    days: 66,
    bucket: "month",
    allTime: false,
    inProgressBucket: "2026-10-01",
    computedAt: "2026-10-05T08:00:00.000Z",
  },
  points: [
    point("2026-08-01"),
    point("2026-09-01", {
      sessions: 6,
      reachedTerminalPct: null,
      advancedPct: null,
      neverAdvancedPct: null,
    }),
    point("2026-10-01"),
  ],
  totals: {
    ...point("x"),
    sessions: 86,
    reachedTerminalPct: 26.7,
    neverAdvancedPct: 30.2,
    untracked: 15,
    untrackedByReason: { noStateMetadata: 10, branchingMode: 3, noRoomToAdvance: 2 },
  },
  byScenario: [{ ...point("x"), scenarioId: 3, title: "Angry caller" }],
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("progression", () => {
  it("stacks the server's shares, leaving off withheld and in-progress buckets", () => {
    const series = progressionSeries(progression());
    expect([...new Set(series.map(s => s.key))]).toEqual(["2026-08-01"]);
    expect(series.map(s => [s.group, s.value])).toEqual([
      [PROGRESSION_SERIES[0], 25],
      [PROGRESSION_SERIES[1], 45],
      [PROGRESSION_SERIES[2], 30],
    ]);
    expect(thinBuckets(progression())).toBe(1);
  });

  it("shades furthest darkest", () => {
    const shades = PROGRESSION_SERIES.map(s => PROGRESSION_SCALE[s]);
    expect(new Set(shades).size).toBe(3);
  });

  it("states the totals, or that they are too few", () => {
    expect(progressionTakeaway(progression())).toBe(
      "26.7% of 86 tracked sessions reached the scenario's last state; 30.2% never got past the opening state.",
    );
    expect(
      progressionTakeaway(
        progression({
          totals: { ...progression().totals, sessions: 9, reachedTerminalPct: null, neverAdvancedPct: null },
        }),
      ),
    ).toBe("9 tracked sessions: too few to state shares (need 20).");
    expect(
      progressionTakeaway(progression({ totals: { ...progression().totals, sessions: 0 } })),
    ).toBeUndefined();
  });

  it("counts the untracked sessions by reason", () => {
    expect(untrackedNote(progression())).toBe(
      "15 sessions not plotted: 10 carry no state (older builds or stateless scenarios), 3 ran in branching mode, 2 had nowhere to advance to.",
    );
    expect(
      untrackedNote(progression({ totals: { ...progression().totals, untracked: 0 } })),
    ).toBeNull();
    const table = progressionTable(progression());
    expect(table.rows[0][0]).toBe("Angry caller");
    expect(table.rows[0][table.columns.indexOf("Reached %")]).toBe(25);
  });
});
