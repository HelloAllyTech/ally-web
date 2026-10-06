import { describe, expect, it } from "vitest";

import {
  FeedbackUptakeArm,
  FeedbackUptakeDifference,
  FeedbackUptakeResponse,
  FoundationalSkillsTransferResponse,
  JudgeAgreementResponse,
  JudgeAgreementSkill,
  MeasurementConvergenceResponse,
  PairedComparison,
  convergenceMatrix,
  convergenceTable,
  convergenceTakeaway,
  difficultyShiftText,
  humanRaterAgreementStat,
  judgeAgreementRows,
  judgeAgreementTable,
  judgeAgreementTakeaway,
  judgeCoverageText,
  notYetMeasuredText,
  rText,
  singleScenarioText,
  transferTable,
  transferTakeaway,
  uptakeCoverageText,
  uptakeNotMapped,
  uptakeRows,
  uptakeTable,
  uptakeTakeaway,
} from "../foundationalSkillsValidityChart";

const provenance = { derivation: "derivation", note: "note" };
const computedAt = "2026-10-05T08:00:00.000Z";

/* ------------------------------- AAQ-220 -------------------------------- */

const comparison = (over: Partial<PairedComparison> = {}): PairedComparison => ({
  n: 24,
  beforeAvg: 2.6,
  afterAvg: 2.41,
  change: -0.19,
  changeCi: [-0.31, -0.07],
  up: 6,
  down: 16,
  tied: 2,
  signP: 0.03,
  detectable: true,
  ...over,
});

const withheld = (n: number): PairedComparison => ({
  n,
  beforeAvg: null,
  afterAvg: null,
  change: null,
  changeCi: null,
  up: 1,
  down: 2,
  tied: 0,
  signP: null,
  detectable: false,
});

const transfer = (
  over: Partial<FoundationalSkillsTransferResponse> = {},
): FoundationalSkillsTransferResponse => ({
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  minSingleScenarioCuts: 3,
  scoreDomain: [1, 4],
  learnersMeasured: 60,
  scoredCuts: 477,
  singleScenarioCuts: 310,
  singleScenarioSharePct: 65,
  learnersEligible: 40,
  learnersWithPair: 24,
  pairs: 31,
  comparison: comparison(),
  sameDifficulty: withheld(9),
  difficultyShift: { harder: 14, same: 12, easier: 3, untagged: 2 },
  learners: [{ learnerId: 7, before: 2.5, after: 2.2, change: -0.3, pairs: 2 }],
  provenance,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt,
  ...over,
});

describe("transfer (AAQ-220)", () => {
  it("states the change, its interval and the difficulty tally from the server", () => {
    const text = transferTakeaway(transfer());
    expect(text).toContain("−0.19");
    expect(text).toContain("−0.31 to −0.07");
    expect(text).toContain("a detectable drop");
    // The same-difficulty check is under the floor: its count travels, not a number.
    expect(text).toContain("Same-difficulty pairs only: n = 9 · need 20");
    expect(text).toContain("14 of 31 new scenarios were harder (12 same, 3 easier, 2 untagged).");
  });

  it("says nothing when the comparison is withheld, leaving the thin state to explain", () => {
    expect(transferTakeaway(transfer({ comparison: withheld(7), learners: null }))).toBeUndefined();
  });

  it("calls a change whose interval crosses zero undetectable", () => {
    const text = transferTakeaway(
      transfer({
        comparison: comparison({ change: 0.05, changeCi: [-0.1, 0.2], detectable: false }),
      }),
    );
    expect(text).toContain("no detectable difference");
  });

  it("tallies the difficulty shift without an untagged clause when there is none", () => {
    expect(difficultyShiftText({ harder: 1, same: 0, easier: 0, untagged: 0 })).toBe(
      "1 of 1 new scenario was harder (0 same, 0 easier).",
    );
    expect(difficultyShiftText({ harder: 0, same: 0, easier: 0, untagged: 0 })).toBe(
      "No repeated → new pairs yet.",
    );
  });

  it("names the share of practice the chart reads", () => {
    expect(singleScenarioText(transfer())).toBe(
      "Only slices where every session ran one scenario count — 65% of 477 scored slices.",
    );
    expect(singleScenarioText(transfer({ singleScenarioSharePct: null }))).toBe(
      "No scored slices yet.",
    );
  });

  it("tables both comparisons, keeping withheld numbers null", () => {
    const t = transferTable(transfer());
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0][0]).toBe("All repeated → new pairs");
    expect(t.rows[0][4]).toBe(-0.19);
    expect(t.rows[1][2]).toBeNull();
    expect(t.rows[1][5]).toBe("—");
  });
});

