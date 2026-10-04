/**
 * Course impact (Highlights → Course impact): types for
 * `GET /v1/analytics/course-impact` and the pure helpers that turn it into rows.
 *
 * The server does all the pairing and statistics (ally-be
 * `src/analytics/service/course-impact-analytics.service.ts`); nothing here
 * recomputes a mean or an interval. These helpers only choose what to show and
 * how to word it, so the tab's components stay plain markup.
 */
import { Ci, ciText, pValue, signed } from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";
import type { FunnelStage } from "./FunnelBars";

export interface CourseImpactComparison {
  learners: number;
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

export interface CourseImpactCoverage {
  enrolled: number;
  started: number;
  completed: number;
  withBaseline: number;
  paired: number;
}

export interface CourseImpactCourse {
  trackId: string;
  title: string;
  status: string;
  coverage: CourseImpactCoverage;
  composite: CourseImpactComparison;
  targetedSkills: string[];
}

export interface CourseImpactSkill {
  skill: string;
  name: string;
  targeted: boolean;
  comparison: CourseImpactComparison;
}

export interface CourseImpactDetail {
  trackId: string;
  title: string;
  competencies: string[];
  skills: CourseImpactSkill[];
  unhelpful: CourseImpactComparison;
}

export interface CourseImpactSummary {
  courses: number;
  measurable: number;
  improved: number;
  declined: number;
  unclear: number;
  pairedEnrollments: number;
}

export interface CourseImpactResponse {
  rubricVersion: string;
  minSampleSize: number;
  scoreDomain: [number, number];
  windowCuts: number;
  summary: CourseImpactSummary;
  courses: CourseImpactCourse[];
  course: CourseImpactDetail | null;
  provenance: string;
  computedAt: string;
}

export interface CourseImpactQuery {
  tenantId?: string;
  trackId?: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What a course's change amounts to, in words — the same call the colour makes. */
export const courseVerdict = (c: CourseImpactComparison): string => {
  if (c.change === null) return `too few learners to read (n = ${c.learners})`;
  if (!c.detectable) return "no clear change";
  return c.change > 0 ? "improved" : "declined";
};

/**
 * One whisker row per course with at least one paired learner, most paired
 * first (the server's order). A course nobody can be compared on yet would
 * only add a row of "n = 0"; those are counted, not drawn.
 */
export const courseRows = (courses: CourseImpactCourse[]): WhiskerRow[] =>
  courses
    .filter(c => c.coverage.paired > 0)
    .map(c => ({
      key: c.trackId,
      label: c.title,
      sublabel:
        c.composite.beforeAvg !== null && c.composite.afterAvg !== null
          ? `${c.composite.beforeAvg.toFixed(2)} → ${c.composite.afterAvg.toFixed(2)} · ${
              c.coverage.paired
            } of ${c.coverage.enrolled} enrolled`
          : `${c.coverage.paired} of ${c.coverage.enrolled} enrolled can be compared`,
      change: c.composite.change,
      ci: c.composite.changeCi,
      n: c.composite.learners,
      detectable: c.composite.detectable,
    }));

/** Courses with no learner comparable on both sides — said in a line under the rows. */
export const unpairedCourseCount = (courses: CourseImpactCourse[]): number =>
  courses.filter(c => c.coverage.paired === 0).length;

/**
 * The funnel from enrolled to paired. Each stage is a subset of the one before
 * (the server guarantees it), so the step that loses the most learners is the
 * reason the course is thin.
 */
export const coverageStages = (c: CourseImpactCoverage): FunnelStage[] => [
  { label: "Enrolled", reached: c.enrolled },
  { label: "Started", reached: c.started },
  { label: "Finished", reached: c.completed },
  { label: "Practised before", reached: c.withBaseline },
  { label: "Practised after", reached: c.paired, terminal: true },
];

/**
 * The step where the most learners leave the measure, for the funnel's
 * takeaway: "most learners drop out at …". Null when nobody is lost.
 */
export const biggestCoverageGap = (
  c: CourseImpactCoverage,
): { from: string; to: string; lost: number } | null => {
  const stages = coverageStages(c);
  let best: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < stages.length; i += 1) {
    const lost = stages[i - 1].reached - stages[i].reached;
    if (lost > 0 && (!best || lost > best.lost)) {
      best = { from: stages[i - 1].label, to: stages[i].label, lost };
    }
  }
  return best;
};

/**
 * Why a thin course is thin, by the step that loses the most learners.
 *
 * Deliberately no "add a roleplay at the start or end of the course" advice: a
 * course's own roleplays happen between starting and finishing, so they count
 * on neither side of this comparison.
 */
export const coverageAdvice = (c: CourseImpactCoverage): string | null => {
  const gap = biggestCoverageGap(c);
  if (!gap) return null;
  const who = gap.lost === 1 ? "1 learner" : `${gap.lost} learners`;
  switch (gap.to) {
    case "Started":
      return `Most lost here: ${who} enrolled but never started.`;
    case "Finished":
      return `Most lost here: ${who} started but have not finished, so there is no "after" yet.`;
    case "Practised before":
      return `Most lost here: ${who} had no scored roleplay practice before they started, so there is no starting point to compare against.`;
    default:
      return `Most lost here: ${who} have not done scored roleplay practice since finishing, so there is no "after" yet.`;
  }
};

/**
 * Per-skill rows for the chosen course: the skills its roleplays teach first
 * (marked), then the rest in rubric order. Skills nobody could show on both
 * sides are left out — a skill with no opportunity is absent, not low.
 */
export const skillRows = (skills: CourseImpactSkill[]): WhiskerRow[] => {
  const shown = skills.filter(s => s.comparison.learners > 0);
  return [...shown.filter(s => s.targeted), ...shown.filter(s => !s.targeted)].map(s => ({
    key: s.skill,
    label: s.name,
    sublabel: s.targeted ? "Taught in this course" : undefined,
    change: s.comparison.change,
    ci: s.comparison.changeCi,
    n: s.comparison.learners,
    detectable: s.comparison.detectable,
  }));
};

/** The headline sentence under the per-course card's title. */
export const courseTakeaway = (summary: CourseImpactSummary, minN: number): string => {
  if (summary.courses === 0) return "";
  if (summary.measurable === 0) {
    return `No course has ${minN} learners with practice both before and after it yet.`;
  }
  const parts = [
    summary.improved ? `${summary.improved} improved` : null,
    summary.declined ? `${summary.declined} declined` : null,
    summary.unclear ? `${summary.unclear} show no clear change` : null,
  ].filter(Boolean);
  return `Of ${plural(summary.measurable, "course")} with enough learners to read: ${parts.join(", ")}.`;
};

/** A comparison's numbers in one line: change, interval, ups and downs, test. */
export const comparisonLine = (c: CourseImpactComparison, decimals = 2, unit = ""): string =>
  c.change === null
    ? `n = ${c.learners}`
    : `${signed(c.change, decimals)}${unit} (95% CI ${ciText(c.changeCi, decimals)}; ${c.up} up, ${
        c.down
      } down, ${pValue(c.signP)})`;

/** A 0–1 share as a whole percentage, for the unhelpful-behaviour card. */
export const sharePct = (v: number | null): string =>
  v === null ? "—" : `${Math.round(v * 100)}%`;

/** A 0–1 share comparison re-expressed in percentage points, for ChangeWhiskers-style text. */
export const toPoints = (c: CourseImpactComparison): CourseImpactComparison => ({
  ...c,
  beforeAvg: c.beforeAvg === null ? null : Math.round(c.beforeAvg * 100),
  afterAvg: c.afterAvg === null ? null : Math.round(c.afterAvg * 100),
  change: c.change === null ? null : Math.round(c.change * 100),
  changeCi: c.changeCi ? [Math.round(c.changeCi[0] * 100), Math.round(c.changeCi[1] * 100)] : null,
});

/**
 * Wording for the unhelpful-behaviour verdict. Down is the good direction
 * here, so this is spelled out rather than reusing the up-is-good verdict.
 */
export const unhelpfulVerdict = (c: CourseImpactComparison): string => {
  if (c.change === null) return `too few learners to read (n = ${c.learners})`;
  if (!c.detectable) return "no clear change";
  return c.change < 0 ? "less often after the course" : "more often after the course";
};
