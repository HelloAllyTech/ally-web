import { SatisfactionByOrdinal, SatisfactionOrdinalCell } from "@types";

import { ColorScale, PALETTE } from "./chartScales";
import {
  Ci,
  FhsTier,
  TIER_LABELS,
  ciText,
  pValue,
  pct,
  signed,
} from "./foundationalSkillsProgressChart";
import { rText } from "./foundationalSkillsValidityChart";

import type { WhiskerRow } from "./ChangeWhiskers";
import type { ChartTableData } from "./ChartDetailModal";

/**
 * Highlights → Quality & sentiment, "Perception": how learners feel about
 * their practice and about their own skill, always read beside a measure that
 * is not their own opinion.
 *
 *  - AAQ-229 Satisfaction by practice ordinal — the `byOrdinal` block of
 *    `GET /v1/analytics/quality-distribution` (types in `@types`, beside the
 *    response they extend).
 *  - AAQ-230 Confidence start → now, per tier, and AAQ-231 Confidence against
 *    competence — `GET /v1/analytics/foundational-skills/self-efficacy`
 *    (mirrors ally-be `self-efficacy-analytics.dto.ts`).
 *
 * Every floor is the server's; a `null` stays a gap and its count travels.
 */

/* -------------------------------------------------------------------------- */
/* AAQ-229 · Satisfaction by practice ordinal                                 */
/* -------------------------------------------------------------------------- */

export const ORDINAL_ALL = "All learners";
export const ORDINAL_PANEL = "Experienced panel";

export const ORDINAL_SCALE: ColorScale = {
  [ORDINAL_ALL]: PALETTE.blue,
  [ORDINAL_PANEL]: PALETTE.purple,
};

/** "1st", "2nd", "3rd", "11th", "12th". */
export const ordinalWord = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
};

interface OrdinalPoint {
  group: string;
  key: string;
  value: number | null;
  ratings: number;
  highSharePct: number | null;
}

/**
 * Two lines on the learner's own Nth rated session. A withheld ordinal keeps
 * its place on the axis with a null value, so the line breaks rather than
 * joining across a point nobody can state.
 */
export const ordinalSeries = (b: SatisfactionByOrdinal): OrdinalPoint[] =>
  b.points.flatMap(p => {
    const point = (group: string, c: SatisfactionOrdinalCell): OrdinalPoint => ({
      group,
      key: String(p.ordinal),
      value: c.avgRating,
      ratings: c.ratings,
      highSharePct: c.highSharePct,
    });
    return [point(ORDINAL_ALL, p.all), point(ORDINAL_PANEL, p.experienced)];
  });

export const hasOrdinalValues = (b: SatisfactionByOrdinal): boolean =>
  b.points.some(p => p.all.avgRating !== null || p.experienced.avgRating !== null);

const panelSentence = (
  label: string,
  learners: number,
  b: SatisfactionByOrdinal,
  pick: (p: SatisfactionByOrdinal["points"][number]) => SatisfactionOrdinalCell,
): string | undefined => {
  const stated = b.points.filter(p => pick(p).avgRating !== null);
  if (stated.length === 0) return undefined;
  const first = stated[0];
  const last = stated[stated.length - 1];
  const a = pick(first);
  const z = pick(last);
  if (first === last) {
    return `${label} (${learners} learners): mean rating ${a.avgRating?.toFixed(2)} at the ${ordinalWord(
      first.ordinal,
    )} rated session; later ones have too few ratings to state.`;
  }
  return (
    `${label} (${learners} learners): mean rating ${a.avgRating?.toFixed(2)} at the ${ordinalWord(first.ordinal)} rated session, ` +
    `${z.avgRating?.toFixed(2)} at the ${ordinalWord(last.ordinal)}; rated 4–5 ${pct(a.highSharePct)} → ${pct(z.highSharePct)}.`
  );
};

/** Read the fixed panel first: if only the all-comers line rises, what moved is who still answers. */
export const ordinalTakeaway = (b: SatisfactionByOrdinal): string | undefined => {
  const panel = panelSentence(ORDINAL_PANEL, b.experiencedLearners, b, p => p.experienced);
  const all = panelSentence(ORDINAL_ALL, b.ratedLearners, b, p => p.all);
  const parts = [panel, all].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
};

/** Ordinals someone reached whose mean is withheld (under the floor), all-comers line. */
export const withheldOrdinalCount = (b: SatisfactionByOrdinal): number =>
  b.points.filter(p => p.all.ratings > 0 && p.all.avgRating === null).length;

export const ordinalTable = (b: SatisfactionByOrdinal): ChartTableData => ({
  columns: [
    "Rated session",
    "All: ratings",
    "All: mean rating",
    "All: rated 4–5 (%)",
    "Panel: ratings",
    "Panel: mean rating",
    "Panel: rated 4–5 (%)",
  ],
  rows: b.points.map(p => [
    ordinalWord(p.ordinal),
    p.all.ratings,
    p.all.avgRating,
    p.all.highSharePct,
    p.experienced.ratings,
    p.experienced.avgRating,
    p.experienced.highSharePct,
  ]),
});

