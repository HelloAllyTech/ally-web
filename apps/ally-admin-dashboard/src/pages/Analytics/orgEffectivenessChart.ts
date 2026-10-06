import { Ci, ciText, pct, signed } from "./foundationalSkillsProgressChart";

import type { ChartTableData } from "./ChartDetailModal";

/**
 * Highlights → Orgs, "Org effectiveness scorecard" (AAQ-232):
 * `GET /v1/analytics/effectiveness/orgs`. Mirrors ally-be
 * `effectiveness-orgs-analytics.dto.ts`.
 *
 * One row per non-test org, plus the platform-wide reference row on top. Every
 * learner number is a learner's change against their own earlier self (ruler
 * R1); completion is ruler R10. Rows below the floor keep their counts and
 * say "withheld" for every rate — the server sends `null`, and this file
 * never rebuilds a rate from the counts beside it.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface EffectivenessOrgChange {
  learners: number;
  earlyAvg: number | null;
  lateAvg: number | null;
  change: number | null;
  ci: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface EffectivenessOrgTrend {
  classifiable: number;
  improving: number;
  steady: number;
  declining: number;
  unclassified: number;
  improvingPct: number | null;
  steadyPct: number | null;
  decliningPct: number | null;
}

export interface EffectivenessOrgCourses {
  learnersStarted: number;
  started: number;
  completed: number;
  completionPct: number | null;
}

export interface EffectivenessOrgSelfHarm {
  internal: true;
  learnersWithCue: number;
  cutsWithCue: number;
  cutsFollowedUp: number;
  cutsMissed: number;
  cutsAmbiguous: number;
  followedUpPct: number | null;
}

export interface EffectivenessOrgMetrics {
  scoredLearners: number;
  measurableLearners: number;
  classifiableLearners: number;
  scoredCuts: number;
  belowFloor: boolean;
  composite: EffectivenessOrgChange;
  trend: EffectivenessOrgTrend;
  unhelpful: EffectivenessOrgChange;
  courses: EffectivenessOrgCourses;
  selfHarm: EffectivenessOrgSelfHarm;
  spark: (number | null)[];
  sparkCuts: number[];
}

export interface EffectivenessOrgRow extends EffectivenessOrgMetrics {
  tenantId: string;
  tenantName: string;
  code: string | null;
}

export interface EffectivenessOrgsResponse {
  rubricVersion: string;
  minSampleSize: number;
  minCohortSize: number;
  thresholds: { trendMinCuts: number; learnerBandZ: number };
  scoreDomain: [number, number];
  cutNoiseSd: number | null;
  sparkMonths: string[];
  sparkMinCuts: number;
  summary: {
    orgs: number;
    orgsWithData: number;
    orgsAboveFloor: number;
    cutsUnattributed: number;
    learnersUnattributed: number;
  };
  platform: EffectivenessOrgMetrics;
  orgs: EffectivenessOrgRow[];
  scoping: { tenantId: string | null; unscopedSections: string[] };
  provenance: { derivation: string; note: string };
  computedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Rows and cells                                                             */
/* -------------------------------------------------------------------------- */

export const PLATFORM_KEY = "__platform";
export const PLATFORM_LABEL = "All orgs (platform)";

export interface ScorecardRow {
  key: string;
  name: string;
  code: string | null;
  platform: boolean;
  metrics: EffectivenessOrgMetrics;
}

/** The platform reference row first, then the orgs in the server's order (most measurable learners first — never by a rate). */
export const scorecardRows = (d: EffectivenessOrgsResponse): ScorecardRow[] => [
  { key: PLATFORM_KEY, name: PLATFORM_LABEL, code: null, platform: true, metrics: d.platform },
  ...d.orgs.map(o => ({
    key: o.tenantId,
    name: o.tenantName,
    code: o.code,
    platform: false,
    metrics: o,
  })),
];

/** What one cell says: the value, a quieter note, and whether it is a withheld number. */
export interface Cell {
  text: string;
  note?: string;
  withheld?: boolean;
  /** For a change: coloured only when its interval excludes zero. */
  detectable?: boolean;
  change?: number | null;
}

const WITHHELD = "withheld";

export const compositeCell = (m: EffectivenessOrgMetrics): Cell =>
  m.composite.change === null
    ? { text: WITHHELD, note: `n = ${m.composite.learners}`, withheld: true }
    : {
        text: signed(m.composite.change),
        note: `[${ciText(m.composite.ci)}] · ${m.composite.learners}`,
        detectable: m.composite.detectable,
        change: m.composite.change,
      };

export const improvingCell = (m: EffectivenessOrgMetrics): Cell =>
  m.trend.improvingPct === null
    ? { text: WITHHELD, note: `n = ${m.trend.classifiable}`, withheld: true }
    : { text: pct(m.trend.improvingPct), note: `${m.trend.improving} of ${m.trend.classifiable}` };

