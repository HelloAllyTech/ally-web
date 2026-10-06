import {
  Ci,
  FhsTier,
  TIER_LABELS,
  ciText,
  level,
  pValue,
  pct,
  signed,
} from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";
import type { ChartTableData } from "./ChartDetailModal";

/**
 * Highlights → Helping skills, "Is the measure sound, and does feedback land?":
 * types for the four all-time endpoints behind it and the pure helpers that
 * shape them.
 *
 *  - `GET /v1/analytics/foundational-skills/transfer`         (AAQ-220)
 *  - `GET /v1/analytics/foundational-skills/feedback-uptake`  (AAQ-221)
 *  - `GET /v1/analytics/measurement/convergence`              (AAQ-222)
 *  - `GET /v1/analytics/foundational-skills/judge-agreement`  (AAQ-223)
 *
 * Mirrors the ally-be DTOs `foundational-skills-transfer.dto.ts`,
 * `feedback-uptake-analytics.dto.ts`, `measurement-convergence-analytics.dto.ts`
 * and `judge-agreement-analytics.dto.ts`. Every floor is the server's: a `null`
 * average, share, κ or r stays a gap here, and the count beside it is what the
 * reader gets instead. Nothing in this file recomputes a withheld number.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

export interface ValidityProvenance {
  derivation: string;
  note: string;
}

export interface ValidityScoping {
  tenantId: string | null;
  unscopedSections?: string[];
  note?: string;
}

/** A paired before → after comparison with the floor applied on the server. */
export interface PairedComparison {
  n: number;
  beforeAvg: number | null;
  afterAvg: number | null;
  change: number | null;
  changeCi: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

/** "n = 7 · need 20" — the count that travels when a number is withheld. */
export const withheldNote = (n: number, floor: number): string => `n = ${n} · need ${floor}`;

/* -------------------------------------------------------------------------- */
/* AAQ-220 · Transfer to a new scenario                                       */
/* -------------------------------------------------------------------------- */

export interface FhsTransferDifficultyShift {
  harder: number;
  same: number;
  easier: number;
  untagged: number;
}

export interface FhsTransferLearner {
  learnerId: number;
  before: number;
  after: number;
  change: number;
  pairs: number;
}

export interface FoundationalSkillsTransferResponse {
  rubricVersion: string;
  minSampleSize: number;
  minSingleScenarioCuts: number;
  scoreDomain: [number, number];
  learnersMeasured: number;
  scoredCuts: number;
  singleScenarioCuts: number;
  singleScenarioSharePct: number | null;
  learnersEligible: number;
  learnersWithPair: number;
  pairs: number;
  comparison: PairedComparison;
  sameDifficulty: PairedComparison;
  difficultyShift: FhsTransferDifficultyShift;
  /** Null below `minSampleSize` paired learners: individuals are drawn only once the group is big enough. */
  learners: FhsTransferLearner[] | null;
  provenance: ValidityProvenance;
  scoping: ValidityScoping;
  computedAt: string;
}

/** "4 of 11 new scenarios were harder (5 same, 1 easier, 1 untagged)". */
export const difficultyShiftText = (s: FhsTransferDifficultyShift): string => {
  const total = s.harder + s.same + s.easier + s.untagged;
  if (total === 0) return "No repeated → new pairs yet.";
  const rest = [
    `${s.same} same`,
    `${s.easier} easier`,
    ...(s.untagged > 0 ? [`${s.untagged} untagged`] : []),
  ].join(", ");
  return `${s.harder} of ${total} new scenario${total === 1 ? " was" : "s were"} harder (${rest}).`;
};

const comparisonVerdict = (c: PairedComparison): string => {
  if (c.change === null) return "";
  if (!c.detectable) return "no detectable difference";
  return c.change < 0 ? "a detectable drop" : "a detectable gain";
};

/**
 * The headline sentence, from the server's comparison only. Undefined when the
 * comparison is withheld — the card's thin state then says why.
 */
export const transferTakeaway = (t: FoundationalSkillsTransferResponse): string | undefined => {
  const c = t.comparison;
  if (c.change === null) return undefined;
  const same = t.sameDifficulty;
  const sameText =
    same.change === null
      ? `Same-difficulty pairs only: ${withheldNote(same.n, t.minSampleSize)}.`
      : `Same-difficulty pairs only: ${signed(same.change)} (95% CI ${ciText(same.changeCi)}), ${comparisonVerdict(same)}.`;
  return (
    `On first contact with a new scenario, learners scored ${signed(c.change)} against their last slice on a familiar one ` +
    `(95% CI ${ciText(c.changeCi)}; ${c.up} up, ${c.down} down, ${pValue(c.signP)}): ${comparisonVerdict(c)}. ` +
    `${sameText} ${difficultyShiftText(t.difficultyShift)}`
  );
};

/** The share of scored practice the chart can read, for the caption. */
export const singleScenarioText = (t: FoundationalSkillsTransferResponse): string =>
  t.singleScenarioSharePct === null
    ? "No scored slices yet."
    : `Only slices where every session ran one scenario count — ${pct(t.singleScenarioSharePct)} of ${t.scoredCuts.toLocaleString()} scored slices.`;

/** The comparison table for the expanded view and its CSV. */
export const transferTable = (t: FoundationalSkillsTransferResponse): ChartTableData => {
  const row = (label: string, c: PairedComparison) => [
    label,
    c.n,
    c.beforeAvg,
    c.afterAvg,
    c.change,
    ciText(c.changeCi),
    `${c.up} / ${c.down} / ${c.tied}`,
    pValue(c.signP),
  ];
  return {
    columns: [
      "Comparison",
      "Learners",
      "Familiar scenario (avg level)",
      "New scenario (avg level)",
      "Change",
      "95% CI",
      "Up / down / tied",
      "Sign test",
    ],
    rows: [
      row("All repeated → new pairs", t.comparison),
      row("Same difficulty tag on both", t.sameDifficulty),
    ],
  };
};

/* -------------------------------------------------------------------------- */
/* AAQ-221 · Named improvements that were acted on                            */
/* -------------------------------------------------------------------------- */

export interface FeedbackUptakeArm {
  learners: number;
  observations: number;
  rosePct: number | null;
  heldPct: number | null;
  fellPct: number | null;
  beforeLevelAvg: number | null;
}

export interface FeedbackUptakeDifference {
  learners: number;
  namedRosePct: number | null;
  unnamedRosePct: number | null;
  change: number | null;
  changeCi: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface FeedbackUptakeSkill {
  skill: string;
  name: string;
  tier: FhsTier;
  named: FeedbackUptakeArm;
  unnamed: FeedbackUptakeArm;
  difference: FeedbackUptakeDifference;
}

export interface FeedbackUptakeCoverage {
  debriefedSessions: number;
  mappedSessions: number;
  skippedSessions: number;
  failedSessions: number;
  pendingSessions: number;
  improvements: number;
  improvementsWithoutSkill: number;
  sessionsPaired: number;
  windows: number;
  learnersPaired: number;
  namedNotAssessable: number;
}

export interface FeedbackUptakeResponse {
  rubricVersion: string;
  mapperVersion: string;
  minSampleSize: number;
  coverage: FeedbackUptakeCoverage;
  pooled: {
    named: FeedbackUptakeArm;
    unnamed: FeedbackUptakeArm;
    difference: FeedbackUptakeDifference;
  };
  skills: FeedbackUptakeSkill[];
  caveat: string;
  provenance: ValidityProvenance;
  scoping: ValidityScoping;
  computedAt: string;
}

export const POOLED_KEY = "pooled";

/** True when the debrief → skill mapping has produced nothing yet: the job is off, or has not run. */
export const uptakeNotMapped = (u: FeedbackUptakeResponse): boolean =>
  u.coverage.mappedSessions === 0;

const roseSublabel = (d: FeedbackUptakeDifference): string | undefined =>
  d.namedRosePct === null || d.unnamedRosePct === null
    ? undefined
    : `rose ${pct(d.namedRosePct)} when named · ${pct(d.unnamedRosePct)} when not`;

/**
 * Whisker rows, pooled first, then every rubric skill in rubric order. The
 * change is the within-learner difference in "rose" share, named − unnamed,
 * in percentage points; a withheld skill keeps its row with its learner count.
 */
export const uptakeRows = (u: FeedbackUptakeResponse): WhiskerRow[] => {
  const row = (key: string, label: string, d: FeedbackUptakeDifference, sub?: string) => ({
    key,
    label,
    sublabel: roseSublabel(d) ?? sub,
    change: d.change,
    ci: d.changeCi,
    n: d.learners,
    detectable: d.detectable,
  });
  return [
    row(POOLED_KEY, "All skills (pooled)", u.pooled.difference, "every named vs unnamed skill"),
    ...u.skills.map(s => row(s.skill, s.name, s.difference, TIER_LABELS[s.tier])),
  ];
};

/** "412 of 530 debriefed sessions mapped · 96 pending · 4 failed · 210 with a scored slice before and after". */
export const uptakeCoverageText = (c: FeedbackUptakeCoverage): string =>
  [
    `${c.mappedSessions.toLocaleString()} of ${c.debriefedSessions.toLocaleString()} debriefed sessions mapped to skills`,
    `${c.pendingSessions.toLocaleString()} pending`,
    ...(c.failedSessions > 0 ? [`${c.failedSessions.toLocaleString()} failed`] : []),
    `${c.sessionsPaired.toLocaleString()} with a scored slice before and after`,
    `${c.learnersPaired.toLocaleString()} learners`,
  ].join(" · ");

export const uptakeTakeaway = (u: FeedbackUptakeResponse): string | undefined => {
  const d = u.pooled.difference;
  if (uptakeNotMapped(u) || d.change === null) return undefined;
  const verdict = d.detectable
    ? d.change > 0
      ? "detectably more often when named"
      : "detectably less often when named"
    : "no detectable difference";
  const start =
    u.pooled.named.beforeLevelAvg !== null && u.pooled.unnamed.beforeLevelAvg !== null
      ? ` Named skills started lower (level ${level(u.pooled.named.beforeLevelAvg)} vs ${level(
          u.pooled.unnamed.beforeLevelAvg,
        )}), so some rise is expected anyway.`
      : "";
  return (
    `When a debrief named a skill, it rose for ${pct(d.namedRosePct)} of learners' chances against ${pct(
      d.unnamedRosePct,
    )} for skills it did not name: ${signed(d.change, 1)} pts (95% CI ${ciText(d.changeCi, 1)}; ` +
    `${d.up} up, ${d.down} down, ${pValue(d.signP)}), ${verdict}.${start}`
  );
};

export const uptakeTable = (u: FeedbackUptakeResponse): ChartTableData => {
  const row = (
    label: string,
    tier: string,
    s: Omit<FeedbackUptakeSkill, "skill" | "name" | "tier">,
  ) => [
    label,
    tier,
    s.named.learners,
    s.named.rosePct,
    s.named.heldPct,
    s.named.fellPct,
    s.named.beforeLevelAvg,
    s.unnamed.learners,
    s.unnamed.rosePct,
    s.unnamed.beforeLevelAvg,
    s.difference.learners,
    s.difference.change,
    ciText(s.difference.changeCi, 1),
    `${s.difference.up} / ${s.difference.down} / ${s.difference.tied}`,
    pValue(s.difference.signP),
  ];
  return {
    columns: [
      "Skill",
      "Tier",
      "Named: learners",
      "Named: rose %",
      "Named: held %",
      "Named: fell %",
      "Named: level before",
      "Unnamed: learners",
      "Unnamed: rose %",
      "Unnamed: level before",
      "Learners with both",
      "Difference (pts)",
      "95% CI",
      "Up / down / tied",
      "Sign test",
    ],
    rows: [
      row("All skills (pooled)", "—", u.pooled),
      ...u.skills.map(s => row(s.name, TIER_LABELS[s.tier], s)),
    ],
  };
};

/* -------------------------------------------------------------------------- */
/* AAQ-222 · Do the rulers agree?                                             */
/* -------------------------------------------------------------------------- */

export type RulerKey = "R1" | "R2" | "R3" | "R4" | "R6";

export interface ConvergenceRuler {
  key: RulerKey;
  label: string;
  description: string;
  cuts: number;
}

export interface ConvergencePair {
  a: RulerKey;
  b: RulerKey;
  n: number;
  learners: number;
  r: number | null;
}

export interface MeasurementConvergenceResponse {
  rubricVersion: string;
  minPairs: number;
  minSessionsForScoreZ: number;
  cuts: { total: number; singleScenario: number; singleScenarioPct: number | null };
  rulers: ConvergenceRuler[];
  pairs: ConvergencePair[];
  strongest: ConvergencePair | null;
  weakest: ConvergencePair | null;
  caveat: string;
  scoping: ValidityScoping;
  provenance: ValidityProvenance;
  computedAt: string;
}

/** Spearman r to 2 dp with a real minus sign. */
export const rText = (r: number | null): string =>
  r === null ? "—" : `${r < 0 ? "−" : ""}${Math.abs(r).toFixed(2)}`;

export interface MatrixCell {
  /** Diagonal (a ruler against itself). */
  self: boolean;
  /** Below the diagonal: the same pair is shown once, above it. */
  mirror: boolean;
  pair: ConvergencePair | null;
}

/**
 * The rulers × rulers grid, upper triangle only (each pair once, in the
 * server's matrix order). A pair under `minPairs` keeps its cell with `r`
 * null, so the table can show its n alone.
 */
export const convergenceMatrix = (c: MeasurementConvergenceResponse): MatrixCell[][] => {
  const find = (a: RulerKey, b: RulerKey) =>
    c.pairs.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a)) ?? null;
  return c.rulers.map((row, i) =>
    c.rulers.map((col, j) => ({
      self: i === j,
      mirror: j < i,
      pair: j > i ? find(row.key, col.key) : null,
    })),
  );
};

