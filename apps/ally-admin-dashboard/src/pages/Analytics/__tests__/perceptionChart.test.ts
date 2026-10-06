import { describe, expect, it } from "vitest";

import { SatisfactionByOrdinal, SatisfactionOrdinalCell } from "@types";

import {
  ORDINAL_ALL,
  ORDINAL_PANEL,
  SelfEfficacyCalibrationStats,
  SelfEfficacyComparison,
  SelfEfficacyResponse,
  SelfEfficacyTierChange,
  calibrationPoints,
  calibrationTable,
  calibrationTakeaway,
  confidenceRows,
  confidenceTable,
  confidenceTakeaway,
  hasOrdinalValues,
  ordinalSeries,
  ordinalTable,
  ordinalTakeaway,
  ordinalWord,
  safetyFlagText,
  selfEfficacyNotMeasured,
  withheldOrdinalCount,
} from "../perceptionChart";

/* ------------------------------- AAQ-229 -------------------------------- */

const cell = (
  ratings: number,
  avgRating: number | null,
  highSharePct: number | null = null,
): SatisfactionOrdinalCell => ({ ratings, avgRating, highSharePct });

const byOrdinal = (over: Partial<SatisfactionByOrdinal> = {}): SatisfactionByOrdinal => ({
  window: "all",
  maxOrdinal: 4,
  experiencedMinRatings: 3,
  minSampleSize: 20,
  ratedLearners: 60,
  experiencedLearners: 22,
  points: [
    { ordinal: 1, all: cell(60, 4.1, 78), experienced: cell(22, 4.0, 72.7) },
    { ordinal: 2, all: cell(41, 4.2, 80.5), experienced: cell(22, 4.1, 77.3) },
    { ordinal: 3, all: cell(25, 4.3, 84), experienced: cell(22, 4.3, 86.4) },
    { ordinal: 4, all: cell(12, null), experienced: cell(12, null) },
  ],
  ratingsBeyondLastOrdinal: 5,
  provenance: { derivation: "R6", note: "self-report" },
  ...over,
});

describe("satisfaction by ordinal (AAQ-229)", () => {
  it("spells ordinals the way people read them", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinalWord)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
    ]);
  });

  it("draws two lines, keeping a withheld ordinal on the axis with a null value", () => {
    const s = ordinalSeries(byOrdinal());
    expect(s).toHaveLength(8);
    expect(s[0]).toMatchObject({ group: ORDINAL_ALL, key: "1", value: 4.1, ratings: 60 });
    expect(s[1]).toMatchObject({ group: ORDINAL_PANEL, key: "1", value: 4.0 });
    expect(s[6]).toMatchObject({ group: ORDINAL_ALL, key: "4", value: null, ratings: 12 });
  });

  it("reads the fixed panel first, then all learners, from first to last stated ordinal", () => {
    const text = ordinalTakeaway(byOrdinal());
    expect(text).toContain(
      "Experienced panel (22 learners): mean rating 4.00 at the 1st rated session, 4.30 at the 3rd; rated 4–5 72.7% → 86.4%.",
    );
    expect(text?.indexOf("Experienced panel")).toBeLessThan(text?.indexOf("All learners") ?? -1);
  });

  it("says when only one ordinal can be stated, and is quiet when none can", () => {
    const one = byOrdinal({
      points: [
        { ordinal: 1, all: cell(25, 4.1, 80), experienced: cell(5, null) },
        { ordinal: 2, all: cell(8, null), experienced: cell(5, null) },
      ],
    });
    expect(ordinalTakeaway(one)).toBe(
      "All learners (60 learners): mean rating 4.10 at the 1st rated session; later ones have too few ratings to state.",
    );
    const none = byOrdinal({
      points: [{ ordinal: 1, all: cell(8, null), experienced: cell(0, null) }],
    });
    expect(ordinalTakeaway(none)).toBeUndefined();
    expect(hasOrdinalValues(none)).toBe(false);
    expect(hasOrdinalValues(byOrdinal())).toBe(true);
  });

  it("counts ordinals reached but withheld, never ones nobody reached", () => {
    expect(withheldOrdinalCount(byOrdinal())).toBe(1);
    expect(
      withheldOrdinalCount(
        byOrdinal({ points: [{ ordinal: 1, all: cell(0, null), experienced: cell(0, null) }] }),
      ),
    ).toBe(0);
  });

  it("tables both populations with the 4–5 share", () => {
    const t = ordinalTable(byOrdinal());
    expect(t.rows[0]).toEqual(["1st", 60, 4.1, 78, 22, 4.0, 72.7]);
    expect(t.rows[3][2]).toBeNull();
  });
});

