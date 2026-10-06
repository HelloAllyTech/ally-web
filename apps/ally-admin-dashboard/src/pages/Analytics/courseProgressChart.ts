/**
 * Curriculum → Courses, part two (AAQ-225, AAQ-226): types for the two
 * course-progress endpoints and the pure helpers that turn them into series.
 *
 *  - `GET /v1/analytics/curriculum/progress-curve` (AAQ-225) — where in each
 *    course learners stop.
 *  - `GET /v1/analytics/curriculum/knowledge-vs-skill` (AAQ-226) — do quiz
 *    scores go with roleplay skill?
 *
 * The types mirror ally-be `src/analytics/dto/course-progress-analytics.dto.ts`
 * one-for-one. Both endpoints are all-time by construction. The server applies
 * every floor; nothing here derives a share or a correlation from the points.
 */
import type { AnalyticsScoping } from "@types";

import { ColorScale, PALETTE, stableScale } from "./chartScales";
import { Ci, pct } from "./foundationalSkillsProgressChart";

export interface CourseProgressProvenance {
  derivation: string;
  note: string;
}

/* -------------------------------------------------------------------------- */
/* Progress curve — AAQ-225                                                    */
/* -------------------------------------------------------------------------- */

export interface ProgressCurvePoint {
  position: number;
  positionPct: number;
  itemId: string;
  itemTitle: string;
  itemType: string;
  reached: number;
  reachedPct: number | null;
  opened: number;
  openedPct: number | null;
}

export interface ProgressCurveDrop {
  fromPosition: number;
  fromItemId: string;
  fromItemTitle: string;
  fromItemType: string;
  toPosition: number | null;
  toItemId: string | null;
  toItemTitle: string | null;
  toFinish: boolean;
  lost: number;
  dropPts: number;
}

export interface ProgressCurveCourseSummary {
  trackId: string;
  title: string;
  status: string;
  items: number;
  enrolments: number;
  startedEnrolments: number;
  completed: number;
  completedPct: number | null;
  steepestDrop: ProgressCurveDrop | null;
  inChart: boolean;
}

export interface ProgressCurveCourse extends ProgressCurveCourseSummary {
  points: ProgressCurvePoint[];
}