const pairName = (c: MeasurementConvergenceResponse, p: ConvergencePair): string => {
  const label = (k: RulerKey) => c.rulers.find(r => r.key === k)?.label ?? k;
  return `${label(p.a)} and ${label(p.b)}`;
};

export const convergenceTakeaway = (c: MeasurementConvergenceResponse): string | undefined => {
  if (c.cuts.singleScenario === 0) return undefined;
  if (!c.strongest) {
    return `No pair of rulers shares ${c.minPairs} single-scenario slices yet — each cell shows its n only.`;
  }
  const strongest = `Strongest agreement: ${pairName(c, c.strongest)} (r = ${rText(c.strongest.r)}, n = ${c.strongest.n}).`;
  if (!c.weakest) return strongest;
  return `${strongest} Weakest: ${pairName(c, c.weakest)} (r = ${rText(c.weakest.r)}, n = ${c.weakest.n}).`;
};

export const convergenceTable = (c: MeasurementConvergenceResponse): ChartTableData => {
  const label = (k: RulerKey) => c.rulers.find(r => r.key === k)?.label ?? k;
  return {
    columns: ["Ruler A", "Ruler B", "Spearman r", "Slices with both", "Learners behind them"],
    rows: c.pairs.map(p => [`${p.a} ${label(p.a)}`, `${p.b} ${label(p.b)}`, p.r, p.n, p.learners]),
  };
};