/* --------------------------- AAQ-230 / AAQ-231 --------------------------- */

const cmp = (over: Partial<SelfEfficacyComparison> = {}): SelfEfficacyComparison => ({
  n: 24,
  beforeAvg: 5.2,
  afterAvg: 6.4,
  change: 1.2,
  changeCi: [0.6, 1.8],
  up: 16,
  down: 4,
  tied: 4,
  signP: 0.01,
  detectable: true,
  ...over,
});

const none = (n = 0): SelfEfficacyComparison => ({
  n,
  beforeAvg: null,
  afterAvg: null,
  change: null,
  changeCi: null,
  up: 0,
  down: 0,
  tied: 0,
  signP: null,
  detectable: false,
});

const tier = (
  t: "engage" | "understand" | "support",
  label: string,
  over: Partial<SelfEfficacyTierChange> = {},
): SelfEfficacyTierChange => ({
  tier: t,
  label,
  skills: [],
  learners: 24,
  self: cmp(),
  selfMatched: cmp({ change: 1.0, n: 21 }),
  judge: cmp({ n: 21, beforeAvg: 2.3, afterAvg: 2.4, change: 0.1, changeCi: [-0.05, 0.25] }),
  medianDaysApart: 41,
  ...over,
});

const stats = (over: Partial<SelfEfficacyCalibrationStats> = {}): SelfEfficacyCalibrationStats => ({
  learners: 30,
  observations: 140,
  overConfident: 14,
  calibrated: 12,
  underConfident: 4,
  overConfidentPct: 46.7,
  calibratedPct: 40,
  underConfidentPct: 13.3,
  meanGap: 0.6,
  meanGapCi: [0.3, 0.9],
  spearmanR: 0.12,
  ...over,
});

