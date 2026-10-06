import type { ActivationResponse } from "@types";

import { PALETTE } from "./chartScales";
import { CourseImpactComparison } from "./courseImpactChart";
import {
  Ci,
  FoundationalSkillsProgressResponse,
  TREND_LABELS,
  TREND_SCALE,
  changeVerdict,
  ciText,
  pValue,
  pct,
  signed,
} from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";
import type { FunnelStage } from "./FunnelBars";

/**
 * Highlights → Effectiveness: types for the two endpoints the sub-tab owns and
 * the pure helpers that shape them, plus the per-tile wording of the KPI strip
 * (AAQ-202), which reads other tabs' endpoints.
 *
 *  - `GET /v1/analytics/effectiveness/funnel` (AAQ-203)
 *  - `GET /v1/analytics/foundational-skills/progress/segments?dimension=`
 *    (AAQ-204 here; `difficultyTransition` is AAQ-219 on Helping skills)
 *
 * Mirrors ally-be `src/analytics/dto/effectiveness-analytics.dto.ts`. The
 * server owns every floor, share, interval and classification; nothing here
 * re-derives a suppressed number from counts. A `null` stays "withheld".
 *
 * The one share computed here — self-harm cues followed up, tile 7 — is over
 * counts the server publishes unfloored (AAQ-185 draws them), and is held to
 * the platform's rate floor before it is stated.
 */

/* -------------------------------------------------------------------------- */
/* Types — effectiveness/funnel                                               */
/* -------------------------------------------------------------------------- */

export type EffectivenessFunnelStageKey =
  | "signedUp"
  | "firstSession"
  | "secondSession"
  | "firstScoredCut"
  | "measurable"
  | "classifiable"
  | "improving";

export interface EffectivenessScoping {
  tenantId: string | null;
  note: string;
}

export interface EffectivenessFunnelStage {
  key: EffectivenessFunnelStageKey | string;
  label: string;
  description: string;
  reached: number;
  ofEnteredPct: number | null;
  ofPreviousPct: number | null;
  terminal: boolean;
}

export interface EffectivenessFunnelTrend {
  classifiable: number;
  improving: number;
  steady: number;
  declining: number;
  unclassified: number;
  improvingPct: number | null;
  steadyPct: number | null;
  decliningPct: number | null;
}

export interface EffectivenessFunnelClamp {
  measuredLearners: number;
  outsideFunnel: number;
  notInPopulation: number;
  fewerThanTwoSessions: number;
}

export interface EffectivenessFunnelResponse {
  rubricVersion: string;
  minSampleSize: number;
  minCohortSize: number;
  trendMinCuts: number;
  stages: EffectivenessFunnelStage[];
  trend: EffectivenessFunnelTrend;
  clamp: EffectivenessFunnelClamp;
  helpingSkillsTrend: { improving: number; steady: number; declining: number; tooEarly: number };
  cutNoiseSd: number | null;
  provenance: { derivation: string; note: string };
  scoping: EffectivenessScoping;
  computedAt: string;
}

export interface EffectivenessFunnelQuery {
  tenantId?: string;
}

/* -------------------------------------------------------------------------- */
/* Types — foundational-skills/progress/segments                              */
/* -------------------------------------------------------------------------- */

export type SegmentDimension =
  | "language"
  | "workerType"
  | "orgSize"
  | "course"
  | "difficulty"
  | "difficultyTransition";

