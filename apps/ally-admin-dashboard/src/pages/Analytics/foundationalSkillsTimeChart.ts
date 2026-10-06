import { CONTEXT, ColorScale, PALETTE, STAT } from "./chartScales";
import { proseList } from "./effectivenessChart";
import {
  Ci,
  FhsTier,
  TIER_LABELS,
  ciText,
  pValue,
  pct,
  signed,
} from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";

/**
 * Highlights → Helping skills, "Time, breaks and difficulty": types for the
 * three all-time endpoints behind it and the pure helpers that shape them.
 *
 *  - `GET /v1/analytics/foundational-skills/time-to-competence` (AAQ-205)
 *  - `GET /v1/analytics/foundational-skills/retention`          (AAQ-206)
 *  - `GET /v1/analytics/practice-progression`                   (AAQ-207)
 *
 * (AAQ-219 reads the segments endpoint; its types live in ./effectivenessChart.)
 *
 * Mirrors ally-be `src/analytics/dto/foundational-skills-effectiveness.dto.ts`.
 * Every floor is the server's: a `null` share or change stays a gap, and the
 * counts beside it are what the reader gets instead.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AnalyticsScopingLite {
  tenantId: string | null;
  unscopedSections: string[];
}

export interface TimeToCompetencePoint {
  cut: number;
  atRisk: number;
  reachedAtCut: number;
  censoredAtCut: number;
  reachedShare: number | null;
}

export interface TimeToCompetenceMissingSkill {
  skill: string;
  name: string;
  missingLearners: number;
  neverAssessed: number;
  assessedBelow: number;
  sharePct: number | null;
}

export interface TimeToCompetenceTier {
  tier: FhsTier;
  skills: string[];
  skillsRequired: number;
  points: TimeToCompetencePoint[];
  reachedLearners: number;
  notReachedLearners: number;
  medianCuts: number | null;
  notReachedByHalf: boolean;
  lastShownCut: number | null;
  medianMinutes: number | null;
  minutesLearners: number;
  missing: {
    learners: number;
    mostOftenMissing: string | null;
    skills: TimeToCompetenceMissingSkill[];
  };
}

export interface TimeToCompetenceResponse {
  rubricVersion: string;
  cutSizeLearnerChars: number;
  minSampleSize: number;
  minCohortSize: number;
  competenceLevel: number;
  tierCompetenceSkills: Record<FhsTier, number>;
  excludedSkills: { skill: string; reason: "capped" | "rare" }[];
  learners: number;
  learnersWithoutFirstCut: number;
  maxCut: number;
  tiers: TimeToCompetenceTier[];
  scoping: AnalyticsScopingLite;
  provenance: { derivation: string; note: string };
  computedAt: string;
}

export type RetentionBandKey = "<7" | "7-13" | "14-29" | "30+";

export interface RetentionChange {
  pairs: number;
  learners: number;
  measurable: boolean;
  change: number | null;
  ci: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface RetentionBand {
  band: RetentionBandKey | string;
  label: string;
  minDays: number;
  maxDays: number | null;
  reference: boolean;
  medianGapDays: number | null;
  composite: RetentionChange;
  unhelpful: RetentionChange;
}

export interface SkillRetentionResponse {
  rubricVersion: string;
  cutSizeLearnerChars: number;
  minSampleSize: number;
  minPairs: number;
  minLearners: number;
  bandDefs: { band: string; label: string; minDays: number; maxDays: number | null }[];
  learners: number;
  pairs: {
    considered: number;
    nonAdjacent: number;
    sameSession: number;
    missingTimes: number;
    overlapping: number;
    plotted: number;
  };
  bands: RetentionBand[];
  takeaway: {
    referenceBand: string;
    referenceChange: number | null;
    referenceCi: Ci;
    longBreakBand: string;
    longBreakChange: number | null;
    longBreakCi: Ci;
  };
  scoping: AnalyticsScopingLite;
  provenance: { derivation: string; note: string };
  computedAt: string;
}

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "untagged";

export interface PracticeProgressionCell {
  sessions: number;
  counts: Record<DifficultyLevel, number>;
  shares: Record<DifficultyLevel, number | null>;
}

export interface PracticeProgressionOrdinal extends PracticeProgressionCell {
  ordinal: number;
  experienced: PracticeProgressionCell;
}

export interface PracticeProgressionResponse {
  maxOrdinal: number;
  minSampleSize: number;
  experiencedMinSessions: number;
  levels: DifficultyLevel[];
  learners: number;
  experiencedLearners: number;
  ordinals: PracticeProgressionOrdinal[];
  scoping: AnalyticsScopingLite;
  provenance: { derivation: string; note: string };
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Time to competence (AAQ-205)                                               */
/* -------------------------------------------------------------------------- */