const selfEfficacy = (over: Partial<SelfEfficacyResponse> = {}): SelfEfficacyResponse => ({
  instrumentVersion: "v1",
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minSpearmanPoints: 20,
  coverage: {
    learnersAsked: 40,
    learnersAnswered: 35,
    learnersWithTwoOrMore: 24,
    responses: 80,
    answeredResponses: 72,
    dismissedResponses: 8,
    byTrigger: { ONBOARDING: 35, CUTS: 30, COURSE: 7 },
    itemsAnswered: 900,
    matchedObservations: 140,
    unmatchedObservations: 760,
  },
  confidence: {
    learnersWithTwoOrMore: 24,
    selfDomain: [0, 10],
    levelDomain: [1, 4],
    tiers: [
      tier("engage", "Engage"),
      tier("understand", "Understand", { judge: none(8), selfMatched: none(8) }),
      tier("support", "Support", { self: none(6), medianDaysApart: null }),
    ],
    skills: [
      {
        skill: "verbal",
        name: "Verbal communication",
        tier: "engage",
        learners: 24,
        self: cmp(),
        selfMatched: cmp(),
        judge: cmp(),
        medianDaysApart: 41,
      },
    ],
  },
  calibration: {
    thresholds: { rescale: "1 + 3·r/10", band: 0.75, matchWindowDays: 30 },
    skills: [{ skill: "verbal", name: "Verbal communication", tier: "engage", ...stats() }],
    overall: stats(),
    points: [
      { skill: "verbal", selfRating: 8, level: 2 },
      { skill: "verbal", selfRating: 3, level: 3 },
    ],
    pointsTotal: 2,
    pointsTruncated: false,
    pointCap: 2000,
    safetyFlag: {
      skill: "harm",
      name: "Assessing harm",
      learners: 22,
      overConfident: 9,
      overConfidentPct: 40.9,
      internal: true,
      note: "Internal — share only privately.",
    },
  },
  caveat: "Poor self-assessors.",
  provenance: { derivation: "R1 + instrument", note: "note" },
  scoping: { tenantId: null, note: "by answer org" },
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("confidence start → now (AAQ-230)", () => {
  it("is not measured when nobody has rated an item", () => {
    const empty = selfEfficacy();
    empty.coverage = { ...empty.coverage, learnersAnswered: 0 };
    expect(selfEfficacyNotMeasured(empty)).toBe(true);
    expect(selfEfficacyNotMeasured(selfEfficacy())).toBe(false);
  });

  it("puts the self-rating in colour and the judge beside it, always grey", () => {
    const { self, judge } = confidenceRows(selfEfficacy());
    expect(self.map(r => r.key)).toEqual(["engage", "understand", "support"]);
    expect(self[0]).toMatchObject({ change: 1.2, n: 24, detectable: true });
    expect(self[0].sublabel).toBe("24 learners · median 41 days apart");
    expect(self[2]).toMatchObject({ change: null, n: 6, sublabel: "24 learners paired" });
    expect(judge[0]).toMatchObject({ change: 0.1, n: 21, detectable: false });
    expect(judge[0].sublabel).toBe("same learners self-rated +1.0");
    expect(judge[1]).toMatchObject({
      change: null,
      sublabel: "same learners, nearest judged slices",
    });
  });

  it("reads self and judge side by side, from the server's numbers only", () => {
    expect(confidenceTakeaway(selfEfficacy())).toBe(
      "Self-rated confidence (0–10), first → latest answer: Engage +1.2, Understand +1.2. The judge's level for the same learners (1–4): Engage +0.10.",
    );
  });

  it("is quiet when no tier has a stated self change", () => {
    const s = selfEfficacy();
    s.confidence = {
      ...s.confidence,
      tiers: s.confidence.tiers.map(t => ({ ...t, self: none(3) })),
    };
    expect(confidenceTakeaway(s)).toBeUndefined();
  });

  it("tables tiers then skills", () => {
    const t = confidenceTable(selfEfficacy());
    expect(t.rows.map(r => r[0])).toEqual([
      "Engage",
      "Understand",
      "Support",
      "Verbal communication",
    ]);
    expect(t.rows[2][5]).toBeNull();
  });
});

describe("confidence against competence (AAQ-231)", () => {
  it("jitters deterministically, within half a step, and keeps the raw answer", () => {
    const a = calibrationPoints(selfEfficacy());
    const b = calibrationPoints(selfEfficacy());
    expect(a).toEqual(b);
    expect(a[0]).toMatchObject({ selfRating: 8, level: 2, skill: "verbal" });
    expect(Math.abs(a[0].x - 8)).toBeLessThan(0.26);
    expect(Math.abs(a[0].y - 2)).toBeLessThan(0.18);
  });

  it("states the three groups with their shares and the rank correlation", () => {
    expect(calibrationTakeaway(selfEfficacy())).toBe(
      "Of 30 learners (their latest answer matched to a judged slice): 14 over-confident, 12 calibrated, 4 under-confident (46.7% / 40% / 13.3%); Spearman r = 0.12 between confidence and level.",
    );
  });

  it("leaves withheld shares out rather than printing dashes", () => {
    const s = selfEfficacy();
    s.calibration = {
      ...s.calibration,
      overall: stats({
        learners: 8,
        overConfidentPct: null,
        calibratedPct: null,
        underConfidentPct: null,
        spearmanR: null,
      }),
    };
    expect(calibrationTakeaway(s)).toBe(
      "Of 8 learners (their latest answer matched to a judged slice): 14 over-confident, 12 calibrated, 4 under-confident.",
    );
  });

  it("flags harm over-confidence, and says when no one is matched yet", () => {
    const flag = selfEfficacy().calibration.safetyFlag;
    expect(safetyFlagText(flag)).toBe("Assessing harm: 9 of 22 learners over-confident (40.9%).");
    expect(safetyFlagText({ ...flag, learners: 0, overConfident: 0, overConfidentPct: null })).toBe(
      "Assessing harm: no learner matched to a judged slice yet.",
    );
  });

  it("tables the pooled row first, then each skill", () => {
    const t = calibrationTable(selfEfficacy());
    expect(t.rows[0][0]).toBe("All skills");
    expect(t.rows[1][0]).toBe("Verbal communication");
  });
});