/* ------------------------------- AAQ-221 -------------------------------- */

const arm = (over: Partial<FeedbackUptakeArm> = {}): FeedbackUptakeArm => ({
  learners: 30,
  observations: 80,
  rosePct: 40,
  heldPct: 45,
  fellPct: 15,
  beforeLevelAvg: 2.1,
  ...over,
});

const diff = (over: Partial<FeedbackUptakeDifference> = {}): FeedbackUptakeDifference => ({
  learners: 26,
  namedRosePct: 42,
  unnamedRosePct: 30,
  change: 12.4,
  changeCi: [3.1, 21.7],
  up: 15,
  down: 6,
  tied: 5,
  signP: 0.08,
  detectable: true,
  ...over,
});

const nullDiff = (learners: number) =>
  diff({
    learners,
    namedRosePct: null,
    unnamedRosePct: null,
    change: null,
    changeCi: null,
    signP: null,
    detectable: false,
  });

const coverage = (over: Partial<FeedbackUptakeResponse["coverage"]> = {}) => ({
  debriefedSessions: 530,
  mappedSessions: 412,
  skippedSessions: 18,
  failedSessions: 4,
  pendingSessions: 96,
  improvements: 1200,
  improvementsWithoutSkill: 80,
  sessionsPaired: 210,
  windows: 140,
  learnersPaired: 44,
  namedNotAssessable: 12,
  ...over,
});

const uptake = (over: Partial<FeedbackUptakeResponse> = {}): FeedbackUptakeResponse => ({
  rubricVersion: "fhs-v3",
  mapperVersion: "map-v1",
  minSampleSize: 20,
  coverage: coverage(),
  pooled: {
    named: arm({ beforeLevelAvg: 1.9 }),
    unnamed: arm({ beforeLevelAvg: 2.4 }),
    difference: diff(),
  },
  skills: [
    {
      skill: "verbal",
      name: "Verbal communication",
      tier: "engage",
      named: arm(),
      unnamed: arm(),
      difference: diff({ change: -2, changeCi: [-9, 5], detectable: false }),
    },
    {
      skill: "harm",
      name: "Assessing harm",
      tier: "understand",
      named: arm({ learners: 3, rosePct: null }),
      unnamed: arm(),
      difference: nullDiff(3),
    },
  ],
  caveat: "Observational.",
  provenance,
  scoping: { tenantId: null, note: "both sides" },
  computedAt,
  ...over,
});

describe("feedback uptake (AAQ-221)", () => {
  it("puts the pooled row first, then every skill, with withheld rows keeping their n", () => {
    const rows = uptakeRows(uptake());
    expect(rows.map(r => r.key)).toEqual(["pooled", "verbal", "harm"]);
    expect(rows[0]).toMatchObject({ change: 12.4, ci: [3.1, 21.7], n: 26, detectable: true });
    expect(rows[0].sublabel).toBe("rose 42% when named · 30% when not");
    expect(rows[2]).toMatchObject({ change: null, n: 3, sublabel: "Understand" });
  });

  it("reads the difference and the start-level gap, and says why some rise is expected", () => {
    const text = uptakeTakeaway(uptake());
    expect(text).toContain("+12.4 pts");
    expect(text).toContain("3.1 to +21.7");
    expect(text).toContain("detectably more often when named");
    expect(text).toContain("level 1.90 vs 2.40");
  });

  it("is quiet when the pooled difference is withheld or nothing is mapped", () => {
    expect(
      uptakeTakeaway(uptake({ pooled: { ...uptake().pooled, difference: nullDiff(5) } })),
    ).toBeUndefined();
    const off = uptake({ coverage: coverage({ mappedSessions: 0 }) });
    expect(uptakeNotMapped(off)).toBe(true);
    expect(uptakeTakeaway(off)).toBeUndefined();
    expect(uptakeNotMapped(uptake())).toBe(false);
  });

  it("states coverage as mapped of debriefed, with pending and failed", () => {
    expect(uptakeCoverageText(coverage())).toBe(
      "412 of 530 debriefed sessions mapped to skills · 96 pending · 4 failed · 210 with a scored slice before and after · 44 learners",
    );
    expect(uptakeCoverageText(coverage({ failedSessions: 0 }))).not.toContain("failed");
  });

  it("tables the pooled row first and keeps nulls null", () => {
    const t = uptakeTable(uptake());
    expect(t.rows[0][0]).toBe("All skills (pooled)");
    expect(t.rows[2][3]).toBeNull();
    expect(t.rows[2][11]).toBeNull();
  });
});