/* -------------------------------------------------------------------------- */
/* AAQ-223 · Judge vs human agreement                                         */
/* -------------------------------------------------------------------------- */

export type JudgeAgreementStatus = "notYetMeasured" | "collecting" | "measured";

export interface JudgeAgreementLevel {
  pairs: number;
  cuts: number;
  kappa: number | null;
  weightedKappa: number | null;
  exactAgreementPct: number | null;
  meanDifference: number | null;
  confusion: number[][];
}

export interface JudgeAgreementBinary {
  pairs: number;
  cuts: number;
  kappa: number | null;
  agreementPct: number | null;
  both: number;
  onlyFirst: number;
  onlySecond: number;
  neither: number;
}

export interface JudgeAgreementComparison {
  opportunity: JudgeAgreementBinary;
  level: JudgeAgreementLevel;
}

export interface JudgeAgreementSkill {
  skill: string;
  name: string;
  tier: FhsTier;
  judgeVsHuman: JudgeAgreementComparison;
  humanVsHuman: JudgeAgreementComparison;
}

export interface JudgeAgreementQuarter {
  quarter: string;
  complete: boolean;
  population: number;
  sampled: number;
  sampledRated: number;
  sampledMultiRated: number;
}

export interface JudgeAgreementCoverage {
  quarters: number;
  sampledCuts: number;
  ratedCuts: number;
  ratedSampledCuts: number;
  multiRatedCuts: number;
  ratings: number;
  raters: number;
  excludedOtherRubricVersion: number;
  excludedNoJudgement: number;
  byQuarter: JudgeAgreementQuarter[];
}

