import { CONTEXT, ColorScale, PALETTE, STAT } from "./chartScales";

/**
 * Types and pure transforms for the Highlights → Skills sub-tab, backed by
 * `GET /v1/analytics/foundational-skills/progress` (and `/learners?userId=` for
 * the per-person panel).
 *
 * Every number on the tab is either:
 *  - over ONE balanced panel — the learners whose first N cuts are all scored —
 *    so a line across cuts, or a "start → now" pair, holds the same people at
 *    both ends and cannot move because of who stopped practising; or
 *  - over every measured learner against their OWN start (the trend mix and the
 *    practice-volume chart), which needs no panel because each person is only
 *    compared with themselves.
 *
 * The server owns every rule (windows, floors, bands); this file only shapes
 * its numbers for Carbon and writes the sentences. Nothing here re-derives a
 * share or an average, so the sample floors the server applied cannot be undone
 * on the client.
 */

export type FhsTier = "engage" | "understand" | "support";
export type FhsBehaviourKind = "unhelpful" | "basic" | "advanced";
export type FhsLearnerTrend = "improving" | "steady" | "declining" | "tooEarly";

export interface FhsProgressCut {
  cut: number;
  learners: number;
  composite: number | null;
  unhelpfulPct: number | null;
  tiers: { tier: FhsTier; learners: number; avgLevel: number | null }[];
  skills: { skill: string; learners: number; avgLevel: number | null }[];
}

export interface FhsLevelMixWindow {
  assessments: number;
  /** Counts at levels 1–4; null below the sample floor. */
  levels: number[] | null;
}

export interface FhsProgressSkill {
  skill: string;
  name: string;
  tier: FhsTier;
  pairedLearners: number;
  earlyAvg: number | null;
  lateAvg: number | null;
  change: number | null;
  improved: number;
  unchanged: number;
  declined: number;
  levelMix: { early: FhsLevelMixWindow; late: FhsLevelMixWindow };
  opportunityCuts: number;
  opportunityPct: number | null;
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
}

export interface FhsProgressLearner {
  id: number;
  name: string | null;
  tenantId: string | null;
  cutsReached: number;
  earlyComposite: number;
  lateComposite: number;
  change: number;
  trend: FhsLearnerTrend;
  skillsImproved: number;
  skillsDeclined: number;
  unhelpfulEarly: boolean;
  unhelpfulLate: boolean;
}