export interface FhsSegmentChange {
  learners: number;
  earlyComposite: number | null;
  lateComposite: number | null;
  change: number | null;
  ci: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface FhsSegmentRow extends FhsSegmentChange {
  key: string;
  label: string;
}

export interface FhsWithheldSegment {
  key: string;
  label: string;
  learners: number;
}

export interface FoundationalSkillsSegmentsResponse {
  rubricVersion: string;
  minSampleSize: number;
  minCohortSize: number;
  scoreDomain: [number, number];
  dimension: SegmentDimension;
  dimensions: SegmentDimension[];
  cuts: number;
  windows: { early: number[]; late: number[]; from: number };
  cohortOptions: { cuts: number; learners: number }[];
  measuredLearners: number;
  panelLearners: number;
  overall: FhsSegmentChange;
  segments: FhsSegmentRow[];
  withheld: FhsWithheldSegment[];
  provenance: { derivation: string; note: string };
  scoping: EffectivenessScoping;
  computedAt: string;
}

export interface FoundationalSkillsSegmentsQuery {
  dimension?: SegmentDimension;
  cuts?: number;
  baselineFrom?: 1 | 2;
  tenantId?: string;
}

/* -------------------------------------------------------------------------- */
/* Funnel (AAQ-203)                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The funnel's stages for {@link FunnelBars}, carrying the SERVER's shares —
 * explicit nulls included, so a withheld share renders as a dash and is never
 * recomputed from the counts.
 */
export const funnelStages = (stages: EffectivenessFunnelStage[]): FunnelStage[] =>
  stages.map(s => ({
    label: s.label,
    reached: s.reached,
    terminal: s.terminal,
    ofEnteredPct: s.ofEnteredPct,
    ofPreviousPct: s.ofPreviousPct,
  }));

/**
 * The step that loses the most learners, by count. Counts are on the bars
 * already, so their difference states nothing the bars do not; the share
 * quoted beside it is the server's own (or nothing, when it was withheld).
 */
export const biggestFunnelLoss = (
  stages: EffectivenessFunnelStage[],
): { from: EffectivenessFunnelStage; to: EffectivenessFunnelStage; lost: number } | null => {
  let best: { from: EffectivenessFunnelStage; to: EffectivenessFunnelStage; lost: number } | null =
    null;
  for (let i = 1; i < stages.length; i += 1) {
    const lost = stages[i - 1].reached - stages[i].reached;
    if (lost > 0 && (!best || lost > best.lost))
      best = { from: stages[i - 1], to: stages[i], lost };
  }
  return best;
};

export const funnelTakeaway = (f: EffectivenessFunnelResponse): string | undefined => {
  const loss = biggestFunnelLoss(f.stages);
  if (!loss) return undefined;
  const share =
    loss.to.ofPreviousPct === null ? "" : ` (${pct(loss.to.ofPreviousPct)} of them carry on)`;
  return `Most learners leave between "${loss.from.label}" and "${loss.to.label}": ${loss.lost.toLocaleString()} drop out at that step${share}.`;
};

export interface TrendPart {
  key: "improving" | "steady" | "declining";
  label: string;
  value: number;
  /** Server share, or null when withheld below its floor. */
  sharePct: number | null;
  color: string;
}

/** The split the funnel's last step hides: improving / steady / declining, server shares. */
export const trendParts = (t: EffectivenessFunnelTrend): TrendPart[] => [
  {
    key: "improving",
    label: TREND_LABELS.improving,
    value: t.improving,
    sharePct: t.improvingPct,
    color: TREND_SCALE[TREND_LABELS.improving],
  },
  {
    key: "steady",
    label: TREND_LABELS.steady,
    value: t.steady,
    sharePct: t.steadyPct,
    color: TREND_SCALE[TREND_LABELS.steady],
  },
  {
    key: "declining",
    label: TREND_LABELS.declining,
    value: t.declining,
    sharePct: t.decliningPct,
    color: TREND_SCALE[TREND_LABELS.declining],
  },
];

/** Who the funnel's intersection drops, in one sentence — or nothing when nobody. */
export const clampNote = (c: EffectivenessFunnelClamp): string | undefined => {
  if (c.outsideFunnel === 0) return undefined;
  const parts = [
    c.notInPopulation
      ? `${c.notInPopulation} ${c.notInPopulation === 1 ? "is not a learner account" : "are not learner accounts"} in this scope (a trainer or admin who practised, or a learner from another org under a filter)`
      : null,
    c.fewerThanTwoSessions
      ? `${c.fewerThanTwoSessions} had fewer than two countable sessions (one long session filled their first slice)`
      : null,
  ].filter(Boolean);
  return `${c.outsideFunnel} of ${c.measuredLearners} measured learners sit outside this funnel${
    parts.length ? `: ${parts.join("; ")}` : ""
  }.`;
};

/* -------------------------------------------------------------------------- */
/* Segments (AAQ-204, AAQ-219)                                                */
/* -------------------------------------------------------------------------- */

export const DIMENSION_LABELS: Record<SegmentDimension, string> = {
  language: "Language",
  workerType: "Worker type",
  orgSize: "Org size",
  course: "Course vs free practice",
  difficulty: "Scenario difficulty",
  difficultyTransition: "Difficulty, start → now",
};

/** What each split means, in one line under the rows (from the endpoint's own definitions). */
export const DIMENSION_NOTES: Record<SegmentDimension, string> = {
  language:
    "The language most of each learner's panel sessions were in; a tie reads as mixed, none as unknown.",
  workerType:
    "The learner's worker type as an admin has it set now, not at the time they practised; unset when absent.",
  orgSize:
    "The org most of their panel slices were practised in, banded by how many measured learners it has.",
  course:
    "Course: started a course before their first 'now' slice closed. Free practice: everyone else.",
  difficulty:
    "The difficulty label most of their panel sessions' scenarios carry. Medium is the default for an unlabelled scenario.",
  difficultyTransition:
    "The difficulty most of their start slices were practised at → most of their now slices. Medium is the default for an unlabelled scenario.",
};

/** Offered before the first response arrives; the server's `dimensions` wins once it has. */
const DEFAULT_DIMENSIONS: SegmentDimension[] = [
  "language",
  "workerType",
  "orgSize",
  "course",
  "difficulty",
];

/**
 * The Effectiveness card's dimension picker, in the server's display order.
 * `difficultyTransition` is left out: it has its own card on Helping skills
 * (AAQ-219), and offering it here would draw the same split twice under two ids.
 */
export const segmentDimensionItems = (
  dimensions: SegmentDimension[] | undefined,
): { id: SegmentDimension; label: string }[] =>
  (dimensions && dimensions.length ? dimensions : DEFAULT_DIMENSIONS)
    .filter(d => d !== "difficultyTransition")
    .map(d => ({ id: d, label: DIMENSION_LABELS[d] ?? d }));

export const OVERALL_SEGMENT_LABEL = "Everyone in the panel";

const startNowText = (c: FhsSegmentChange): string | undefined =>
  c.earlyComposite !== null && c.lateComposite !== null
    ? `${c.earlyComposite.toFixed(2)} → ${c.lateComposite.toFixed(2)}`
    : undefined;

const segmentSublabel = (c: FhsSegmentChange): string => {
  const sn = startNowText(c);
  return [sn, `${c.up} up, ${c.down} down`].filter(Boolean).join(" · ");
};

/**
 * Whisker rows: the whole panel first (it equals AAQ-168), then each segment
 * that clears the floor, most learners first (the server's order). Withheld
 * segments are not drawn as rows of dashes; they are listed with their n.
 */
export const segmentRows = (s: FoundationalSkillsSegmentsResponse): WhiskerRow[] => [
  {
    key: "__overall",
    label: OVERALL_SEGMENT_LABEL,
    sublabel: segmentSublabel(s.overall),
    change: s.overall.change,
    ci: s.overall.ci,
    n: s.overall.learners,
    detectable: s.overall.detectable,
  },
  ...s.segments.map(r => ({
    key: r.key,
    label: r.label,
    sublabel: segmentSublabel(r),
    change: r.change,
    ci: r.ci,
    n: r.learners,
    detectable: r.detectable,
  })),
];

/** "Hindi (n = 4), Tamil (n = 2)" — the segments under the floor, by count. */
export const withheldText = (withheld: FhsWithheldSegment[]): string =>
  withheld.map(w => `${w.label} (n = ${w.learners})`).join(", ");

/** The largest withheld cell — how close the thinnest card is to its floor. */
export const largestWithheld = (s: FoundationalSkillsSegmentsResponse): number =>
  s.withheld.reduce((m, w) => Math.max(m, w.learners), 0);

export const segmentsTakeaway = (s: FoundationalSkillsSegmentsResponse): string | undefined => {
  if (s.overall.change === null) return undefined;
  const overall = `${OVERALL_SEGMENT_LABEL}: ${signed(s.overall.change)} (95% CI ${ciText(
    s.overall.ci,
  )}), ${changeVerdict({ ...s.overall, n: s.overall.learners })}.`;
  if (s.segments.length === 0) {
    return `${overall} No ${(DIMENSION_LABELS[s.dimension] ?? s.dimension).toLowerCase()} segment has ${s.minSampleSize} learners yet.`;
  }
  const up = s.segments.filter(r => r.detectable && (r.change ?? 0) > 0).length;
  const down = s.segments.filter(r => r.detectable && (r.change ?? 0) < 0).length;
  const moved =
    up + down === 0
      ? "none shows a detectable change"
      : [up ? `${up} detectably up` : null, down ? `${down} detectably down` : null]
          .filter(Boolean)
          .join(", ");
  return `${overall} Of ${s.segments.length} segment${s.segments.length === 1 ? "" : "s"} with enough learners, ${moved}.`;
};

/** Expanded-view table: every row, withheld ones with their count only. */
export const segmentTable = (s: FoundationalSkillsSegmentsResponse) => ({
  columns: [
    "Segment",
    "Learners",
    "Start",
    "Now",
    "Change",
    "95% CI",
    "Up",
    "Down",
    "Tied",
    "Sign test",
    "Detectable",
  ],
  rows: [
    ...[{ ...s.overall, key: "__overall", label: OVERALL_SEGMENT_LABEL }, ...s.segments].map(r => [
      r.label,
      r.learners,
      r.earlyComposite,
      r.lateComposite,
      r.change,
      ciText(r.ci),
      r.up,
      r.down,
      r.tied,
      pValue(r.signP),
      r.detectable ? "Yes" : "No",
    ]),
    ...s.withheld.map(w => [
      `${w.label} (withheld)`,
      w.learners,
      null,
      null,
      null,
      "—",
      null,
      null,
      null,
      "—",
      "—",
    ]),
  ] as (string | number | null)[][],
});

/* -------------------------------------------------------------------------- */
/* The chain, link by link (AAQ-202) — one tile per link                      */
/* -------------------------------------------------------------------------- */

/** What one KPI tile shows once its query has answered. */
export interface ChainTile {
  value: string;
  description: string;
  n?: number | null;
  nUnit?: string;
  minN?: number;
}

const DETAIL = (tab: string) => `Detail: ${tab}.`;

/** Tile 1 — Reach. All-time by construction on the activation endpoint, whatever its window. */
export const activationTile = (a: ActivationResponse | undefined): ChainTile => {
  if (!a)
    return {
      value: "—",
      description: `Learner accounts with a completed roleplay. ${DETAIL("Usage")}`,
    };
  const s = a.summary;
  const rate = s.activationRatePct === null ? "" : ` — ${pct(s.activationRatePct)} of them`;
  const week =
    s.latestPractisingLearners !== null && s.latestCompleteBucket
      ? ` ${s.latestPractisingLearners.toLocaleString()} practised in the latest complete week.`
      : "";
  return {
    value: s.activatedLearners.toLocaleString(),
    description: `Of ${s.registeredLearners.toLocaleString()} learner accounts, those that have completed at least one roleplay, all time${rate}.${week} ${DETAIL("Usage")}`,
  };
};

/** Tile 2 — Dose: learners with two or more scored slices, the least that can show change. */
export const measurableTile = (p: FoundationalSkillsProgressResponse | undefined): ChainTile => {
  const base = `Learners with 2+ scored practice slices — the least it takes to compare a learner with their own start. ${DETAIL("Helping skills")}`;
  if (!p) return { value: "—", description: base };
  const two = p.depth.find(d => d.atLeast === 2)?.learners ?? 0;
  return {
    value: two.toLocaleString(),
    description: `Learners with 2+ scored practice slices — the least it takes to compare a learner with their own start. ${p.measuredLearners.toLocaleString()} have at least one. ${DETAIL("Helping skills")}`,
  };
};

/** "No detectable change" / "Detectably up" — the call the colour would make, in words. */
const verdictSentence = (
  change: number | null,
  detectable: boolean,
  ci: Ci,
  decimals = 2,
  unit = "",
) =>
  !detectable
    ? `No detectable change: the 95% interval (${ciText(ci, decimals)}${unit}) spans zero.`
    : `Detectably ${(change ?? 0) > 0 ? "up" : "down"}: the 95% interval (${ciText(ci, decimals)}${unit}) clears zero.`;

/** Tile 3 — Learning: the panel's composite, start → now (AAQ-168's numbers). */
export const compositeTile = (p: FoundationalSkillsProgressResponse | undefined): ChainTile => {
  if (!p)
    return {
      value: "—",
      description: `Same learners, start vs now, on the 1–4 helping-skills scale. ${DETAIL("Helping skills")}`,
    };
  const c = p.summary.composite;
  const startNow =
    p.summary.earlyComposite !== null && p.summary.lateComposite !== null
      ? ` ${p.summary.earlyComposite.toFixed(2)} → ${p.summary.lateComposite.toFixed(2)} on the 1–4 scale,`
      : "";
  return {
    value: signed(c.change),
    description:
      `${c.change === null ? "" : `${verdictSentence(c.change, c.detectable, c.ci)}`}${startNow} the same ${c.n} learners start → now. ${DETAIL("Helping skills")}`.trim(),
    n: c.n,
    nUnit: "learners",
    minN: p.minSampleSize,
  };
};

/** Tile 4 — Learning, per person: who moved beyond their own noise (AAQ-171). */
export const trendTile = (p: FoundationalSkillsProgressResponse | undefined): ChainTile => {
  if (!p)
    return {
      value: "—",
      description: `Learners against their own start, beyond slice-to-slice noise. ${DETAIL("Helping skills")}`,
    };
  const t = p.trend;
  return {
    value: `${t.improving} up · ${t.declining} down`,
    description: `Learners with ${p.thresholds.trendMinCuts}+ slices whose last half beats (or trails) their first half by more than their noise band. ${t.steady} within noise, ${t.tooEarly} too early to say. ${DETAIL("Helping skills")}`,
  };
};

/** Tile 5 — Learning, harm side: unhelpful behaviour start → now (AAQ-169). Down is better. */
export const unhelpfulTile = (p: FoundationalSkillsProgressResponse | undefined): ChainTile => {
  if (!p)
    return {
      value: "—",
      description: `Learners showing any unhelpful behaviour, start vs now. Lower is better. ${DETAIL("Helping skills")}`,
    };
  const u = p.summary.unhelpful;
  const startNow =
    u.earlyPct !== null && u.latePct !== null
      ? ` ${pct(u.earlyPct)} → ${pct(u.latePct)} of learners.`
      : "";
  const verdict =
    u.changePts === null
      ? ""
      : !u.detectable
        ? `No detectable change: the 95% interval (${ciText(u.ciPts, 0)} pts) spans zero.`
        : `${u.changePts < 0 ? "Detectably fewer" : "Detectably more"}: the 95% interval (${ciText(u.ciPts, 0)} pts) clears zero.`;
  return {
    value: u.changePts === null ? "—" : `${signed(u.changePts, 0)} pts`,
    description:
      `${verdict}${startNow} Any skill scored 1; lower is better. ${DETAIL("Helping skills")}`.trim(),
    n: p.summary.cohortLearners,
    nUnit: "learners",
    minN: p.minSampleSize,
  };
};

/**
 * The slice of the course-impact response tile 6 reads. Structural, so the
 * tile keeps compiling against a response type that predates `pooled`.
 */
export interface CourseLiftSource {
  minSampleSize: number;
  pooled?: CourseImpactComparison;
  reference?: CourseImpactComparison;
}

/** Tile 6 — Transfer: course lift, every paired learner once. Associated with, never caused by. */
export const courseLiftTile = (c: CourseLiftSource | undefined): ChainTile => {
  const base = `Learners' own change from before a course to after it, each learner once. ${DETAIL("Course impact")}`;
  if (!c) return { value: "—", description: base };
  if (!c.pooled) {
    return {
      value: "—",
      description: `Each learner's change from before a course to after it. This server does not report the pooled figure yet. ${DETAIL("Course impact")}`,
    };
  }
  const p = c.pooled;
  const ref =
    c.reference && c.reference.change !== null
      ? ` Free practice over the same slice positions: ${signed(c.reference.change)} (${ciText(c.reference.changeCi)}).`
      : "";
  return {
    value: signed(p.change),
    description: `${p.change === null ? "" : `${verdictSentence(p.change, p.detectable, p.changeCi)} `}Associated with taking a course, not caused by it: people who finish courses also practise more.${ref} ${DETAIL("Course impact")}`,
    n: p.learners,
    nUnit: "learners",
    minN: c.minSampleSize,
  };
};

/**
 * Tile 7 — Safety: of simulated self-harm cue slices with a clear call, the
 * share where the helper followed it up. Unclear slices (both or neither coded)
 * are left out of the denominator and counted in the text. Below the rate
 * floor the tile reads "not enough data" with the slice count.
 */
export const selfHarmTile = (p: FoundationalSkillsProgressResponse | undefined): ChainTile => {
  const internal =
    "Internal: AI-judge coding of simulated conversations, share only privately and as aggregates.";
  if (!p)
    return {
      value: "—",
      description: `Self-harm cue slices the helper followed up. ${internal} ${DETAIL("Helping skills, Safety")}`,
    };
  const sh = p.safety.selfHarm;
  const called = sh.cutsFollowedUp + sh.cutsMissed;
  const share = called > 0 ? Math.round((sh.cutsFollowedUp / called) * 100) : null;
  return {
    value: share === null ? "—" : `${share}%`,
    description: `${sh.cutsFollowedUp} of ${called} cue slices with a clear call were followed up${
      sh.cutsAmbiguous ? ` (${sh.cutsAmbiguous} unclear left out)` : ""
    }. ${internal} ${DETAIL("Helping skills, Safety")}`,
    n: called,
    nUnit: "cue slices",
    minN: p.minSampleSize,
  };
};

/* -------------------------------------------------------------------------- */
/* Tile 8 — Efficiency: practice to Engage competence                         */
/* -------------------------------------------------------------------------- */

/**
 * The slice of the time-to-competence response tile 8 reads (full type in
 * ./foundationalSkillsTimeChart). Structural to keep this file free of the
 * Helping skills section's types.
 */
export interface CompetenceTierSource {
  tier: string;
  skills: string[];
  skillsRequired: number;
  medianCuts: number | null;
  notReachedByHalf: boolean;
  lastShownCut: number | null;
  medianMinutes: number | null;
  minutesLearners: number;
}

export interface CompetenceSource {
  minSampleSize: number;
  learners: number;
  excludedSkills: { skill: string; reason: "capped" | "rare" }[];
  tiers: CompetenceTierSource[];
}

/**
 * Which rubric tier each excluded skill sits in, so a tile can name the ones
 * its own tier leaves out. The response names the excluded skills but not
 * their tier; the four are fixed by the server (TIER_COMPETENCE_EXCLUDED_SKILLS)
 * and pinned to the rubric version, so this is a label map, not a rule.
 */
const EXCLUDED_SKILL_TIER: Record<string, string> = {
  rapport: "engage",
  confidentiality: "engage",
  harm: "engage",
  family: "understand",
};

/** "rapport, confidentiality and harm" — a short list in prose. */
export const proseList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** The excluded skills of one tier, in the server's order. */
export const excludedForTier = (
  excluded: CompetenceSource["excludedSkills"],
  tier: string,
): string[] => excluded.filter(e => EXCLUDED_SKILL_TIER[e.skill] === tier).map(e => e.skill);

export const competenceTile = (t: CompetenceSource | undefined): ChainTile => {
  const rule =
    "2 of 3 movable Engage skills at level 3 — rapport, confidentiality and harm left out";
  if (!t)
    return {
      value: "—",
      description: `Median practice slices until ${rule}. ${DETAIL("Helping skills")}`,
    };
  const engage = t.tiers.find(x => x.tier === "engage");
  const left = excludedForTier(t.excludedSkills, "engage");
  const ruleText = engage
    ? `${engage.skillsRequired} of ${engage.skills.length} movable Engage skills at level 3 (every basic behaviour) at least once${
        left.length ? ` — ${proseList(left)} left out` : ""
      }`
    : rule;
  const minutes =
    engage && engage.medianMinutes !== null
      ? ` Median ${Math.round(engage.medianMinutes)} practice minutes among the ${engage.minutesLearners} who got there.`
      : "";
  const value = !engage
    ? "—"
    : engage.medianCuts !== null
      ? `${engage.medianCuts} slice${engage.medianCuts === 1 ? "" : "s"}`
      : engage.notReachedByHalf
        ? "Not reached by half"
        : "—";
  const half =
    engage && engage.notReachedByHalf && engage.lastShownCut !== null
      ? ` Fewer than half had by slice ${engage.lastShownCut}.`
      : "";
  return {
    value,
    description: `Median practice slices until ${ruleText}.${half}${minutes} ${DETAIL("Helping skills")}`,
    n: t.learners,
    nUnit: "learners",
    minN: t.minSampleSize,
  };
};

/** The accent the outcome group of the strip is drawn with. */
export const OUTCOME_ACCENT = PALETTE.blue;

/* -------------------------------------------------------------------------- */
/* Dose–response (AAQ-217) — additive keys on foundational-skills/progress    */
/* -------------------------------------------------------------------------- */

export type DoseTrend = "improving" | "steady" | "declining";

export interface DoseResponsePoint {
  learnerId: number;
  cuts: number;
  practiceMinutes: number | null;
  change: number;
  trend: DoseTrend | string;
}

export interface DoseResponseFit {
  x: "cuts" | "practiceHours" | string;
  n: number;
  slope: number;
  slopeCi: [number, number] | null;
  intercept: number;
  detectable: boolean;
  xMin: number;
  xMax: number;
}

export interface DoseResponse {
  minLearners: number;
  classifiedLearners: number;
  measurable: boolean;
  learnersWithMinutes: number | null;
  fit: DoseResponseFit | null;
  minutesFit: DoseResponseFit | null;
  provenance: { derivation: string; note: string };
}

/**
 * The progress response as the dose–response card reads it. The two keys are
 * optional because a backend from before AAQ-217 omits them, and the strip
 * that shares this query must keep rendering through the deploy window.
 */
export type ProgressWithDose = FoundationalSkillsProgressResponse & {
  learnersScatter?: DoseResponsePoint[] | null;
  doseResponse?: DoseResponse;
};

export type DoseAxis = "cuts" | "hours";

export const DOSE_AXIS_LABELS: Record<DoseAxis, string> = {
  cuts: "Scored slices",
  hours: "Practice hours",
};

export const FIT_SERIES = "Fitted line";

/** Points by their AAQ-171 class (a real category, not identity), plus the fitted line. */
export const DOSE_SCALE: Record<string, string> = {
  [TREND_LABELS.improving]: TREND_SCALE[TREND_LABELS.improving],
  [TREND_LABELS.steady]: TREND_SCALE[TREND_LABELS.steady],
  [TREND_LABELS.declining]: TREND_SCALE[TREND_LABELS.declining],
  [FIT_SERIES]: PALETTE.blue,
};

const trendLabel = (t: string): string =>
  t === "improving" || t === "steady" || t === "declining" ? TREND_LABELS[t] : t;

/** The fit for the chosen axis, or null when the server stated none. */
export const doseFit = (d: DoseResponse | undefined, axis: DoseAxis): DoseResponseFit | null =>
  !d ? null : axis === "hours" ? d.minutesFit : d.fit;

/** The axes offered: practice hours only when the server fitted them. */
export const doseAxisItems = (d: DoseResponse | undefined): { id: DoseAxis; label: string }[] => [
  { id: "cuts", label: DOSE_AXIS_LABELS.cuts },
  ...(d?.minutesFit ? [{ id: "hours" as const, label: DOSE_AXIS_LABELS.hours }] : []),
];

/**
 * Scatter points (x = slices or hours, y = own change) and the fitted line's two
 * ends. The line is drawn from the server's slope and intercept over the fitted
 * learners' own x range — nothing is re-estimated here. In hours, a learner
 * whose minutes are unknown is left off rather than placed at zero.
 */
export const doseSeries = (
  points: DoseResponsePoint[],
  fit: DoseResponseFit | null,
  axis: DoseAxis,
): { group: string; x: number; y: number; learnerId?: number }[] => {
  const dots = points.flatMap(p => {
    const x =
      axis === "hours" ? (p.practiceMinutes === null ? null : p.practiceMinutes / 60) : p.cuts;
    if (x === null) return [];
    return [
      {
        group: trendLabel(p.trend),
        x: Math.round(x * 100) / 100,
        y: p.change,
        learnerId: p.learnerId,
      },
    ];
  });
  const line = fit
    ? [fit.xMin, fit.xMax].map(x => ({
        group: FIT_SERIES,
        x,
        y: Math.round((fit.intercept + fit.slope * x) * 1000) / 1000,
      }))
    : [];
  return [...dots, ...line];
};

/** "Each extra scored slice …" — the slope with its interval, as an association. */
export const doseTakeaway = (fit: DoseResponseFit | null): string | undefined => {
  if (!fit) return undefined;
  const unit = fit.x === "practiceHours" ? "hour of practice" : "scored slice";
  return `Each extra ${unit} is associated with ${signed(fit.slope, 3)} on a learner's own change (95% CI ${ciText(
    fit.slopeCi,
    3,
  )}; n = ${fit.n}): ${fit.detectable ? "a detectable association" : "no detectable association"}.`;
};

/** The gated empty state's wording, from the server's own counts. */
export const doseGateText = (d: DoseResponse | undefined): string =>
  d
    ? `Not yet measurable — n = ${d.classifiedLearners} of ${d.minLearners} needed`
    : "This server does not report dose–response yet";

export const doseTable = (points: DoseResponsePoint[]) => ({
  columns: ["Learner id", "Scored slices", "Practice minutes", "Own change", "Against own noise"],
  rows: points.map(p => [
    p.learnerId,
    p.cuts,
    p.practiceMinutes,
    p.change,
    trendLabel(p.trend),
  ]) as (string | number | null)[][],
});

/* -------------------------------------------------------------------------- */
/* Cost per improved learner (AAQ-218)                                         */
/* -------------------------------------------------------------------------- */

export interface CostPerImprovementResponse {
  window: {
    from: string;
    to: string;
    label: string;
    days: number;
    bucket: string;
    allTime: boolean;
    inProgressBucket: string | null;
    computedAt: string;
  };
  spendUsd: number;
  unpricedCalls: number;
  improvedLearners: number;
  classifiedLearners: number;
  costPerImprovedLearnerUsd: number | null;
  learnersWithSpend: number;
  improvingAllTime: number;
  classifiableAllTime: number;
  measuredLearners: number;
  cutNoiseSd: number | null;
  minSampleSize: number;
  rubricVersion: string;
  caveat: string;
  scoping: { tenantId: string | null; unscopedSections: string[] };
  provenance: { derivation: string; note: string };
  computedAt: string;
}

export const COST_CEILING_CAVEAT =
  "A ceiling, not a unit price: spend is attributable to all learners, improvement only to the measurable subset.";

/**
 * The tile's definition line: both halves of the ratio, the window, and the
 * caveat. Money is formatted by the caller (the house USD formatter).
 */
export const costDescription = (
  c: CostPerImprovementResponse,
  usd: (v: number) => string,
  orgFiltered: boolean,
): string => {
  const unpriced = c.unpricedCalls
    ? ` ${c.unpricedCalls.toLocaleString()} call${c.unpricedCalls === 1 ? " has" : "s have"} no price on file and count as $0, so spend is understated.`
    : "";
  return `${usd(c.spendUsd)} learner-caused AI spend ÷ ${c.improvedLearners} learner${
    c.improvedLearners === 1 ? "" : "s"
  } improving beyond noise whose latest scored slice closed in this window (of ${c.classifiedLearners} classifiable). ${COST_CEILING_CAVEAT}${unpriced}${
    orgFiltered
      ? " Platform-wide whatever the org filter: AI spend cannot be attributed to one org."
      : ""
  }`;
};