const TIER_ORDER: FhsTier[] = ["engage", "understand", "support"];

/** One line per tier. Unordered enough to need separable hues, few enough for three. */
export const TIER_LINE_SCALE: ColorScale = {
  [TIER_LABELS.engage]: PALETTE.blue,
  [TIER_LABELS.understand]: PALETTE.purple,
  [TIER_LABELS.support]: PALETTE.teal,
};

/** "Slice 3" — the x-axis key; ≤ 14 characters for Carbon's tick truncation. */
export const sliceKey = (cut: number): string => `Slice ${cut}`;

export interface CompetencePoint {
  group: string;
  key: string;
  /** Null where the server withheld the share: Carbon breaks the line there. */
  value: number | null;
  atRisk: number;
  reachedAtCut: number;
  censoredAtCut: number;
}

/**
 * Step-line series, slice-major so the x-axis categories appear in slice
 * order whatever length each tier's curve has. A withheld share stays on the
 * axis as a null, which breaks the line rather than joining across it.
 */
export const competenceSeries = (r: TimeToCompetenceResponse): CompetencePoint[] => {
  const tiers = TIER_ORDER.map(t => r.tiers.find(x => x.tier === t)).filter(
    (t): t is TimeToCompetenceTier => !!t,
  );
  const maxCut = tiers.reduce(
    (m, t) => Math.max(m, t.points.length ? t.points[t.points.length - 1].cut : 0),
    0,
  );
  const out: CompetencePoint[] = [];
  for (let cut = 1; cut <= maxCut; cut += 1) {
    for (const t of tiers) {
      const p = t.points.find(x => x.cut === cut);
      if (!p) continue;
      out.push({
        group: TIER_LABELS[t.tier],
        key: sliceKey(cut),
        value: p.reachedShare,
        atRisk: p.atRisk,
        reachedAtCut: p.reachedAtCut,
        censoredAtCut: p.censoredAtCut,
      });
    }
  }
  return out;
};

export const hasCompetencePoints = (r: TimeToCompetenceResponse): boolean =>
  r.tiers.some(t => t.points.some(p => p.reachedShare !== null));

/** One tier's headline: median slices (or "not reached by half"), median minutes. */
export const tierHeadline = (t: TimeToCompetenceTier): string | null => {
  const name = TIER_LABELS[t.tier];
  const minutes =
    t.medianMinutes !== null
      ? `, ${Math.round(t.medianMinutes)} min of practice among those who got there`
      : "";
  if (t.medianCuts !== null) {
    return `${name}: median ${t.medianCuts} slice${t.medianCuts === 1 ? "" : "s"}${minutes}`;
  }
  if (t.notReachedByHalf) {
    return `${name}: not reached by half${t.lastShownCut !== null ? ` by slice ${t.lastShownCut}` : ""}${minutes}`;
  }
  return null;
};

export const competenceTakeaway = (r: TimeToCompetenceResponse): string | undefined => {
  const lines = TIER_ORDER.map(tier => r.tiers.find(t => t.tier === tier))
    .filter((t): t is TimeToCompetenceTier => !!t)
    .map(tierHeadline)
    .filter((s): s is string => !!s);
  return lines.length ? `${lines.join(" · ")}.` : undefined;
};

/** The rule per tier, from the response: "Engage 2 of 3, Understand 3 of 4, Support 2 of 3". */
export const competenceRule = (r: TimeToCompetenceResponse): string =>
  TIER_ORDER.map(tier => r.tiers.find(t => t.tier === tier))
    .filter((t): t is TimeToCompetenceTier => !!t)
    .map(t => `${TIER_LABELS[t.tier]} ${t.skillsRequired} of ${t.skills.length}`)
    .join(", ");

/** Caption fragment naming every excluded skill and why it is left out. */
export const excludedSkillsText = (r: TimeToCompetenceResponse): string => {
  const capped = r.excludedSkills.filter(e => e.reason === "capped").map(e => e.skill);
  const rare = r.excludedSkills.filter(e => e.reason === "rare").map(e => e.skill);
  const parts = [
    capped.length ? `${proseList(capped)} (capped at level 2 by the rubric)` : null,
    rare.length ? `${proseList(rare)} (assessable only when the client raises them)` : null,
  ].filter(Boolean);
  return parts.length ? `Left out of every tier: ${parts.join("; ")}.` : "";
};