export interface FoundationalSkillsProgressResponse {
  rubricVersion: string;
  cutSizeLearnerChars: number;
  minSampleSize: number;
  minCohortSize: number;
  scoreDomain: [number, number];
  thresholds: {
    trendMinCuts: number;
    compositeFlatBand: number;
    skillFlatBand: number;
    skillMoveBand: number;
    maxLearnerRows: number;
  };
  cuts: number;
  cohortOptions: { cuts: number; learners: number }[];
  windows: { early: number[]; late: number[] };
  measuredLearners: number;
  summary: {
    cohortLearners: number;
    earlyComposite: number | null;
    lateComposite: number | null;
    compositeChange: number | null;
    unhelpfulEarlyPct: number | null;
    unhelpfulLatePct: number | null;
    skillsUp: number;
    skillsDown: number;
    skillsSteady: number;
    skillsWithheld: number;
  };
  byCut: FhsProgressCut[];
  skills: FhsProgressSkill[];
  behaviours: FhsProgressBehaviour[];
  unhelpfulTransitions: { stopped: number; persisted: number; started: number; never: number };
  trend: { improving: number; steady: number; declining: number; tooEarly: number };
  dose: { label: string; learners: number; avgChange: number | null }[];
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

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Axis-safe skill names. Carbon truncates a labels-axis tick past 14 characters,
 * and "Assessment of harm and developing a response plan" truncates to nothing a
 * reader can use. The full name still travels in tables, tooltips and the grid.
 */
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

const TIER_ORDER: FhsTier[] = ["engage", "understand", "support"];

/**
 * Skills grouped by tier (engage → understand → support), rubric order within
 * a tier. The rubric itself interleaves tiers, so a list grouped under tier
 * headings would otherwise repeat a heading.
 */
export const skillsByTier = <T extends { tier: FhsTier }>(skills: T[]): T[] =>
  TIER_ORDER.flatMap(tier => skills.filter(s => s.tier === tier));

/**
 * Carbon draws the FIRST category of a horizontal bar chart at the BOTTOM of
 * the axis. Every builder below orders its rows top-to-bottom as a reader
 * scans them, then hands Carbon the reverse.
 */
const topDown = <T>(rows: T[]): T[] => [...rows].reverse();

export const TIER_LABELS: Record<FhsTier, string> = {
  engage: "Engage",
  understand: "Understand",
  support: "Support",
};

export const OVERALL = "Overall";

export const BEHAVIOUR_KIND_LABELS: Record<FhsBehaviourKind, string> = {
  unhelpful: "Unhelpful",
  basic: "Basic",
  advanced: "Advanced",
};

export const TREND_LABELS: Record<FhsLearnerTrend, string> = {
  improving: "Improving",
  steady: "Holding steady",
  declining: "Declining",
  tooEarly: "Too early to say",
};

export const DIRECTION = { up: "Improved", held: "Held", down: "Declined" } as const;

export const LEVEL_LABELS = ["1 Unhelpful", "2 Some basics", "3 All basics", "4 Advanced"] as const;

export const TRANSITION_LABELS = {
  stopped: "Stopped",
  never: "Never showed",
  persisted: "Still showing",
  started: "Started",
} as const;

export const WINDOW_LABELS = { early: "Start", late: "Now" } as const;

/* -------------------------------------------------------------------------- */
/* Colour — by meaning, from the shared palette                               */
/* -------------------------------------------------------------------------- */

/** Overall is the subject; the three tiers are identities in fixed order. */
export const TIER_SCALE: ColorScale = {
  [OVERALL]: PALETTE.blue,
  [TIER_LABELS.engage]: PALETTE.teal,
  [TIER_LABELS.understand]: PALETTE.purple,
  [TIER_LABELS.support]: PALETTE.orange,
};

export const UNHELPFUL_SERIES = "Any unhelpful behaviour";
export const UNHELPFUL_SCALE: ColorScale = { [UNHELPFUL_SERIES]: PALETTE.red };

/** Same good/neutral/bad sense as the Skill growth trend mix. */
export const DIRECTION_SCALE: ColorScale = {
  [DIRECTION.up]: PALETTE.green,
  [DIRECTION.held]: CONTEXT.faint,
  [DIRECTION.down]: PALETTE.red,
};

/** Ordered levels: red for the harmful end, then a one-hue ramp up to advanced. */
export const LEVEL_SCALE: ColorScale = {
  [LEVEL_LABELS[0]]: PALETTE.red,
  [LEVEL_LABELS[1]]: CONTEXT.faint,
  [LEVEL_LABELS[2]]: STAT.avg,
  [LEVEL_LABELS[3]]: STAT.p95,
};

export const TRANSITION_SCALE: ColorScale = {
  [TRANSITION_LABELS.stopped]: PALETTE.green,
  [TRANSITION_LABELS.never]: PALETTE.teal,
  [TRANSITION_LABELS.persisted]: PALETTE.orange,
  [TRANSITION_LABELS.started]: PALETTE.red,
};

export const TREND_SCALE: ColorScale = {
  [TREND_LABELS.improving]: PALETTE.green,
  [TREND_LABELS.steady]: CONTEXT.line,
  [TREND_LABELS.declining]: PALETTE.red,
  [TREND_LABELS.tooEarly]: CONTEXT.faint,
};

export const OPPORTUNITY_SERIES = "Cuts that tested it";
export const OPPORTUNITY_SCALE: ColorScale = { [OPPORTUNITY_SERIES]: PALETTE.blue };

export const DOSE_SERIES = "Average own change";
export const DOSE_SCALE: ColorScale = { [DOSE_SERIES]: PALETTE.blue };

/**
 * Background for a 1–4 level cell: one hue, light to dark (STAT ramp), so a
 * darker cell is a higher level and nothing else. Returns the ink to pair with
 * it so a value on a dark cell stays readable.
 */
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

export const pct = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;

export const level = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : v.toFixed(2);

/** "cuts 1–2" / "cut 1" — the window a "start" or "now" number averages. */
export const windowLabel = (cuts: number[]): string => {
  if (cuts.length === 0) return "";
  if (cuts.length === 1) return `cut ${cuts[0]}`;
  return `cuts ${cuts[0]}–${cuts[cuts.length - 1]}`;
};

export const cutLabel = (cut: number): string => `Cut ${cut}`;

export const learnerName = (l: { id: number; name: string | null }): string =>
  l.name?.trim() || `Learner #${l.id}`;

/* -------------------------------------------------------------------------- */
/* Series                                                                     */
/* -------------------------------------------------------------------------- */

interface Point {
  group: string;
  key: string;
  value: number | null;
  [extra: string]: unknown;
}

/** Overall plus the three tiers at each cut of the panel (AAQ-172). */
export const buildTierSeries = (byCut: FhsProgressCut[]): Point[] =>
  byCut.flatMap(c => [
    { group: OVERALL, key: cutLabel(c.cut), value: c.composite, learners: c.learners },
    ...c.tiers.map(t => ({
      group: TIER_LABELS[t.tier],
      key: cutLabel(c.cut),
      value: t.avgLevel,
      learners: t.learners,
    })),
  ]);

/** Share of the panel's cuts with any unhelpful behaviour, cut by cut (AAQ-173). */
export const buildUnhelpfulSeries = (byCut: FhsProgressCut[]): Point[] =>
  byCut.map(c => ({
    group: UNHELPFUL_SERIES,
    key: cutLabel(c.cut),
    value: c.unhelpfulPct,
    learners: c.learners,
  }));

export const hasPlotted = (series: { value: number | null }[]): boolean =>
  series.some(p => typeof p.value === "number");

export const directionOf = (
  change: number,
  band: number,
): (typeof DIRECTION)[keyof typeof DIRECTION] =>
  change >= band ? DIRECTION.up : change <= -band ? DIRECTION.down : DIRECTION.held;

/**
 * Per-skill paired change, biggest gain at the top (AAQ-174). Carbon colours a
 * simple bar by its `group`, which here is the skill — so the scale is built per
 * render, mapping each skill to the colour of its direction. Withheld skills
 * are left out of the bars and named by {@link withheldSkills}.
 */
export const buildSkillChange = (
  skills: FhsProgressSkill[],
  band: number,
): { data: Point[]; scale: ColorScale } => {
  const shown = skills
    .filter((s): s is FhsProgressSkill & { change: number } => s.change !== null)
    .sort((a, b) => b.change - a.change);
  return {
    data: topDown(shown).map(s => ({
      group: skillShort(s.skill),
      key: skillShort(s.skill),
      value: s.change,
      name: s.name,
      pairedLearners: s.pairedLearners,
    })),
    scale: Object.fromEntries(
      shown.map(s => [skillShort(s.skill), DIRECTION_SCALE[directionOf(s.change, band)]]),
    ),
  };
};

export const withheldSkills = (skills: FhsProgressSkill[]): FhsProgressSkill[] =>
  skills.filter(s => s.change === null);

/**
 * Learners whose own level rose / held / fell on each skill (AAQ-175). Counts,
 * never withheld — a count of people hides nobody. Most net improvers at the top.
 */
export const buildWhoMoved = (skills: FhsProgressSkill[]): Point[] =>
  topDown(
    skills
      .filter(s => s.pairedLearners > 0)
      .sort((a, b) => b.improved - b.declined - (a.improved - a.declined)),
  ).flatMap(s => [
    { group: DIRECTION.up, key: skillShort(s.skill), value: s.improved },
    { group: DIRECTION.held, key: skillShort(s.skill), value: s.unchanged },
    { group: DIRECTION.down, key: skillShort(s.skill), value: s.declined },
  ]);

/**
 * Share of a window's assessments at each level, per skill (AAQ-177). Skills
 * below the floor are dropped from the bars and named in the caption.
 */
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

/** Skills with too few assessments in the window to draw a mix. */
export const levelMixWithheld = (
  skills: FhsProgressSkill[],
  window: "early" | "late",
): FhsProgressSkill[] => skills.filter(s => !s.levelMix[window].levels);

/** Skills sitting at one level in BOTH windows: a ceiling, not a stall. */
export const ceilingSkills = (skills: FhsProgressSkill[]): FhsProgressSkill[] =>
  skills.filter(s => {
    const share = (w: FhsLevelMixWindow, i: number) =>
      w.levels && w.assessments ? w.levels[i] / w.assessments : 0;
    return [0, 1, 2, 3].some(
      i => share(s.levelMix.early, i) >= 0.95 && share(s.levelMix.late, i) >= 0.95,
    );
  });

/** How often practice gives a chance to show each skill, most-tested at the top (AAQ-178). */
export const buildOpportunity = (skills: FhsProgressSkill[]): Point[] =>
  topDown([...skills].sort((a, b) => (b.opportunityPct ?? 0) - (a.opportunityPct ?? 0))).map(s => ({
    group: OPPORTUNITY_SERIES,
    key: skillShort(s.skill),
    value: s.opportunityPct,
    name: s.name,
    cuts: s.opportunityCuts,
  }));

/**
 * The behaviours that moved most, either way (AAQ-179). For an unhelpful
 * behaviour a fall is the good direction; `good` carries that so the row can be
 * coloured by meaning rather than by sign.
 */
export const behaviourMovers = (
  behaviours: FhsProgressBehaviour[],
  kind: FhsBehaviourKind | "all",
  limit = 10,
): (FhsProgressBehaviour & { changePts: number; good: boolean | null })[] =>
  behaviours
    .filter(
      (b): b is FhsProgressBehaviour & { changePts: number } =>
        b.changePts !== null && (kind === "all" || b.kind === kind),
    )
    .filter(b => b.changePts !== 0)
    .sort((a, b) => Math.abs(b.changePts) - Math.abs(a.changePts) || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map(b => ({ ...b, good: b.kind === "unhelpful" ? b.changePts < 0 : b.changePts > 0 }));

export const buildTransitions = (
  t: FoundationalSkillsProgressResponse["unhelpfulTransitions"],
): { group: string; value: number }[] =>
  [
    { group: TRANSITION_LABELS.stopped, value: t.stopped },
    { group: TRANSITION_LABELS.never, value: t.never },
    { group: TRANSITION_LABELS.persisted, value: t.persisted },
    { group: TRANSITION_LABELS.started, value: t.started },
  ].filter(p => p.value > 0);

export const buildTrendMix = (
  t: FoundationalSkillsProgressResponse["trend"],
): { group: string; value: number }[] =>
  (["improving", "steady", "declining", "tooEarly"] as const)
    .map(k => ({ group: TREND_LABELS[k], value: t[k] }))
    .filter(p => p.value > 0);

export const buildDose = (dose: FoundationalSkillsProgressResponse["dose"]): Point[] =>
  dose.map(d => ({ group: DOSE_SERIES, key: d.label, value: d.avgChange, learners: d.learners }));

/* -------------------------------------------------------------------------- */
/* Takeaways — one honest sentence each, or nothing                           */
/* -------------------------------------------------------------------------- */

export const tierTakeaway = (
  byCut: FhsProgressCut[],
  windows: { early: number[]; late: number[] },
): string | undefined => {
  const avgOver = (cuts: number[], pick: (c: FhsProgressCut) => number | null) => {
    const vals = byCut
      .filter(c => cuts.includes(c.cut))
      .map(pick)
      .filter((v): v is number => v !== null);
    return vals.length === cuts.length && vals.length
      ? vals.reduce((a, b) => a + b) / vals.length
      : null;
  };
  const moves = (["engage", "understand", "support"] as FhsTier[])
    .map(tier => {
      const pick = (c: FhsProgressCut) => c.tiers.find(t => t.tier === tier)?.avgLevel ?? null;
      const e = avgOver(windows.early, pick);
      const l = avgOver(windows.late, pick);
      return e !== null && l !== null ? { tier, change: l - e } : null;
    })
    .filter((m): m is { tier: FhsTier; change: number } => m !== null)
    .sort((a, b) => b.change - a.change);
  if (moves.length < 2) return undefined;
  const top = moves[0];
  const bottom = moves[moves.length - 1];
  return `${TIER_LABELS[top.tier]} moved most (${signed(top.change)}); ${TIER_LABELS[bottom.tier]} least (${signed(bottom.change)}).`;
};

export const skillChangeTakeaway = (skills: FhsProgressSkill[]): string | undefined => {
  const shown = skills
    .filter((s): s is FhsProgressSkill & { change: number } => s.change !== null)
    .sort((a, b) => b.change - a.change);
  if (shown.length === 0) return undefined;
  const best = shown[0];
  const worst = shown[shown.length - 1];
  if (shown.length === 1 || best.change === worst.change) {
    return `${best.name}: ${signed(best.change)} for the same learners.`;
  }
  return `Biggest gain: ${best.name} (${signed(best.change)}). Biggest drop: ${worst.name} (${signed(worst.change)}).`;
};

export const transitionsTakeaway = (
  t: FoundationalSkillsProgressResponse["unhelpfulTransitions"],
): string | undefined => {
  const total = t.stopped + t.persisted + t.started + t.never;
  if (total === 0) return undefined;
  return `${t.stopped} of ${total} stopped showing an unhelpful behaviour; ${t.started} started.`;
};

export const trendTakeaway = (
  t: FoundationalSkillsProgressResponse["trend"],
  minCuts: number,
): string | undefined => {
  const classified = t.improving + t.steady + t.declining;
  if (classified === 0) return undefined;
  return `Of ${classified} learner${classified === 1 ? "" : "s"} with ${minCuts}+ cuts, ${t.improving} improving and ${t.declining} declining against their own start.`;
};

export const panelOptionLabel = (o: { cuts: number; learners: number }): string =>
  `First ${o.cuts} cuts · ${o.learners} learner${o.learners === 1 ? "" : "s"}`;