export interface JudgeAgreementResponse {
  status: JudgeAgreementStatus;
  rubricVersion: string;
  minSampleSize: number;
  samplePerQuarter: number;
  skills: JudgeAgreementSkill[];
  unhelpful: { judgeVsHuman: JudgeAgreementBinary; humanVsHuman: JudgeAgreementBinary };
  coverage: JudgeAgreementCoverage;
  provenance: ValidityProvenance;
  computedAt: string;
}

/** κ to 2 dp with a real minus sign; "—" when withheld or undefined. */
export const kappaText = (k: number | null): string => rText(k);

export const notYetMeasuredText = (j: JudgeAgreementResponse): string =>
  `Not yet measured — no human ratings yet. Raters work from the quarterly sample (${j.samplePerQuarter} slices).`;

/** "42 slices sampled over 2 quarters · 0 rated" — the counts behind an empty state. */
export const judgeCoverageText = (c: JudgeAgreementCoverage): string =>
  [
    `${c.sampledCuts.toLocaleString()} slice${c.sampledCuts === 1 ? "" : "s"} sampled over ${c.quarters} quarter${
      c.quarters === 1 ? "" : "s"
    }`,
    `${c.ratings.toLocaleString()} rating${c.ratings === 1 ? "" : "s"} by ${c.raters} rater${c.raters === 1 ? "" : "s"} on ${c.ratedCuts.toLocaleString()} slice${
      c.ratedCuts === 1 ? "" : "s"
    }`,
    `${c.multiRatedCuts.toLocaleString()} rated by two or more people`,
    ...(c.excludedOtherRubricVersion > 0
      ? [`${c.excludedOtherRubricVersion} under another rubric version left out`]
      : []),
  ].join(" · ");