/* -------------------------------------------------------------------------- */
/* AAQ-230 / AAQ-231 · Self-efficacy                                          */
/* -------------------------------------------------------------------------- */

export interface SelfEfficacyComparison {
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

export interface SelfEfficacyChangeRow {
  learners: number;
  self: SelfEfficacyComparison;
  selfMatched: SelfEfficacyComparison;
  judge: SelfEfficacyComparison;
  medianDaysApart: number | null;
}

export interface SelfEfficacyTierChange extends SelfEfficacyChangeRow {
  tier: FhsTier;
  label: string;
  skills: string[];
}

export interface SelfEfficacySkillChange extends SelfEfficacyChangeRow {
  skill: string;
  name: string;
  tier: FhsTier;
}

export interface SelfEfficacyCalibrationStats {
  learners: number;
  observations: number;
  overConfident: number;
  calibrated: number;
  underConfident: number;
  overConfidentPct: number | null;
  calibratedPct: number | null;
  underConfidentPct: number | null;
  meanGap: number | null;
  meanGapCi: Ci;
  spearmanR: number | null;
}

export interface SelfEfficacyCalibrationSkill extends SelfEfficacyCalibrationStats {
  skill: string;
  name: string;
  tier: FhsTier;
}

export interface SelfEfficacyPoint {
  skill: string;
  selfRating: number;
  level: number;
}

export interface SelfEfficacySafetyFlag {
  skill: string;
  name: string;
  learners: number;
  overConfident: number;
  overConfidentPct: number | null;
  internal: boolean;
  note: string;
}

export interface SelfEfficacyResponse {
  instrumentVersion: string;
  rubricVersion: string;
  minSampleSize: number;
  minSpearmanPoints: number;
  coverage: {
    learnersAsked: number;
    learnersAnswered: number;
    learnersWithTwoOrMore: number;
    responses: number;
    answeredResponses: number;
    dismissedResponses: number;
    byTrigger: { ONBOARDING: number; CUTS: number; COURSE: number };
    itemsAnswered: number;
    matchedObservations: number;
    unmatchedObservations: number;
  };
  confidence: {
    learnersWithTwoOrMore: number;
    selfDomain: [number, number];
    levelDomain: [number, number];
    tiers: SelfEfficacyTierChange[];
    skills: SelfEfficacySkillChange[];
  };
  calibration: {
    thresholds: { rescale: string; band: number; matchWindowDays: number };
    skills: SelfEfficacyCalibrationSkill[];
    overall: SelfEfficacyCalibrationStats;
    points: SelfEfficacyPoint[];
    pointsTotal: number;
    pointsTruncated: boolean;
    pointCap: number;
    safetyFlag: SelfEfficacySafetyFlag;
  };
  caveat: string;
  provenance: { derivation: string; note: string };
  scoping: { tenantId: string | null; note: string };
  computedAt: string;
}

/**
 * Read on both cards. Learners are poor, often over-confident self-assessors,
 * and the weakest self-assess least well; a self-rating is worth collecting
 * only when it is triangulated with an outside measure (Stacks: "Include
 * Self-Assessment Despite Known Accuracy Limitations").
 */
export const SELF_RATING_CAVEAT =
  "Learners are poor, often over-confident judges of their own skill; this is read beside the AI judge, never on its own.";

export const SELF_EFFICACY_NOT_MEASURED =
  "Not yet measured — the learner self-rating prompt has not shipped yet; the API is ready.";

/** No learner has rated a single item: the instrument has no surface yet. */
export const selfEfficacyNotMeasured = (s: SelfEfficacyResponse): boolean =>
  s.coverage.learnersAnswered === 0;

/**
 * Two whisker blocks per tier: the self-rating (0–10) in colour, the judge's
 * level for the same learners (1–4) beside it. They are on different scales,
 * so they never share an axis; the judge rows are always drawn grey — context
 * for the self-rating, not a second headline.
 */
export const confidenceRows = (
  s: SelfEfficacyResponse,
): { self: WhiskerRow[]; judge: WhiskerRow[] } => ({
  self: s.confidence.tiers.map(t => ({
    key: t.tier,
    label: t.label || TIER_LABELS[t.tier],
    sublabel:
      t.medianDaysApart === null
        ? `${t.learners} learners paired`
        : `${t.learners} learners · median ${t.medianDaysApart} days apart`,
    change: t.self.change,
    ci: t.self.changeCi,
    n: t.self.n,
    detectable: t.self.detectable,
  })),
  judge: s.confidence.tiers.map(t => ({
    key: `${t.tier}-judge`,
    label: t.label || TIER_LABELS[t.tier],
    sublabel:
      t.selfMatched.change === null
        ? "same learners, nearest judged slices"
        : `same learners self-rated ${signed(t.selfMatched.change, 1)}`,
    change: t.judge.change,
    ci: t.judge.changeCi,
    n: t.judge.n,
    // Context, never a headline: grey whatever its interval says (the
    // interval is still printed beside it).
    detectable: false,
  })),
});

export const confidenceTakeaway = (s: SelfEfficacyResponse): string | undefined => {
  const tiers = s.confidence.tiers.filter(t => t.self.change !== null);
  if (tiers.length === 0) return undefined;
  const self = tiers
    .map(t => `${t.label || TIER_LABELS[t.tier]} ${signed(t.self.change, 1)}`)
    .join(", ");
  const judged = tiers.filter(t => t.judge.change !== null);
  const judge =
    judged.length === 0
      ? "The judge's level for the same learners is withheld (too few with judged slices near both answers)."
      : `The judge's level for the same learners (1–4): ${judged
          .map(t => `${t.label || TIER_LABELS[t.tier]} ${signed(t.judge.change)}`)
          .join(", ")}.`;
  return `Self-rated confidence (0–10), first → latest answer: ${self}. ${judge}`;
};

export const confidenceTable = (s: SelfEfficacyResponse): ChartTableData => {
  const row = (label: string, tier: string, r: SelfEfficacyChangeRow) => [
    label,
    tier,
    r.learners,
    r.self.beforeAvg,
    r.self.afterAvg,
    r.self.change,
    ciText(r.self.changeCi, 1),
    pValue(r.self.signP),
    r.selfMatched.change,
    r.judge.n,
    r.judge.beforeAvg,
    r.judge.afterAvg,
    r.judge.change,
    ciText(r.judge.changeCi),
    r.medianDaysApart,
  ];
  return {
    columns: [
      "Tier / skill",
      "Tier",
      "Learners paired",
      "Self first (0–10)",
      "Self latest (0–10)",
      "Self change",
      "Self 95% CI",
      "Self sign test",
      "Self change, judged learners only",
      "Judged learners",
      "Judge first (1–4)",
      "Judge latest (1–4)",
      "Judge change",
      "Judge 95% CI",
      "Median days apart",
    ],
    rows: [
      ...s.confidence.tiers.map(t => row(t.label || TIER_LABELS[t.tier], "—", t)),
      ...s.confidence.skills.map(k => row(k.name, TIER_LABELS[k.tier], k)),
    ],
  };
};

export const CALIBRATION_GROUP = "Answers";
export const CALIBRATION_SCALE: ColorScale = { [CALIBRATION_GROUP]: PALETTE.blue };

/** Deterministic jitter in [−0.5, 0.5): the same dot lands in the same place on every render. */
const jitter = (i: number, salt: number): number => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

/**
 * Scatter points with a small fixed jitter — both axes are integers, so
 * without it a hundred answers stack into one dot. The raw values ride along
 * for the tooltip and the table; the plotted x/y are only for position.
 */
export const calibrationPoints = (s: SelfEfficacyResponse) =>
  s.calibration.points.map((p, i) => ({
    group: CALIBRATION_GROUP,
    x: p.selfRating + jitter(i, 1) * 0.5,
    y: p.level + jitter(i, 2) * 0.35,
    selfRating: p.selfRating,
    level: p.level,
    skill: p.skill,
  }));

export const calibrationTakeaway = (s: SelfEfficacyResponse): string | undefined => {
  const o = s.calibration.overall;
  if (o.learners === 0) return undefined;
  const shares =
    o.overConfidentPct !== null && o.calibratedPct !== null && o.underConfidentPct !== null
      ? ` (${pct(o.overConfidentPct)} / ${pct(o.calibratedPct)} / ${pct(o.underConfidentPct)})`
      : "";
  const r =
    o.spearmanR === null ? "" : `; Spearman r = ${rText(o.spearmanR)} between confidence and level`;
  return (
    `Of ${o.learners} learners (their latest answer matched to a judged slice): ${o.overConfident} over-confident, ` +
    `${o.calibrated} calibrated, ${o.underConfident} under-confident${shares}${r}.`
  );
};

/** The harm line. Internal: unaudited judge coding of a safety behaviour. */
export const safetyFlagText = (f: SelfEfficacySafetyFlag): string =>
  f.learners === 0
    ? `${f.name}: no learner matched to a judged slice yet.`
    : `${f.name}: ${f.overConfident} of ${f.learners} learners over-confident${
        f.overConfidentPct === null ? "" : ` (${pct(f.overConfidentPct)})`
      }.`;

export const calibrationTable = (s: SelfEfficacyResponse): ChartTableData => {
  const row = (label: string, tier: string, c: SelfEfficacyCalibrationStats) => [
    label,
    tier,
    c.learners,
    c.observations,
    c.overConfident,
    c.calibrated,
    c.underConfident,
    c.overConfidentPct,
    c.calibratedPct,
    c.underConfidentPct,
    c.meanGap,
    ciText(c.meanGapCi),
    c.spearmanR,
  ];
  return {
    columns: [
      "Skill",
      "Tier",
      "Learners",
      "Answers matched",
      "Over-confident",
      "Calibrated",
      "Under-confident",
      "Over-confident %",
      "Calibrated %",
      "Under-confident %",
      "Mean gap (levels, self − judge)",
      "Gap 95% CI",
      "Spearman r",
    ],
    rows: [
      row("All skills", "—", s.calibration.overall),
      ...s.calibration.skills.map(k => row(k.name, TIER_LABELS[k.tier], k)),
    ],
  };
};
