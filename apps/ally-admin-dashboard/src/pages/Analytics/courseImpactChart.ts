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

/**
 * The free-practice reference (the grey whisker): learners who never enrolled,
 * read at the same point in their own practice as the pooled course learners —
 * before = their slices up to position `matchedStartPosition`, after = from
 * `matchedStartPosition + matchedGap` on. A reference, not a control.
 */
export interface CourseImpactReference extends CourseImpactComparison {
  /** Never-enrolled learners with at least one scored slice — the pool. */
  candidates: number;
  /** k: median position of the course learners' last slice before the course. */
  matchedStartPosition: number | null;
  /** g: median gap from that slice to their first slice after it. */
  matchedGap: number | null;
}

export interface CourseImpactCourse {
  trackId: string;
  title: string;
  status: string;
  coverage: CourseImpactCoverage;
  composite: CourseImpactComparison;
  /** Rubric skills the course teaches, mapped from its competencies (see `competencySource`). */
  targetedSkills: string[];
  /**
   * Where those competencies come from: `explicit` = the author tagged the
   * course; `derived` = read off its roleplays' scenarios; null = neither names
   * a shared competency. Optional for the deploy window, like the three below.
   */
  competencySource?: CompetencySource | null;
  /*
   * The three below are optional only for the deploy window: a backend from
   * before the pooled/reference release omits them, and the tab must still
   * render the rows it can.
   */
  /** The same object as the response's top-level `reference`, on every course. */
  reference?: CourseImpactReference;
  /** Median days enrol → finish; null below `minCohortSize` finishers. */
  medianDaysToComplete?: number | null;
  /** Median scored slices between the last before and first after; null below `minCohortSize`. */
  medianCutsBetween?: number | null;
}

export type CompetencySource = "explicit" | "derived";

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
  /** Per-course medians below this many learners are withheld. Optional: see CourseImpactCourse. */
  minCohortSize?: number;
  scoreDomain: [number, number];
  windowCuts: number;
  summary: CourseImpactSummary;
  /**
   * Every paired learner across all courses, each counted ONCE (at their
   * earliest-finished course with slices on both sides). Optional: see
   * CourseImpactCourse.
   */
  pooled?: CourseImpactComparison;
  /** The free-practice reference, once for the whole response. Optional: see CourseImpactCourse. */
  reference?: CourseImpactReference;
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

/** "12 days" / "3.5 days" — at most one decimal, for a median. */
const daysText = (d: number): string =>
  `${Number.isInteger(d) ? d : d.toFixed(1)} day${d === 1 ? "" : "s"}`;

/**
 * The course's pace, when the server stated it: how long finishing took and
 * how much practice fell between the two sides of the comparison. Null when
 * neither is stated (withheld below the cohort floor, or an older backend).
 */