/* ------------------------------- AAQ-222 -------------------------------- */

const ruler = (key: "R1" | "R2" | "R3" | "R4" | "R6", label: string) => ({
  key,
  label,
  description: `${label} description`,
  cuts: 300,
});

const convergence = (
  over: Partial<MeasurementConvergenceResponse> = {},
): MeasurementConvergenceResponse => ({
  rubricVersion: "fhs-v3",
  minPairs: 50,
  minSessionsForScoreZ: 20,
  cuts: { total: 477, singleScenario: 310, singleScenarioPct: 65 },
  rulers: [ruler("R1", "Helping skills"), ruler("R2", "Session score"), ruler("R6", "Rating")],
  pairs: [
    { a: "R1", b: "R2", n: 280, learners: 50, r: 0.42 },
    { a: "R1", b: "R6", n: 30, learners: 20, r: null },
    { a: "R2", b: "R6", n: 120, learners: 40, r: -0.05 },
  ],
  strongest: { a: "R1", b: "R2", n: 280, learners: 50, r: 0.42 },
  weakest: { a: "R2", b: "R6", n: 120, learners: 40, r: -0.05 },
  caveat: "Agreement is not validity.",
  scoping: { tenantId: null, unscopedSections: [] },
  provenance,
  computedAt,
  ...over,
});

describe("ruler convergence (AAQ-222)", () => {
  it("lays the pairs out as an upper triangle, each pair once", () => {
    const m = convergenceMatrix(convergence());
    expect(m).toHaveLength(3);
    expect(m[0][0].self).toBe(true);
    expect(m[0][1].pair).toMatchObject({ a: "R1", b: "R2", r: 0.42 });
    expect(m[0][2].pair).toMatchObject({ a: "R1", b: "R6", r: null, n: 30 });
    expect(m[1][2].pair).toMatchObject({ a: "R2", b: "R6" });
    // Below the diagonal: mirrored, never shown twice.
    expect(m[1][0]).toMatchObject({ mirror: true, pair: null });
  });

  it("names the strongest and the weakest pair", () => {
    expect(convergenceTakeaway(convergence())).toBe(
      "Strongest agreement: Helping skills and Session score (r = 0.42, n = 280). Weakest: Session score and Rating (r = −0.05, n = 120).",
    );
    expect(convergenceTakeaway(convergence({ weakest: null }))).toBe(
      "Strongest agreement: Helping skills and Session score (r = 0.42, n = 280).",
    );
  });

  it("says no cell has cleared the floor yet, and is quiet with no slices", () => {
    expect(convergenceTakeaway(convergence({ strongest: null, weakest: null }))).toBe(
      "No pair of rulers shares 50 single-scenario slices yet — each cell shows its n only.",
    );
    expect(
      convergenceTakeaway(
        convergence({ cuts: { total: 0, singleScenario: 0, singleScenarioPct: null } }),
      ),
    ).toBeUndefined();
  });

  it("formats r with a real minus sign and a dash when withheld", () => {
    expect(rText(-0.051)).toBe("−0.05");
    expect(rText(null)).toBe("—");
  });

  it("tables every pair with its counts", () => {
    const t = convergenceTable(convergence());
    expect(t.rows).toHaveLength(3);
    expect(t.rows[1]).toEqual(["R1 Helping skills", "R6 Rating", null, 30, 20]);
  });
});

/* ------------------------------- AAQ-223 -------------------------------- */

const binary = (over: object = {}) => ({
  pairs: 0,
  cuts: 0,
  kappa: null,
  agreementPct: null,
  both: 0,
  onlyFirst: 0,
  onlySecond: 0,
  neither: 0,
  ...over,
});