/** "Engage: Empathy, warmth and genuineness" — what not-yet-reached learners lack, per tier. */
export const mostOftenMissing = (r: TimeToCompetenceResponse): string[] =>
  TIER_ORDER.map(tier => r.tiers.find(t => t.tier === tier))
    .filter((t): t is TimeToCompetenceTier => !!t && !!t.missing.mostOftenMissing)
    .map(t => {
      const skill = t.missing.skills.find(s => s.skill === t.missing.mostOftenMissing);
      const name = skill?.name ?? t.missing.mostOftenMissing ?? "";
      const never =
        skill && skill.neverAssessed ? `, ${skill.neverAssessed} never had the chance` : "";
      return `${TIER_LABELS[t.tier]}: ${name}${
        skill ? ` (${skill.missingLearners} of ${t.missing.learners} not yet there${never})` : ""
      }`;
    });

export const competenceTable = (r: TimeToCompetenceResponse) => ({
  columns: [
    "Tier",
    "Slice",
    "Still at risk",
    "Reached at this slice",
    "Stopped here (censored)",
    "Reached by this slice (%)",
  ],
  rows: TIER_ORDER.map(tier => r.tiers.find(t => t.tier === tier))
    .filter((t): t is TimeToCompetenceTier => !!t)
    .flatMap(t =>
      t.points.map(p => [
        TIER_LABELS[t.tier],
        p.cut,
        p.atRisk,
        p.reachedAtCut,
        p.censoredAtCut,
        p.reachedShare,
      ]),
    ) as (string | number | null)[][],
});

/** Lines for the CSV preamble: per-tier headline and rule, plus the excluded skills. */
export const competenceExportContext = (r: TimeToCompetenceResponse): string[] => [
  `Rule: ${competenceRule(r)} skills at level ${r.competenceLevel}+ at least once`,
  excludedSkillsText(r),
  ...r.tiers.map(t => tierHeadline(t) ?? `${TIER_LABELS[t.tier]}: too few learners to state`),
  r.provenance.note,
];

/* -------------------------------------------------------------------------- */
/* Retention after a break (AAQ-206)                                          */
/* -------------------------------------------------------------------------- */

/**
 * One whisker per gap band, shortest first. The under-7-days band is the
 * reference: slice-to-slice change carries noise and any steady drift whatever
 * the gap, so a long-break row is read against it, not against zero.
 */
export const retentionRows = (r: SkillRetentionResponse): WhiskerRow[] =>
  r.bands.map(b => ({
    key: b.band,
    label: b.label,
    sublabel: [
      b.reference ? "Reference: no real break" : null,
      `${b.composite.pairs} pair${b.composite.pairs === 1 ? "" : "s"} from ${b.composite.learners} learner${
        b.composite.learners === 1 ? "" : "s"
      }`,
      b.medianGapDays !== null ? `median gap ${b.medianGapDays} days` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    change: b.composite.change,
    ci: b.composite.ci,
    n: b.composite.learners,
    detectable: b.composite.detectable,
  }));

const bandLabel = (r: SkillRetentionResponse, band: string): string =>
  r.bands.find(b => b.band === band)?.label ?? r.bandDefs.find(b => b.band === band)?.label ?? band;

/**
 * The card's one sentence, from the server's `takeaway` block: both bands with
 * their intervals, not a subtracted difference (they are different pairs, so a
 * difference would have no interval). Worded as an association, and without
 * presuming a drop: spaced practice can help as well as a gap can hurt.
 */
export const retentionTakeaway = (r: SkillRetentionResponse): string | undefined => {
  const t = r.takeaway;
  if (t.referenceChange === null) return undefined;
  const long = bandLabel(r, t.longBreakBand);
  const ref = bandLabel(r, t.referenceBand);
  if (t.longBreakChange === null) {
    return `After a gap of ${ref.toLowerCase()}, the next slice moves ${signed(t.referenceChange)} (95% CI ${ciText(
      t.referenceCi,
    )}). Too few learners have come back after ${long.toLowerCase()} to compare yet.`;
  }
  return `After a break of ${long.toLowerCase()}, learners' next slice moves ${signed(
    t.longBreakChange,
  )} (95% CI ${ciText(t.longBreakCi)}), against ${signed(t.referenceChange)} (${ciText(
    t.referenceCi,
  )}) after a gap of ${ref.toLowerCase()} — associated with the break, not caused by it.`;
};

/** Pairs that could not be placed on a band, for the caption. */
export const unplottedPairs = (r: SkillRetentionResponse): number =>
  r.pairs.sameSession + r.pairs.missingTimes;

export const retentionTable = (r: SkillRetentionResponse) => ({
  columns: [
    "Gap",
    "Reference",
    "Pairs",
    "Learners",
    "Median gap (days)",
    "Score change",
    "Score 95% CI",
    "Up / down / tied",
    "Sign test",
    "Unhelpful change (pts)",
    "Unhelpful 95% CI",
  ],
  rows: r.bands.map(b => [
    b.label,
    b.reference ? "Yes" : "No",
    b.composite.pairs,
    b.composite.learners,
    b.medianGapDays,
    b.composite.change,
    ciText(b.composite.ci),
    `${b.composite.up} / ${b.composite.down} / ${b.composite.tied}`,
    pValue(b.composite.signP),
    b.unhelpful.change,
    ciText(b.unhelpful.ci, 1),
  ]) as (string | number | null)[][],
});

/* -------------------------------------------------------------------------- */
/* Difficulty mix by practice ordinal (AAQ-207)                               */
/* -------------------------------------------------------------------------- */

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  untagged: "Untagged",
};