/** Skills whose judge-vs-human weighted κ is stated (the server cleared its floor). */
const measuredSkills = (j: JudgeAgreementResponse): JudgeAgreementSkill[] =>
  j.skills.filter(s => s.judgeVsHuman.level.weightedKappa !== null);

export const judgeAgreementTakeaway = (j: JudgeAgreementResponse): string | undefined => {
  if (j.status === "notYetMeasured") return undefined;
  if (j.status === "collecting") {
    return `Collecting — ${j.coverage.ratings} human rating${j.coverage.ratings === 1 ? "" : "s"} on ${
      j.coverage.ratedCuts
    } slice${j.coverage.ratedCuts === 1 ? "" : "s"} so far; no skill has ${j.minSampleSize} rated slices yet.`;
  }
  const measured = [...measuredSkills(j)].sort(
    (a, b) => (a.judgeVsHuman.level.weightedKappa ?? 0) - (b.judgeVsHuman.level.weightedKappa ?? 0),
  );
  if (measured.length === 0) return undefined;
  const low = measured[0];
  const high = measured[measured.length - 1];
  const range =
    measured.length === 1
      ? `${low.name} (weighted κ ${kappaText(low.judgeVsHuman.level.weightedKappa)})`
      : `from ${low.name} (${kappaText(low.judgeVsHuman.level.weightedKappa)}) to ${high.name} (${kappaText(
          high.judgeVsHuman.level.weightedKappa,
        )})`;
  return `Judge vs human, weighted κ on ${measured.length} of ${j.skills.length} skills with ${j.minSampleSize}+ rated slices: ${range}.`;
};

/**
 * The AAQ-187 precision strip's "Human-rater agreement" stat, driven by this
 * endpoint's `status` rather than a hard-coded "Not yet". With no response
 * (loading, or an older backend) it keeps the old wording.
 */
export const humanRaterAgreementStat = (
  j: JudgeAgreementResponse | undefined,
): { value: string; note: string } => {
  const caution = "treat scores as practice feedback, not assessment";
  if (!j || j.status === "notYetMeasured") {
    return {
      value: "Not yet",
      note: j
        ? `No human ratings yet — raters work from a quarterly sample of ${j.samplePerQuarter} slices; ${caution}`
        : `No study yet comparing the AI judge with trained raters — ${caution}`,
    };
  }
  if (j.status === "collecting") {
    return {
      value: "Collecting",
      note: `${j.coverage.ratings} rating${j.coverage.ratings === 1 ? "" : "s"} on ${j.coverage.ratedCuts} slice${
        j.coverage.ratedCuts === 1 ? "" : "s"
      } so far; no skill has ${j.minSampleSize} yet — ${caution}`,
    };
  }
  const ks = measuredSkills(j)
    .map(s => s.judgeVsHuman.level.weightedKappa)
    .filter((k): k is number => k !== null);
  if (ks.length === 0) {
    // `measured` with every κ undefined: both sides used one level throughout.
    return {
      value: "Measured",
      note: `κ undefined so far — judge and raters each used a single level; see AAQ-223 — ${caution}`,
    };
  }
  const lo = Math.min(...ks);
  const hi = Math.max(...ks);
  return {
    value: ks.length === 1 || lo === hi ? kappaText(lo) : `${kappaText(lo)}–${kappaText(hi)}`,
    note: `Weighted κ, AI judge vs human raters, on ${ks.length} of ${j.skills.length} skills with ${j.minSampleSize}+ rated slices (AAQ-223)`,
  };
};