export interface ProgressCurveResponse {
  minSampleSize: number;
  chartCourses: number;
  courses: ProgressCurveCourse[];
  others: ProgressCurveCourseSummary[];
  belowFloor: ProgressCurveCourseSummary[];
  totals: { courses: number; measurable: number; enrolments: number; startedEnrolments: number };
  provenance: CourseProgressProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** "ROLEPLAY" → "roleplay": item types read as words, not enum values. */
export const itemTypeWord = (type: string): string => type.toLowerCase().replace(/_/g, " ");

/**
 * One series name per course that stays distinct: Carbon draws one line per
 * distinct `group`, so two courses with the same title would merge into one
 * line. The second gets its status appended, then a counter.
 */
export const distinctCourseNames = (
  courses: { trackId: string; title: string; status: string }[],
): Map<string, string> => {
  const seen = new Map<string, number>();
  courses.forEach(c => seen.set(c.title, (seen.get(c.title) ?? 0) + 1));
  const names = new Map<string, string>();
  const used = new Set<string>();
  courses.forEach(c => {
    let name = (seen.get(c.title) ?? 0) > 1 ? `${c.title} (${c.status.toLowerCase()})` : c.title;
    let i = 2;
    while (used.has(name)) {
      name = `${c.title} (${i})`;
      i += 1;
    }
    used.add(name);
    names.set(c.trackId, name);
  });
  return names;
};

export interface CurvePoint {
  group: string;
  x: number;
  y: number;
  item: string;
}

/**
 * The drawn courses as line points: x = position through the course (0–100),
 * y = the server's share of started learners who reached the item. A point
 * with no share (a zero denominator) is left out rather than drawn at 0.
 */
export const progressCurvePoints = (courses: ProgressCurveCourse[]): CurvePoint[] => {
  const names = distinctCourseNames(courses);
  return courses.flatMap(c =>
    c.points
      .filter(p => p.reachedPct !== null)
      .map(p => ({
        group: names.get(c.trackId) ?? c.title,
        x: p.positionPct,
        y: p.reachedPct as number,
        item: `${p.position}. ${p.itemTitle}`,
      })),
  );
};

/** Stable colour per course name, so a course keeps its colour as the set changes. */
export const progressCurveScale = (courses: ProgressCurveCourse[]): ColorScale =>
  stableScale([...distinctCourseNames(courses).values()]);

/**
 * Where a course loses the most learners, in words: the item they stopped AT
 * (they reached it, not the next step). Null when it has no drop to name.
 */
export const dropText = (c: ProgressCurveCourseSummary): string | null => {
  const d = c.steepestDrop;
  if (!d) return null;
  const item = `"${d.fromItemTitle}" (${itemTypeWord(d.fromItemType)})`;
  return d.toFinish
    ? `${pct(d.dropPts)} of those who started reach the last item, ${item}, and never finish it`
    : `${pct(d.dropPts)} of those who started stop at item ${d.fromPosition}, ${item}`;
};

/** Every measurable course, drawn or not — the pool the takeaway picks from. */
const measurable = (r: ProgressCurveResponse): ProgressCurveCourseSummary[] => [
  ...r.courses,
  ...r.others,
];

/** The single steepest fall across every measurable course. */
export const progressCurveTakeaway = (r: ProgressCurveResponse): string | undefined => {
  const withDrop = measurable(r).filter(c => c.steepestDrop !== null);
  if (withDrop.length === 0) return undefined;
  const worst = withDrop.reduce((a, b) =>
    (b.steepestDrop?.dropPts ?? 0) > (a.steepestDrop?.dropPts ?? 0) ? b : a,
  );
  return `Steepest fall: ${worst.title} — ${dropText(worst)} (${worst.steepestDrop?.lost} of ${worst.startedEnrolments} learners).`;
};

/** "Course A (n = 12), …" for the courses still under the floor. */
export const belowFloorCourses = (r: ProgressCurveResponse, max = 6): string | null => {
  if (r.belowFloor.length === 0) return null;
  const head = r.belowFloor.slice(0, max).map(c => `${c.title} (n = ${c.startedEnrolments})`);
  const rest = r.belowFloor.length - head.length;
  return `${head.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}`;
};

/** Expanded view: every course, drawn, measurable or below the floor. */
export const progressCurveTable = (r: ProgressCurveResponse) => ({
  columns: [
    "Course",
    "Status",
    "Items",
    "Enrolments",
    "Started",
    "Finished",
    "Finished % of started",
    "Steepest fall at",
    "Fall (pts)",
    "Learners lost there",
    "Drawn",
  ],
  rows: [...r.courses, ...r.others, ...r.belowFloor].map(c => {
    const d = c.steepestDrop;
    return [
      c.title,
      c.status,
      c.items,
      c.enrolments,
      c.startedEnrolments,
      c.completed,
      c.completedPct,
      d
        ? d.toFinish
          ? `last item "${d.fromItemTitle}" → finishing`
          : `item ${d.fromPosition} "${d.fromItemTitle}" (${itemTypeWord(d.fromItemType)})`
        : null,
      d ? d.dropPts : null,
      d ? d.lost : null,
      c.inChart
        ? "yes"
        : r.belowFloor.includes(c)
          ? `no — n = ${c.startedEnrolments}, need ${r.minSampleSize}`
          : "no",
    ];
  }),
});

/* -------------------------------------------------------------------------- */
/* Knowledge vs skill — AAQ-226                                                */
/* -------------------------------------------------------------------------- */

export interface RankCorrelation {
  points: number;
  learners: number;
  r: number | null;
  rCi: Ci;
  detectable: boolean;
}

export interface KnowledgeSkillPoint {
  trackId: string;
  learnerId: number;
  quizScore: number;
  skillScore: number;
  quizzes: number;
  slices: number;
}

export interface KnowledgeSkillCourse {
  trackId: string;
  title: string;
  status: string;
  quizItems: number;
  enrolments: number;
  missingQuiz: number;
  missingSkill: number;
  correlation: RankCorrelation;
}

export interface KnowledgeVsSkillResponse {
  rubricVersion: string;
  minSampleSize: number;
  scoreDomain: [number, number];
  quizScoreDomain: [number, number];
  skillWindowCuts: number;
  coverage: {
    courses: number;
    enrolments: number;
    points: number;
    learners: number;
    missingQuiz: number;
    missingSkill: number;
  };
  overall: RankCorrelation;
  courses: KnowledgeSkillCourse[];
  points: KnowledgeSkillPoint[];
  provenance: CourseProgressProvenance;
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** One series: colouring points by learner or course would encode nothing (see scatterOpts). */
export const KNOWLEDGE_SERIES = "Learner in a course";
export const KNOWLEDGE_SCALE: ColorScale = { [KNOWLEDGE_SERIES]: PALETTE.blue };

export const knowledgePoints = (
  r: KnowledgeVsSkillResponse,
): { group: string; x: number; y: number }[] =>
  r.points.map(p => ({ group: KNOWLEDGE_SERIES, x: p.quizScore, y: p.skillScore }));

/** "+0.21" / "−0.08" — a real minus sign, two decimals. */
const rText = (v: number): string => `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(v).toFixed(2)}`;

/** "r = +0.21 (95% CI −0.05 to +0.44)", or why there is no r yet. */
export const correlationText = (c: RankCorrelation, minN: number): string =>
  c.r === null
    ? c.points < minN
      ? `r withheld: ${c.points} of ${minN} points`
      : "r not computable: one side does not vary"
    : `r = ${rText(c.r)}${c.rCi ? ` (95% CI ${rText(c.rCi[0])} to ${rText(c.rCi[1])})` : ""}`;

/** Wording for a correlation that clears zero, or does not. Never causal. */
const strengthText = (c: RankCorrelation): string => {
  if (c.r === null) return "";
  if (!c.detectable) return "no detectable association";
  const size = Math.abs(c.r) < 0.3 ? "a weak" : Math.abs(c.r) < 0.5 ? "a moderate" : "a strong";
  return `${size} ${c.r > 0 ? "positive" : "negative"} association`;
};

export const knowledgeTakeaway = (r: KnowledgeVsSkillResponse): string | undefined => {
  const o = r.overall;
  if (o.points === 0) return undefined;
  const base = `${o.points} learner-course points (${o.learners} learners)`;
  if (o.r === null) {
    return `${base}: ${correlationText(o, r.minSampleSize)} — the correlation is stated from ${r.minSampleSize}.`;
  }
  const readable = r.courses.filter(c => c.correlation.r !== null).length;
  const perCourse =
    readable > 0
      ? ` ${readable} course${readable === 1 ? " has" : "s have"} enough points to read on its own (expanded view).`
      : "";
  return `Spearman ${correlationText(o, r.minSampleSize)} over ${base}: ${strengthText(o)}.${perCourse}`;
};

/** The learners not on the chart, and why — said under the plot. */
export const knowledgeCoverageNote = (r: KnowledgeVsSkillResponse): string | null => {
  const { missingQuiz, missingSkill } = r.coverage;
  if (missingQuiz === 0 && missingSkill === 0) return null;
  return `Not plotted: ${missingQuiz} enrolment${missingQuiz === 1 ? "" : "s"} with no scored first quiz attempt, and ${missingSkill} with a quiz score but no helping-skills slice after enrolling.`;
};

export const knowledgeTable = (r: KnowledgeVsSkillResponse) => ({
  columns: [
    "Course",
    "Status",
    "Quizzes",
    "Enrolments",
    "Plotted points",
    "Learners",
    "No quiz score",
    "No slice after enrolling",
    "Spearman r",
    "95% CI",
    "Clears zero",
  ],
  rows: r.courses.map(c => [
    c.title,
    c.status,
    c.quizItems,
    c.enrolments,
    c.correlation.points,
    c.correlation.learners,
    c.missingQuiz,
    c.missingSkill,
    c.correlation.r === null ? null : rText(c.correlation.r),
    c.correlation.rCi ? `${rText(c.correlation.rCi[0])} to ${rText(c.correlation.rCi[1])}` : null,
    c.correlation.r === null ? null : c.correlation.detectable ? "yes" : "no",
  ]),
});