const levelAgreement = (over: object = {}) => ({
  pairs: 0,
  cuts: 0,
  kappa: null,
  weightedKappa: null,
  exactAgreementPct: null,
  meanDifference: null,
  confusion: [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  ...over,
});

const skill = (key: string, name: string, judgeLevel: object = {}): JudgeAgreementSkill => ({
  skill: key,
  name,
  tier: "engage",
  judgeVsHuman: { opportunity: binary(), level: levelAgreement(judgeLevel) },
  humanVsHuman: { opportunity: binary(), level: levelAgreement() },
});

const coverageJ = (over: Partial<JudgeAgreementResponse["coverage"]> = {}) => ({
  quarters: 2,
  sampledCuts: 60,
  ratedCuts: 0,
  ratedSampledCuts: 0,
  multiRatedCuts: 0,
  ratings: 0,
  raters: 0,
  excludedOtherRubricVersion: 0,
  excludedNoJudgement: 0,
  byQuarter: [],
  ...over,
});

const judge = (over: Partial<JudgeAgreementResponse> = {}): JudgeAgreementResponse => ({
  status: "notYetMeasured",
  rubricVersion: "fhs-v3",
  minSampleSize: 20,
  samplePerQuarter: 30,
  skills: [skill("verbal", "Verbal communication"), skill("empathy", "Empathy")],
  unhelpful: { judgeVsHuman: binary(), humanVsHuman: binary() },
  coverage: coverageJ(),
  provenance,
  computedAt,
  ...over,
});

const measured = () =>
  judge({
    status: "measured",
    skills: [
      skill("verbal", "Verbal communication", { cuts: 24, weightedKappa: 0.71, kappa: 0.55 }),
      skill("empathy", "Empathy", { cuts: 22, weightedKappa: 0.38, kappa: 0.2 }),
      skill("harm", "Assessing harm", { cuts: 6 }),
    ],
    coverage: coverageJ({ ratedCuts: 30, ratings: 41, raters: 3, multiRatedCuts: 9 }),
  });

describe("judge vs human agreement (AAQ-223)", () => {
  it("says not yet measured, naming the quarterly sample", () => {
    expect(notYetMeasuredText(judge())).toBe(
      "Not yet measured — no human ratings yet. Raters work from the quarterly sample (30 slices).",
    );
    expect(judgeAgreementTakeaway(judge())).toBeUndefined();
  });

  it("states the coverage counts behind any state", () => {
    expect(judgeCoverageText(coverageJ())).toBe(
      "60 slices sampled over 2 quarters · 0 ratings by 0 raters on 0 slices · 0 rated by two or more people",
    );
    expect(judgeCoverageText(coverageJ({ excludedOtherRubricVersion: 3 }))).toContain(
      "3 under another rubric version left out",
    );
  });

  it("while collecting, says how far the ratings have got", () => {
    const text = judgeAgreementTakeaway(
      judge({ status: "collecting", coverage: coverageJ({ ratings: 12, ratedCuts: 9 }) }),
    );
    expect(text).toBe(
      "Collecting — 12 human ratings on 9 slices so far; no skill has 20 rated slices yet.",
    );
  });

  it("when measured, reads the range of weighted κ over the skills that cleared the floor", () => {
    expect(judgeAgreementTakeaway(measured())).toBe(
      "Judge vs human, weighted κ on 2 of 3 skills with 20+ rated slices: from Empathy (0.38) to Verbal communication (0.71).",
    );
  });

  it("drives the AAQ-187 stat from the status", () => {
    expect(humanRaterAgreementStat(undefined).value).toBe("Not yet");
    expect(humanRaterAgreementStat(judge())).toMatchObject({ value: "Not yet" });
    expect(humanRaterAgreementStat(judge()).note).toContain("quarterly sample of 30 slices");
    expect(
      humanRaterAgreementStat(
        judge({ status: "collecting", coverage: coverageJ({ ratings: 5, ratedCuts: 4 }) }),
      ).value,
    ).toBe("Collecting");
    expect(humanRaterAgreementStat(measured())).toMatchObject({ value: "0.38–0.71" });
    // `measured` with κ undefined everywhere still says something true.
    expect(
      humanRaterAgreementStat(
        judge({ status: "measured", skills: [skill("verbal", "Verbal", { cuts: 25 })] }),
      ).value,
    ).toBe("Measured");
  });

  it("rows every skill plus the unhelpful flag, keeping withheld cells null", () => {
    const rows = judgeAgreementRows(measured());
    expect(rows.map(r => r.key)).toEqual(["verbal", "empathy", "harm", "unhelpful"]);
    expect(rows[2].judge).toMatchObject({ weightedKappa: null, cuts: 6 });
    // A yes/no flag has no weighted κ.
    expect(rows[3].judge.weightedKappa).toBeNull();
  });

  it("tables every skill and the unhelpful flag for export", () => {
    const t = judgeAgreementTable(measured());
    expect(t.rows).toHaveLength(4);
    expect(t.rows[0][2]).toBe(0.71);
    expect(t.rows[3][0]).toBe("Any unhelpful behaviour");
  });
});