export interface JudgeAgreementRow {
  key: string;
  label: string;
  sublabel: string;
  judge: {
    kappa: number | null;
    weightedKappa: number | null;
    agreementPct: number | null;
    cuts: number;
  };
  human: {
    kappa: number | null;
    weightedKappa: number | null;
    agreementPct: number | null;
    cuts: number;
  };
}

/** One row per skill (level agreement), then the cut-level "any unhelpful" flag (yes/no, so no weighted κ). */
export const judgeAgreementRows = (j: JudgeAgreementResponse): JudgeAgreementRow[] => [
  ...j.skills.map(s => ({
    key: s.skill,
    label: s.name,
    sublabel: TIER_LABELS[s.tier],
    judge: {
      kappa: s.judgeVsHuman.level.kappa,
      weightedKappa: s.judgeVsHuman.level.weightedKappa,
      agreementPct: s.judgeVsHuman.level.exactAgreementPct,
      cuts: s.judgeVsHuman.level.cuts,
    },
    human: {
      kappa: s.humanVsHuman.level.kappa,
      weightedKappa: s.humanVsHuman.level.weightedKappa,
      agreementPct: s.humanVsHuman.level.exactAgreementPct,
      cuts: s.humanVsHuman.level.cuts,
    },
  })),
  {
    key: "unhelpful",
    label: "Any unhelpful behaviour",
    sublabel: "Yes/no per slice",
    judge: {
      kappa: j.unhelpful.judgeVsHuman.kappa,
      weightedKappa: null,
      agreementPct: j.unhelpful.judgeVsHuman.agreementPct,
      cuts: j.unhelpful.judgeVsHuman.cuts,
    },
    human: {
      kappa: j.unhelpful.humanVsHuman.kappa,
      weightedKappa: null,
      agreementPct: j.unhelpful.humanVsHuman.agreementPct,
      cuts: j.unhelpful.humanVsHuman.cuts,
    },
  },
];

export const judgeAgreementTable = (j: JudgeAgreementResponse): ChartTableData => ({
  columns: [
    "Skill",
    "Tier",
    "Judge vs human: weighted κ",
    "Judge vs human: κ",
    "Judge vs human: % same level",
    "Judge vs human: rated slices",
    "Judge vs human: mean difference (judge − human)",
    "Judge vs human: opportunity κ",
    "Human vs human: weighted κ",
    "Human vs human: κ",
    "Human vs human: % same level",
    "Human vs human: slices rated twice",
  ],
  rows: [
    ...j.skills.map(s => [
      s.name,
      TIER_LABELS[s.tier],
      s.judgeVsHuman.level.weightedKappa,
      s.judgeVsHuman.level.kappa,
      s.judgeVsHuman.level.exactAgreementPct,
      s.judgeVsHuman.level.cuts,
      s.judgeVsHuman.level.meanDifference,
      s.judgeVsHuman.opportunity.kappa,
      s.humanVsHuman.level.weightedKappa,
      s.humanVsHuman.level.kappa,
      s.humanVsHuman.level.exactAgreementPct,
      s.humanVsHuman.level.cuts,
    ]),
    [
      "Any unhelpful behaviour",
      "—",
      null,
      j.unhelpful.judgeVsHuman.kappa,
      j.unhelpful.judgeVsHuman.agreementPct,
      j.unhelpful.judgeVsHuman.cuts,
      null,
      null,
      null,
      j.unhelpful.humanVsHuman.kappa,
      j.unhelpful.humanVsHuman.agreementPct,
      j.unhelpful.humanVsHuman.cuts,
    ],
  ],
});