/** Percentage points of slices with an unhelpful behaviour; down is good. */
export const unhelpfulCell = (m: EffectivenessOrgMetrics): Cell =>
  m.unhelpful.change === null
    ? { text: WITHHELD, note: `n = ${m.unhelpful.learners}`, withheld: true }
    : {
        text: `${signed(m.unhelpful.change, 1)} pts`,
        note: `[${ciText(m.unhelpful.ci, 1)}]`,
        // Down is the good direction here, so the colour flips: a detectable
        // fall reads green, a detectable rise red.
        detectable: m.unhelpful.detectable,
        change: -m.unhelpful.change,
      };

export const completionCell = (m: EffectivenessOrgMetrics): Cell => {
  if (m.courses.started === 0) return { text: "—", note: "no course started" };
  if (m.courses.completionPct === null) {
    return { text: WITHHELD, note: `n = ${m.courses.started} started`, withheld: true };
  }
  return {
    text: pct(m.courses.completionPct),
    note: `${m.courses.completed} of ${m.courses.started}`,
  };
};

/** Internal: unaudited judge coding of a safety behaviour. */
export const selfHarmCell = (m: EffectivenessOrgMetrics): Cell => {
  const s = m.selfHarm;
  if (s.learnersWithCue === 0) return { text: "—", note: "no cue met" };
  if (s.followedUpPct === null) {
    return { text: WITHHELD, note: `n = ${s.learnersWithCue} learners`, withheld: true };
  }
  return {
    text: pct(s.followedUpPct),
    note: `${s.cutsFollowedUp} followed up, ${s.cutsMissed} missed${
      s.cutsAmbiguous > 0 ? `, ${s.cutsAmbiguous} unclear` : ""
    }`,
  };
};

const monthLabel = (iso: string): string => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
};

/** "May 2026 → Oct 2026" — the sparkline's shared x-axis, named in the caption. */
export const sparkAxisText = (months: string[]): string =>
  months.length === 0 ? "" : `${monthLabel(months[0])} → ${monthLabel(months[months.length - 1])}`;

export const scorecardTakeaway = (d: EffectivenessOrgsResponse): string | undefined => {
  if (d.orgs.length === 0) return undefined;
  const above = `${d.summary.orgsAboveFloor} of ${d.summary.orgsWithData} orgs have ${d.minSampleSize}+ measurable learners.`;
  const p = d.platform;
  if (p.composite.change === null) {
    return `${above} Platform change withheld (n = ${p.composite.learners} learners with enough slices).`;
  }
  const improving =
    p.trend.improvingPct === null
      ? ""
      : `; ${pct(p.trend.improvingPct)} of ${p.trend.classifiable} classifiable learners improving beyond noise`;
  return `${above} Platform: composite ${signed(p.composite.change)} start → now (95% CI ${ciText(
    p.composite.ci,
  )})${improving}.`;
};

export const scorecardTable = (d: EffectivenessOrgsResponse): ChartTableData => ({
  columns: [
    "Org",
    "Code",
    "Measurable learners",
    "Scored learners",
    "Classifiable learners",
    "Scored slices",
    "Below floor",
    "Composite start",
    "Composite now",
    "Composite change",
    "Composite 95% CI",
    "Improving",
    "Steady",
    "Declining",
    "Unclassified",
    "Improving %",
    "Unhelpful start %",
    "Unhelpful now %",
    "Unhelpful change (pts)",
    "Unhelpful 95% CI",
    "Course enrolments started",
    "Course enrolments completed",
    "Completion %",
    "Self-harm cue: learners (internal)",
    "Self-harm cue: followed up (internal)",
    "Self-harm cue: missed (internal)",
    "Self-harm cue: unclear (internal)",
    "Self-harm cue: followed-up % (internal)",
    ...d.sparkMonths.map(m => `Median composite ${m.slice(0, 7)}`),
  ],
  rows: scorecardRows(d).map(r => {
    const m = r.metrics;
    return [
      r.name,
      r.code ?? "",
      m.measurableLearners,
      m.scoredLearners,
      m.classifiableLearners,
      m.scoredCuts,
      m.belowFloor ? "yes" : "no",
      m.composite.earlyAvg,
      m.composite.lateAvg,
      m.composite.change,
      ciText(m.composite.ci),
      m.trend.improving,
      m.trend.steady,
      m.trend.declining,
      m.trend.unclassified,
      m.trend.improvingPct,
      m.unhelpful.earlyAvg,
      m.unhelpful.lateAvg,
      m.unhelpful.change,
      ciText(m.unhelpful.ci, 1),
      m.courses.started,
      m.courses.completed,
      m.courses.completionPct,
      m.selfHarm.learnersWithCue,
      m.selfHarm.cutsFollowedUp,
      m.selfHarm.cutsMissed,
      m.selfHarm.cutsAmbiguous,
      m.selfHarm.followedUpPct,
      ...d.sparkMonths.map((_, i) => m.spark[i] ?? null),
    ];
  }),
});