/** Ordered levels: one hue, darker = harder; untagged is structure, so grey. */
export const DIFFICULTY_SCALE: ColorScale = {
  [DIFFICULTY_LABELS.EASY]: STAT.p50,
  [DIFFICULTY_LABELS.MEDIUM]: STAT.avg,
  [DIFFICULTY_LABELS.HARD]: STAT.p95,
  [DIFFICULTY_LABELS.untagged]: CONTEXT.faint,
};

const LEVEL_ORDER: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD", "untagged"];

export type ProgressionPanel = "all" | "experienced";

/** "Session 12" — the x-axis key; ≤ 14 characters. */
export const sessionKey = (ordinal: number): string => `Session ${ordinal}`;

const cellOf = (o: PracticeProgressionOrdinal, panel: ProgressionPanel): PracticeProgressionCell =>
  panel === "experienced" ? o.experienced : o;

/**
 * 100%-stacked series. An ordinal whose shares the server withheld keeps its
 * axis slot with null values — an empty column, not a column of zeros.
 */
export const progressionSeries = (
  r: PracticeProgressionResponse,
  panel: ProgressionPanel,
): { group: string; key: string; value: number | null; count: number; sessions: number }[] => {
  const levels = r.levels?.length ? r.levels : LEVEL_ORDER;
  return r.ordinals.flatMap(o => {
    const cell = cellOf(o, panel);
    return levels.map(level => ({
      group: DIFFICULTY_LABELS[level] ?? level,
      key: sessionKey(o.ordinal),
      value: cell.shares[level] ?? null,
      count: cell.counts[level] ?? 0,
      sessions: cell.sessions,
    }));
  });
};

export const hasProgressionShares = (
  r: PracticeProgressionResponse,
  panel: ProgressionPanel,
): boolean => r.ordinals.some(o => cellOf(o, panel).shares.HARD !== null);

/** Ordinals whose shares are withheld under the floor, for the caption. */
export const withheldOrdinals = (
  r: PracticeProgressionResponse,
  panel: ProgressionPanel,
): number[] =>
  r.ordinals
    .filter(o => cellOf(o, panel).sessions > 0 && cellOf(o, panel).shares.HARD === null)
    .map(o => o.ordinal);

/**
 * The first and last ordinal the server stated, and the Hard share at each —
 * "whether practice moves learners from simple to complex scenarios"
 * (Stacks: "Simplifying Conditions for Task Class Sequencing").
 */
export const progressionTakeaway = (
  r: PracticeProgressionResponse,
  panel: ProgressionPanel,
): string | undefined => {
  const shown = r.ordinals.filter(o => cellOf(o, panel).shares.HARD !== null);
  if (shown.length < 2) return undefined;
  const first = shown[0];
  const last = shown[shown.length - 1];
  const who =
    panel === "experienced"
      ? `learners with ${r.experiencedMinSessions}+ sessions`
      : "all learners";
  return `Hard scenarios: ${pct(cellOf(first, panel).shares.HARD)} of session ${first.ordinal}s, ${pct(
    cellOf(last, panel).shares.HARD,
  )} of session ${last.ordinal}s (${who}).`;
};

export const progressionTable = (r: PracticeProgressionResponse, panel: ProgressionPanel) => ({
  columns: [
    "Session",
    "Sessions",
    ...LEVEL_ORDER.map(l => `${DIFFICULTY_LABELS[l]} (count)`),
    ...LEVEL_ORDER.map(l => `${DIFFICULTY_LABELS[l]} (%)`),
  ],
  rows: r.ordinals.map(o => {
    const cell = cellOf(o, panel);
    return [
      o.ordinal,
      cell.sessions,
      ...LEVEL_ORDER.map(l => cell.counts[l] ?? 0),
      ...LEVEL_ORDER.map(l => cell.shares[l] ?? null),
    ];
  }) as (string | number | null)[][],
});
