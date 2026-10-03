import { CONTEXT, ColorScale, PALETTE, STAT } from "./chartScales";

import type { FunnelStage } from "./FunnelBars";

/**
 * Types and pure transforms for the Highlights → Helping skills sub-tab, backed
 * by `GET /v1/analytics/foundational-skills/progress` (plus `/learners?userId=`
 * for the per-person panel and `/benchmark` for the before/after chart).
 *
 * The server owns every rule — windows, floors, intervals, noise bands, the
 * multiple-test correction — and this file only shapes its numbers for the
 * page and writes the sentences. Nothing here re-derives a share, an average
 * or an interval, so the floors and corrections the server applied cannot be
 * undone on the client.
 *
 * The one rule the page itself enforces: a change is only ever called a move
 * when the server says it is `detectable` (its 95% interval excludes zero).
 * Everything else reads "no detectable change", because at this sample size
 * and this measure's noise that is the truth.
 */

export type FhsTier = "engage" | "understand" | "support";
export type FhsBehaviourKind = "unhelpful" | "basic" | "advanced";
export type FhsLearnerTrend = "improving" | "steady" | "declining" | "tooEarly";
export type FhsMeasurability = "measurable" | "capped" | "rare";
export type Ci = [number, number] | null;

export interface FhsChange {
  n: number;
  change: number | null;
  ci: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface FhsProgressCut {
  cut: number;
  learners: number;
  composite: number | null;
  compositeCi: Ci;
  unhelpfulPct: number | null;
  unhelpfulCi: Ci;
  tiers: { tier: FhsTier; learners: number; avgLevel: number | null }[];
  skills: { skill: string; learners: number; avgLevel: number | null }[];
}

export interface FhsLevelMixWindow {
  assessments: number;
  levels: number[] | null;
}

export interface FhsProgressSkill extends FhsChange {
  skill: string;
  name: string;
  tier: FhsTier;
  measurability: FhsMeasurability;
  earlyAvg: number | null;
  lateAvg: number | null;
  levelMix: { early: FhsLevelMixWindow; late: FhsLevelMixWindow };
  opportunityCuts: number;
  opportunityPct: number | null;
  learnersWithOpportunity: number;
  learnersWithTwoPlus: number;
}

export interface FhsProgressBehaviour {
  code: string;
  skill: string;
  kind: FhsBehaviourKind;
  text: string;
  pairedLearners: number;
  earlyPct: number | null;
  latePct: number | null;
  changePts: number | null;
  gained: number;
  lost: number;
  signP: number | null;
  q: number | null;
  credible: boolean;
  firstSliceLearners: number;
  firstSlicePct: number | null;
  everLearners: number;
  everPct: number | null;
}

export interface FhsCoachingFlag {
  code: string;
  skill: string;
  text: string;
  kind: "safety" | "repeat";
  cuts: number[];
  recent: boolean;
}

export interface FhsProgressLearner {
  id: number;
  name: string | null;
  tenantId: string | null;
  cutsReached: number;
  earlyComposite: number;
  lateComposite: number;
  change: number;
  band: number | null;
  beyondNoise: "up" | "down" | null;
  unhelpfulEarly: boolean;
  unhelpfulLate: boolean;
  flags: FhsCoachingFlag[];
}

export interface FoundationalSkillsProgressResponse {
  rubricVersion: string;
  cutSizeLearnerChars: number;
  minSampleSize: number;
  minCohortSize: number;
  scoreDomain: [number, number];
  thresholds: {
    trendMinCuts: number;
    learnerBandZ: number;
    rareOpportunityPct: number;
    cappedLevelShare: number;
    behaviourQ: number;
    maxLearnerRows: number;
  };
  cuts: number;
  cohortOptions: { cuts: number; learners: number }[];
  windows: { early: number[]; late: number[]; from: 1 | 2 };
  measuredLearners: number;
  precision: {
    cutNoiseSd: number | null;
    icc: number | null;
    panelChangeSd: number | null;
    minimumDetectableChange: number | null;
    learnerBand: number | null;
    levelsChecked: number;
    levelCodeMismatches: number;
  };
  depth: { atLeast: number; learners: number }[];
  summary: {
    cohortLearners: number;
    earlyComposite: number | null;
    lateComposite: number | null;
    composite: FhsChange;
    unhelpful: {
      earlyPct: number | null;
      latePct: number | null;
      changePts: number | null;
      ciPts: Ci;
      stopped: number;
      started: number;
      persisted: number;
      never: number;
      signP: number | null;
      detectable: boolean;
    };
    skills: {
      detectableUp: number;
      detectableDown: number;
      noDetectableChange: number;
      tooFewLearners: number;
      notMeasurable: number;
    };
  };
  byCut: FhsProgressCut[];
  tiers: (FhsChange & { tier: FhsTier; earlyAvg: number | null; lateAvg: number | null })[];
  skills: FhsProgressSkill[];
  behaviours: FhsProgressBehaviour[];
  safety: {
    selfHarm: {
      learnersWithCue: number;
      cutsWithCue: number;
      cutsFollowedUp: number;
      cutsMissed: number;
      cutsAmbiguous: number;
      cutsWithAdvanced: number;
      cutsWithOtherUnhelpful: number;
      learnersFollowedFirst: number;
      learnersMissedFirst: number;
      learnersAmbiguousFirst: number;
      repeatLearners: number;
      repeatBetter: number;
      repeatWorse: number;
      repeatSame: number;
    };
    confidentiality: {
      learnersAssessable: number;
      cutsAssessable: number;
      learnersWithTwoPlus: number;
      learnersExplained: number;
      learnersListedExceptions: number;
      learnersExplainedWhy: number;
      learnersPromisedAbsolute: number;
      learnersInaccurate: number;
    };
  };
  trend: { improving: number; steady: number; declining: number; tooEarly: number };
  learners: FhsProgressLearner[];
  learnersTruncated: boolean;
  provenance: { derivation: string; note: string };
  computedAt: string;
}

/** One learner's scored cuts, from `/foundational-skills/learners?userId=`. */
export interface FhsLearnerCut {
  cut: number;
  closedAt: string;
  compositeScore: number;
  hasUnhelpfulBehaviour: boolean | null;
  skillLevels: Record<string, number>;
  observed: string[];
  sessions?: { sessionId: string; scenarioId: number | null; scenarioTitle: string | null }[];
}

export interface FoundationalSkillsLearnersResponse {
  rubricVersion: string;
  minCut: number;
  total: number;
  limit: number;
  offset: number;
  learners: {
    id: number;
    name: string | null;
    tenantId: string | null;
    cutsReached: number;
    changeSinceFirstCut: number | null;
    cuts: FhsLearnerCut[];
  }[];
  computedAt: string;
}

/** `/foundational-skills/benchmark`: the same scenario before and after, per learner. */
export interface FoundationalSkillsBenchmarkResponse {
  rubricVersion: string;
  minSampleSize: number;
  scoreDomain: [number, number];
  minLearnerChars: number;
  minCutsBetween: number;
  scenarios: { id: string | number; title: string; sessionsScored: number }[];
  coverage: {
    sessionsScored: number;
    sessionsSkipped: number;
    sessionsFailed: number;
    sessionsPending: number;
    learnersWithOne: number;
    learnersPaired: number;
  };
  summary: {
    learners: number;
    firstAvg: number | null;
    latestAvg: number | null;
    change: number | null;
    changeCi: Ci;
    up: number;
    down: number;
    tied: number;
    signP: number | null;
    detectable: boolean;
  };
  skills: {
    skill: string;
    name: string;
    pairedLearners: number;
    firstAvg: number | null;
    latestAvg: number | null;
    change: number | null;
    changeCi: Ci;
    detectable: boolean;
  }[];
  learners: {
    id: number;
    name: string | null;
    tenantId: string | null;
    scenarioId: string | number;
    first: { sessionId: string; endedAt: string; cutsBefore: number; composite: number };
    latest: { sessionId: string; endedAt: string; cutsBefore: number; composite: number };
    change: number;
  }[];
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/** Axis-safe skill names: Carbon truncates a labels-axis tick past 14 characters. */
export const SKILL_SHORT: Record<string, string> = {
  verbal: "Verbal",
  confidentiality: "Confidential",
  rapport: "Rapport",
  feelings: "Feelings",
  empathy: "Empathy",
  harm: "Harm & safety",
  functioning: "Life impact",
  explanation: "Client's view",
  family: "Family",
  goals: "Goal-setting",
  hope: "Hope",
  coping: "Coping",
  psychoeducation: "Psychoeduc.",
  feedback: "Feedback",
};

export const skillShort = (key: string): string => SKILL_SHORT[key] ?? key;

export const TIER_LABELS: Record<FhsTier, string> = {
  engage: "Engage",
  understand: "Understand",
  support: "Support",
};

const TIER_ORDER: FhsTier[] = ["engage", "understand", "support"];

/** Skills grouped by tier, rubric order within a tier (the rubric interleaves tiers). */
export const skillsByTier = <T extends { tier: FhsTier }>(skills: T[]): T[] =>
  TIER_ORDER.flatMap(tier => skills.filter(s => s.tier === tier));

export const BEHAVIOUR_KIND_LABELS: Record<FhsBehaviourKind, string> = {
  unhelpful: "Unhelpful",
  basic: "Basic",
  advanced: "Advanced",
};

export const TREND_LABELS: Record<FhsLearnerTrend, string> = {
  improving: "Improving",
  steady: "Within noise",
  declining: "Declining",
  tooEarly: "Too early to say",
};

export const MEASURABILITY_LABELS: Record<FhsMeasurability, string> = {
  measurable: "Measurable",
  capped: "Capped by the rubric",
  rare: "Rarely tested",
};

export const LEVEL_LABELS = ["1 Unhelpful", "2 Some basics", "3 All basics", "4 Advanced"] as const;

export const WINDOW_LABELS = { early: "Start", late: "Now" } as const;

export const OPPORTUNITY_LABELS = {
  two: "2+ chances",
  one: "1 chance",
  none: "No chance yet",
} as const;

/* -------------------------------------------------------------------------- */
/* Colour — by meaning, from the shared palette                               */
/* -------------------------------------------------------------------------- */

export const OVERALL = "Overall score";
export const UNHELPFUL_SERIES = "Any unhelpful behaviour";

export const COMPOSITE_SCALE: ColorScale = { [OVERALL]: PALETTE.blue };
export const UNHELPFUL_SCALE: ColorScale = { [UNHELPFUL_SERIES]: PALETTE.red };

/** Ordered levels: red for the harmful end, then one hue up to advanced. */
export const LEVEL_SCALE: ColorScale = {
  [LEVEL_LABELS[0]]: PALETTE.red,
  [LEVEL_LABELS[1]]: CONTEXT.faint,
  [LEVEL_LABELS[2]]: STAT.avg,
  [LEVEL_LABELS[3]]: STAT.p95,
};

export const OPPORTUNITY_SCALE: ColorScale = {
  [OPPORTUNITY_LABELS.two]: PALETTE.blue,
  [OPPORTUNITY_LABELS.one]: STAT.p50,
  [OPPORTUNITY_LABELS.none]: CONTEXT.faint,
};

export const TREND_SCALE: ColorScale = {
  [TREND_LABELS.improving]: PALETTE.green,
  [TREND_LABELS.steady]: CONTEXT.line,
  [TREND_LABELS.declining]: PALETTE.red,
  [TREND_LABELS.tooEarly]: CONTEXT.faint,
};

/** Colour for a change: green/red ONLY when detectable, grey otherwise. */
export const changeColor = (c: { change: number | null; detectable: boolean }): string =>
  !c.detectable || c.change === null ? CONTEXT.line : c.change > 0 ? PALETTE.green : PALETTE.red;

/** Background + ink for a 1–4 level cell (one hue, light → dark). */
export const levelCellStyle = (value: number | null): { background: string; color: string } => {
  if (value === null) return { background: "transparent", color: CONTEXT.line };
  if (value < 1.75) return { background: "#edf5ff", color: CONTEXT.strong };
  if (value < 2.5) return { background: STAT.p50, color: CONTEXT.strong };
  if (value < 3.25) return { background: STAT.avg, color: "#ffffff" };
  return { background: STAT.p95, color: "#ffffff" };
};

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** "+0.34" / "−0.28" / "0.00" — a real minus sign, so columns of deltas align. */
export const signed = (v: number | null | undefined, decimals = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const fixed = Math.abs(v).toFixed(decimals);
  if (Number(fixed) === 0) return (0).toFixed(decimals);
  return `${v > 0 ? "+" : "−"}${fixed}`;
};

export const ciText = (ci: Ci, decimals = 2): string =>
  ci ? `${signed(ci[0], decimals)} to ${signed(ci[1], decimals)}` : "—";

export const pct = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;

export const level = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : v.toFixed(2);

export const pValue = (p: number | null | undefined): string =>
  p === null || p === undefined ? "—" : p < 0.001 ? "p<0.001" : `p=${p.toFixed(2)}`;

export const windowLabel = (cuts: number[]): string => {
  if (cuts.length === 0) return "";
  if (cuts.length === 1) return `cut ${cuts[0]}`;
  return `cuts ${cuts[0]}–${cuts[cuts.length - 1]}`;
};

export const cutLabel = (cut: number): string => `Cut ${cut}`;

/** Axis label for a cut, marking cut 1 as the warm-up slice (≤14 chars). */
export const cutAxisLabel = (cut: number): string => (cut === 1 ? "Cut 1 *" : `Cut ${cut}`);

export const learnerName = (l: { id: number; name: string | null }): string =>
  l.name?.trim() || `Learner #${l.id}`;

/** The one-line verdict for a paired change, in words. */
export const changeVerdict = (c: {
  change: number | null;
  detectable: boolean;
  n: number;
}): string => {
  if (c.change === null) return `too few learners (n = ${c.n})`;
  if (!c.detectable) return "no detectable change";
  return c.change > 0 ? "detectably up" : "detectably down";
};

export const panelOptionLabel = (o: { cuts: number; learners: number }): string =>
  `First ${o.cuts} cuts · ${o.learners} learner${o.learners === 1 ? "" : "s"}`;

/* -------------------------------------------------------------------------- */
/* Series                                                                     */
/* -------------------------------------------------------------------------- */

interface BandPoint {
  group: string;
  key: string;
  value: number | null;
  min?: number;
  max?: number;
  learners: number;
}

/**
 * Carbon bounded-area data: the line is `value`, the band is `min`..`max`.
 * A cut whose average was withheld stays on the axis with no value and no
 * band, so the reader sees a gap rather than a joined line.
 */
const band = (
  byCut: FhsProgressCut[],
  group: string,
  pick: (c: FhsProgressCut) => { value: number | null; ci: Ci },
): BandPoint[] =>
  byCut.map(c => {
    const { value, ci } = pick(c);
    return {
      group,
      key: cutAxisLabel(c.cut),
      value,
      ...(ci && value !== null ? { min: ci[0], max: ci[1] } : {}),
      learners: c.learners,
    };
  });

export const buildCompositeBand = (byCut: FhsProgressCut[]): BandPoint[] =>
  band(byCut, OVERALL, c => ({ value: c.composite, ci: c.compositeCi }));

export const buildUnhelpfulBand = (byCut: FhsProgressCut[]): BandPoint[] =>
  band(byCut, UNHELPFUL_SERIES, c => ({ value: c.unhelpfulPct, ci: c.unhelpfulCi }));

export const hasPlotted = (series: { value: number | null }[]): boolean =>
  series.some(p => typeof p.value === "number");

/**
 * Rows for the dot-and-whisker chart (AAQ-174): measurable skills by change,
 * then the ones this measure cannot move, each with the reason — never a zero
 * bar standing in for "can't tell".
 */
export const skillChangeRows = (
  skills: FhsProgressSkill[],
): { measurable: FhsProgressSkill[]; notMeasurable: FhsProgressSkill[] } => ({
  measurable: skills
    .filter(s => s.measurability === "measurable")
    .sort((a, b) => (b.change ?? -9) - (a.change ?? -9)),
  notMeasurable: skills.filter(s => s.measurability !== "measurable"),
});

/** Symmetric axis bound for the whiskers, at least ±0.5, rounded up to 0.25. */
export const whiskerExtent = (skills: { change: number | null; ci: Ci }[]): number => {
  const m = skills.reduce(
    (acc, s) =>
      Math.max(acc, Math.abs(s.ci?.[0] ?? 0), Math.abs(s.ci?.[1] ?? 0), Math.abs(s.change ?? 0)),
    0.5,
  );
  return Math.ceil(m * 4) / 4;
};

/** Carbon draws the FIRST category of a horizontal chart at the BOTTOM: hand it rows reversed. */
const topDown = <T>(rows: T[]): T[] => [...rows].reverse();

interface Point {
  group: string;
  key: string;
  value: number | null;
  [extra: string]: unknown;
}

/** Share of a window's assessments at each level, per skill, top-down by tier (AAQ-177). */
export const buildLevelMix = (skills: FhsProgressSkill[], window: "early" | "late"): Point[] =>
  topDown(skillsByTier(skills)).flatMap(s => {
    const mix = s.levelMix[window];
    if (!mix.levels || mix.assessments === 0) return [];
    return mix.levels.map((count, i) => ({
      group: LEVEL_LABELS[i],
      key: skillShort(s.skill),
      value: Math.round((count / mix.assessments) * 1000) / 10,
      count,
      assessments: mix.assessments,
    }));
  });

export const levelMixWithheld = (
  skills: FhsProgressSkill[],
  window: "early" | "late",
): FhsProgressSkill[] => skills.filter(s => !s.levelMix[window].levels);

/**
 * Learners with 2+ chances / exactly 1 / none at each skill (AAQ-178), out of
 * every measured learner, fewest-chances at the top: the skills practice
 * barely tests are the ones a content owner needs to see first.
 */
export const buildOpportunity = (skills: FhsProgressSkill[], measured: number): Point[] =>
  topDown([...skills].sort((a, b) => a.learnersWithTwoPlus - b.learnersWithTwoPlus)).flatMap(s => [
    { group: OPPORTUNITY_LABELS.two, key: skillShort(s.skill), value: s.learnersWithTwoPlus },
    {
      group: OPPORTUNITY_LABELS.one,
      key: skillShort(s.skill),
      value: s.learnersWithOpportunity - s.learnersWithTwoPlus,
    },
    {
      group: OPPORTUNITY_LABELS.none,
      key: skillShort(s.skill),
      value: Math.max(0, measured - s.learnersWithOpportunity),
    },
  ]);

/** Behaviour profile rows (AAQ-184) for one kind, most-shown first. */
export const behaviourProfile = (
  behaviours: FhsProgressBehaviour[],
  kind: FhsBehaviourKind,
): FhsProgressBehaviour[] =>
  behaviours
    .filter(b => b.kind === kind && b.everLearners > 0)
    .sort((a, b) => (b.everPct ?? -1) - (a.everPct ?? -1) || a.code.localeCompare(b.code));

/** Behaviour moves that survived the multiple-test correction (AAQ-179). */
export const credibleMoves = (behaviours: FhsProgressBehaviour[]): FhsProgressBehaviour[] =>
  behaviours
    .filter(b => b.credible && b.changePts !== null)
    .sort((a, b) => Math.abs(b.changePts ?? 0) - Math.abs(a.changePts ?? 0));

/** How many behaviour moves were tested (had a p-value) — the correction's family size. */
export const testedMoves = (behaviours: FhsProgressBehaviour[]): number =>
  behaviours.filter(b => b.signP !== null).length;

export const buildTrendMix = (
  t: FoundationalSkillsProgressResponse["trend"],
): { group: string; value: number }[] =>
  (["improving", "steady", "declining", "tooEarly"] as const)
    .map(k => ({ group: TREND_LABELS[k], value: t[k] }))
    .filter(p => p.value > 0);

/** Practice depth as funnel stages (AAQ-188). Counts of people: no suppression needed. */
export const depthStages = (depth: FoundationalSkillsProgressResponse["depth"]): FunnelStage[] =>
  depth.map((d, i) => ({
    label: `${d.atLeast}+ cut${d.atLeast === 1 ? "" : "s"}`,
    reached: d.learners,
    terminal: i === depth.length - 1,
  }));

/* -------------------------------------------------------------------------- */
/* Takeaways — one honest sentence each, or nothing                           */
/* -------------------------------------------------------------------------- */

export const compositeTakeaway = (
  s: FoundationalSkillsProgressResponse["summary"],
): string | undefined => {
  const c = s.composite;
  if (c.change === null) return undefined;
  return `${signed(c.change)} on a 1–4 scale (95% CI ${ciText(c.ci)}; ${c.up} up, ${c.down} down, ${pValue(
    c.signP,
  )}): ${changeVerdict(c)}.`;
};

export const unhelpfulTakeaway = (
  u: FoundationalSkillsProgressResponse["summary"]["unhelpful"],
): string | undefined => {
  if (u.changePts === null) return undefined;
  return `${signed(u.changePts, 0)} points (95% CI ${ciText(u.ciPts, 0)}): ${u.stopped} stopped, ${u.started} started, ${
    u.persisted
  } still, ${u.never} never — ${u.detectable ? "a detectable change" : "no detectable change"}.`;
};

export const trendTakeaway = (
  t: FoundationalSkillsProgressResponse["trend"],
  minCuts: number,
): string | undefined => {
  const classified = t.improving + t.steady + t.declining;
  if (classified === 0) return undefined;
  return `Of ${classified} learner${classified === 1 ? "" : "s"} with ${minCuts}+ cuts, ${t.improving} moved up and ${
    t.declining
  } down by more than slice-to-slice noise; ${t.steady} are within it.`;
};

export const selfHarmSummary = (
  sh: FoundationalSkillsProgressResponse["safety"]["selfHarm"],
): string | undefined => {
  if (sh.learnersWithCue === 0) return undefined;
  return `${sh.learnersWithCue} learners met a simulated self-harm cue in ${sh.cutsWithCue} slices. The first time, ${sh.learnersFollowedFirst} followed it up, ${sh.learnersMissedFirst} missed it and ${sh.learnersAmbiguousFirst} were unclear.`;
};