export const coursePace = (c: CourseImpactCourse): string | null => {
  const parts = [
    c.medianDaysToComplete !== null && c.medianDaysToComplete !== undefined
      ? `median ${daysText(c.medianDaysToComplete)} to finish`
      : null,
    c.medianCutsBetween !== null && c.medianCutsBetween !== undefined
      ? `${c.medianCutsBetween % 1 === 0 ? c.medianCutsBetween : c.medianCutsBetween.toFixed(1)} ${
          c.medianCutsBetween === 1 ? "slice" : "slices"
        } between`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

/**
 * One whisker row per course with at least one paired learner, most paired
 * first (the server's order). A course nobody can be compared on yet would
 * only add a row of "n = 0"; those are counted, not drawn.
 */
export const courseRows = (courses: CourseImpactCourse[]): WhiskerRow[] =>
  courses
    .filter(c => c.coverage.paired > 0)
    .map(c => {
      const pace = coursePace(c);
      return {
        key: c.trackId,
        label: c.title,
        sublabel: `${
          c.composite.beforeAvg !== null && c.composite.afterAvg !== null
            ? `${c.composite.beforeAvg.toFixed(2)} → ${c.composite.afterAvg.toFixed(2)} · ${
                c.coverage.paired
              } of ${c.coverage.enrolled} enrolled`
            : `${c.coverage.paired} of ${c.coverage.enrolled} enrolled can be compared`
        }${pace ? ` · ${pace}` : ""}`,
        change: c.composite.change,
        ci: c.composite.changeCi,
        n: c.composite.learners,
        detectable: c.composite.detectable,
      };
    });

/** The label of the pooled row, which heads the per-course list. */
export const POOLED_LABEL = "All courses, each learner once";

/** The label of the grey free-practice whisker. */
export const REFERENCE_LABEL = "Free practice, same slice positions";

/**
 * The pooled row: every paired learner across all courses, counted once. Null
 * when the backend sent no pooled comparison or nobody is paired.
 */
export const pooledRow = (pooled: CourseImpactComparison | undefined): WhiskerRow | null => {
  if (!pooled || pooled.learners === 0) return null;
  return {
    key: "__pooled__",
    label: POOLED_LABEL,
    sublabel:
      pooled.beforeAvg !== null && pooled.afterAvg !== null
        ? `${pooled.beforeAvg.toFixed(2)} → ${pooled.afterAvg.toFixed(2)} · ${pooled.learners} learners`
        : `${pooled.learners} learners can be compared`,
    change: pooled.change,
    ci: pooled.changeCi,
    n: pooled.learners,
    detectable: pooled.detectable,
  };
};

/**
 * Which slices the reference compares, in words: "slices 4–6 against 10–12".
 * Mirrors the server's definition (before = positions k − w + 1 … k clamped
 * at 1, after = k + g … k + g + w − 1); it describes the window, it does not
 * compute anything from it.
 */
export const referenceWindowText = (
  ref: CourseImpactReference,
  windowCuts: number,
): string | null => {
  const k = ref.matchedStartPosition;
  const g = ref.matchedGap;
  if (k === null || g === null) return null;
  const span = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);
  return `slices ${span(Math.max(1, k - windowCuts + 1), k)} against ${span(k + g, k + g + windowCuts - 1)}`;
};

/** Change and interval only, for a one-line mention. */
const comparisonLineShort = (c: CourseImpactComparison): string =>
  c.change === null ? `n = ${c.learners}` : `${signed(c.change)} (95% CI ${ciText(c.changeCi)})`;

/**
 * The reference's line under the rows: who it is, which slices, and its n.
 * A withheld reference still says how many learners it rests on.
 */
export const referenceNote = (
  ref: CourseImpactReference | undefined,
  windowCuts: number,
  minN: number,
): string | null => {
  if (!ref) return null;
  if (ref.matchedStartPosition === null) {
    return `${REFERENCE_LABEL}: drawn once a course learner can be compared before and after.`;
  }
  const where = referenceWindowText(ref, windowCuts);
  const who = `${ref.learners} of ${ref.candidates} learners who never enrolled in a course`;
  if (ref.change === null) {
    return `${REFERENCE_LABEL}: withheld — ${who} have practised far enough to compare${
      where ? ` (${where})` : ""
    }; need ${minN}.`;
  }
  return `${REFERENCE_LABEL}: ${who}, read over the same point in their own practice${
    where ? ` (${where})` : ""
  }: ${comparisonLineShort(ref)}.`;
};

/**
 * The pooled sentence for the per-course card's takeaway: all courses
 * together, against free practice over the same slices. "Associated with" in
 * spirit — it states two changes side by side, never that one caused the other.
 */
export const pooledTakeaway = (
  pooled: CourseImpactComparison | undefined,
  ref: CourseImpactReference | undefined,
): string | null => {
  if (!pooled || pooled.change === null) return null;
  const against =
    ref && ref.change !== null
      ? `, against ${signed(ref.change)} for free practice over the same slices`
      : "";
  return `All courses together (${pooled.learners} learners, each once): ${comparisonLineShort(
    pooled,
  )}${against}.`;
};

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

/** Where a course's taught skills come from, as a short parenthetical; null when unknown. */
export const competencySourceText = (source: CompetencySource | null | undefined): string | null =>
  source === "explicit"
    ? "tagged by the author"
    : source === "derived"
      ? "from its roleplays"
      : null;

/**
 * Per-skill rows for the chosen course: the skills it teaches first (marked,
 * with where that comes from when known), then the rest in rubric order.
 * Skills nobody could show on both sides are left out — a skill with no
 * opportunity is absent, not low.
 */
export const skillRows = (
  skills: CourseImpactSkill[],
  source?: CompetencySource | null,
): WhiskerRow[] => {
  const shown = skills.filter(s => s.comparison.learners > 0);
  const from = competencySourceText(source);
  const taught = from ? `Taught in this course (${from})` : "Taught in this course";
  return [...shown.filter(s => s.targeted), ...shown.filter(s => !s.targeted)].map(s => ({
    key: s.skill,
    label: s.name,
    sublabel: s.targeted ? taught : undefined,
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
