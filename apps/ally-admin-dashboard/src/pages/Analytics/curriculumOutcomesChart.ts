/**
 * Curriculum → Courses (AAQ-210..213): types for the three curriculum
 * endpoints and the pure helpers that turn them into rows.
 *
 *  - `GET /v1/analytics/curriculum/course-funnel` (AAQ-210)
 *  - `GET /v1/analytics/curriculum/quiz-outcomes` (AAQ-211, AAQ-212)
 *  - `GET /v1/analytics/curriculum/roleplay-gates` (AAQ-213)
 *
 * The types mirror ally-be `src/analytics/dto/curriculum-analytics.dto.ts`
 * one-for-one. The server applies every floor: a rate below its floor arrives
 * as `null` with its count beside it, and nothing here recomputes a share from
 * the counts — that would quietly undo the suppression.
 */
import type { AnalyticsScoping, AnalyticsWindow } from "@types";

import { ColorScale, OUTCOME_SCALE, PALETTE, sequentialScale } from "./chartScales";
import { Ci, pct, signed } from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";

export interface CurriculumProvenance {
  derivation: string;
  note: string;
}

/* -------------------------------------------------------------------------- */
/* Course funnel — AAQ-210                                                     */
/* -------------------------------------------------------------------------- */

export interface CourseFunnelCourse {
  trackId: string;
  title: string;
  status: string;
  totalItems: number;
  enrolled: number;
  started: number;
  halfway: number;
  completed: number;
  stalled: number;
  startedPct: number | null;
  halfwayPct: number | null;
  completedPct: number | null;
  stalledPct: number | null;
  medianDaysToComplete: number | null;
  daysToCompleteIqr: [number, number] | null;
  inChart: boolean;
}

export interface CourseFunnelTotals {
  courses: number;
  enrolled: number;
  started: number;
  halfway: number;
  completed: number;
  stalled: number;
  completedPct: number | null;
  stalledPct: number | null;
}

export interface CourseFunnelResponse {
  window: AnalyticsWindow;
  minCohortSize: number;
  stalledAfterDays: number;
  chartCourses: number;
  totals: CourseFunnelTotals;
  courses: CourseFunnelCourse[];
  scoping: AnalyticsScoping;
  provenance: CurriculumProvenance;
  computedAt: string;
}

/** The four nested stages, outermost first. Each is a subset of the one before. */
export const FUNNEL_STAGES = ["Enrolled", "Started", "Halfway", "Finished"] as const;
export type FunnelStageLabel = (typeof FUNNEL_STAGES)[number];

/**
 * Ordered categories, so one hue light → dark: the darker the bar, the further
 * through the course. A rainbow here would invent four unrelated things.
 */
export const FUNNEL_STAGE_SCALE: ColorScale = sequentialScale([...FUNNEL_STAGES]);

export interface CourseFunnelRow {
  key: string;
  label: string;
  sublabel: string;
  /** Counts, outermost first, in {@link FUNNEL_STAGES} order. */
  counts: number[];
  /** Server shares in the same order (Enrolled is always the base, so null). */
  pcts: (number | null)[];
  stalled: number;
  stalledPct: number | null;
}

const plural = (n: number, word: string, many = `${word}s`) =>
  `${n.toLocaleString()} ${n === 1 ? word : many}`;

/** Days, at most one decimal: "12 days", "3.5 days". */
export const daysText = (d: number | null): string =>
  d === null ? "—" : `${Number.isInteger(d) ? d : d.toFixed(1)} day${d === 1 ? "" : "s"}`;

/**
 * One row per course the server flagged `inChart` (its top courses by
 * enrolments), in the server's order — most enrolments first.
 */
export const courseFunnelRows = (courses: CourseFunnelCourse[]): CourseFunnelRow[] =>
  courses
    .filter(c => c.inChart)
    .map(c => ({
      key: c.trackId,
      label: c.title,
      sublabel: [
        plural(c.totalItems, "item"),
        c.status === "ARCHIVED" ? "archived" : null,
        c.medianDaysToComplete !== null
          ? `median ${daysText(c.medianDaysToComplete)} to finish`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      counts: [c.enrolled, c.started, c.halfway, c.completed],
      pcts: [null, c.startedPct, c.halfwayPct, c.completedPct],
      stalled: c.stalled,
      stalledPct: c.stalledPct,
    }));

/** Courses with enrolments that the bar chart leaves to the table. */
export const coursesOffChart = (courses: CourseFunnelCourse[]): number =>
  courses.filter(c => !c.inChart).length;

/** The headline: how much of the cohort finished, and how much of it stalled. */
export const courseFunnelTakeaway = (r: CourseFunnelResponse): string => {
  const t = r.totals;
  if (t.enrolled === 0) return "";
  const base = `${plural(t.enrolled, "enrolment")} across ${plural(t.courses, "course")}`;
  if (t.completedPct === null) {
    return `${base}: too few to state a completion rate (need ${r.minCohortSize}).`;
  }
  const stalled =
    t.stalledPct !== null
      ? `; ${pct(t.stalledPct)} of those who started have had no activity for ${r.stalledAfterDays}+ days`
      : "";
  const rated = r.courses.filter(c => c.completedPct !== null);
  const lowest =
    rated.length > 1
      ? rated.reduce((lo, c) => ((c.completedPct ?? 0) < (lo.completedPct ?? 0) ? c : lo))
      : null;
  const low = lowest ? ` Lowest completion: ${lowest.title} (${pct(lowest.completedPct)}).` : "";
  return `${base}: ${pct(t.completedPct)} finished${stalled}.${low}`;
};

/** Expanded-view table: every course, with rates only where the server stated them. */
export const courseFunnelTable = (courses: CourseFunnelCourse[]) => ({
  columns: [
    "Course",
    "Status",
    "Items",
    "Enrolled",
    "Started",
    "Halfway",
    "Finished",
    "Stalled",
    "Started %",
    "Halfway %",
    "Finished %",
    "Stalled % of started",
    "Median days to finish",
    "Days to finish (p25–p75)",
    "In chart",
  ],
  rows: courses.map(c => [
    c.title,
    c.status,
    c.totalItems,
    c.enrolled,
    c.started,
    c.halfway,
    c.completed,
    c.stalled,
    c.startedPct,
    c.halfwayPct,
    c.completedPct,
    c.stalledPct,
    c.medianDaysToComplete,
    c.daysToCompleteIqr ? `${c.daysToCompleteIqr[0]}–${c.daysToCompleteIqr[1]}` : null,
    c.inChart ? "yes" : "no",
  ]),
});

/* -------------------------------------------------------------------------- */
/* Quiz outcomes — AAQ-211, AAQ-212                                            */
/* -------------------------------------------------------------------------- */

export interface QuizMissedQuestion {
  questionId: string;
  type: string | null;
  position: number | null;
  wrong: number;
  graded: number;
  wrongPct: number | null;
}

export interface QuizFirstToBest {
  learners: number;
  firstAvg: number | null;
  bestAvg: number | null;
  change: number | null;
  changeCi: Ci;
  up: number;
  down: number;
  tied: number;
  signP: number | null;
  detectable: boolean;
}

export interface QuizOutcome {
  trackItemId: string;
  title: string;
  trackId: string;
  trackTitle: string;
  firstAttempts: number;
  unscoredFirstAttempts: number;
  passedFirst: number;
  passedFirstPct: number | null;
  retried: number;
  retriedPct: number | null;
  passedLater: number;
  withheld: boolean;
  firstToBest: QuizFirstToBest;
  missedQuestions: QuizMissedQuestion[];
}

export interface QuizOutcomesSummary {
  quizzes: number;
  measurable: number;
  firstAttempts: number;
}

export interface QuizOutcomesResponse {
  window: AnalyticsWindow;
  minSampleSize: number;
  scoreDomain: [number, number];
  summary: QuizOutcomesSummary;
  quizzes: QuizOutcome[];
  scoping: AnalyticsScoping;
  provenance: CurriculumProvenance;
  computedAt: string;
}

/** Quizzes the first-attempt chart draws; the rest are in the expanded view. */
export const QUIZ_CHART_ROWS = 15;

export const FIRST_PASS_SERIES = "Passed on the first attempt";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: "single choice",
  mcq_multi: "multiple choice",
  true_false: "true/false",
  ordering: "ordering",
  matching: "matching",
  fill_blank: "fill in the blank",
  open_ended: "open-ended",
};

/**
 * A question by position and type — the only handles there are. The server
 * never sends question text, and an id is meaningless to a reader, so a
 * question removed since is named as removed rather than by its id.
 */
export const questionLabel = (q: Pick<QuizMissedQuestion, "position" | "type">): string => {
  const type = q.type ? (QUESTION_TYPE_LABELS[q.type] ?? q.type.replace(/_/g, " ")) : null;
  if (q.position === null) return "A question since removed";
  return type ? `Question ${q.position} (${type})` : `Question ${q.position}`;
};

/** "Question 3 (single choice): 45% wrong of 40" — the wrong share only when stated. */
export const missedQuestionText = (q: QuizMissedQuestion): string =>
  `${questionLabel(q)}: ${
    q.wrongPct === null
      ? `${q.wrong} of ${q.graded} wrong`
      : `${pct(q.wrongPct)} wrong of ${q.graded}`
  }`;

/**
 * Bar labels that stay distinct. Carbon draws one bar per distinct `group`, so
 * two courses that both call their quiz "Module 1 quiz" would merge into one
 * bar; the second gets its course appended.
 */
const distinctLabels = (quizzes: QuizOutcome[]): Map<string, string> => {
  const seen = new Map<string, number>();
  quizzes.forEach(q => seen.set(q.title, (seen.get(q.title) ?? 0) + 1));
  const labels = new Map<string, string>();
  const used = new Set<string>();
  quizzes.forEach(q => {
    let label = (seen.get(q.title) ?? 0) > 1 ? `${q.title} · ${q.trackTitle}` : q.title;
    let i = 2;
    while (used.has(label)) {
      label = `${q.title} (${i})`;
      i += 1;
    }
    used.add(label);
    labels.set(q.trackItemId, label);
  });
  return labels;
};

/** Quizzes with a stated first-attempt pass share, hardest first (the server's order). */
export const measurableQuizzes = (quizzes: QuizOutcome[]): QuizOutcome[] =>
  quizzes.filter(q => !q.withheld && q.passedFirstPct !== null);

export const withheldQuizzes = (quizzes: QuizOutcome[]): QuizOutcome[] =>
  quizzes.filter(q => q.withheld || q.passedFirstPct === null);

/**
 * AAQ-211 bars: the hardest `limit` quizzes (default {@link QUIZ_CHART_ROWS}), hardest at the TOP.
 * Carbon draws a horizontal chart's first category at the bottom, so the
 * hardest-first list is handed over reversed.
 */
export const firstPassBars = (
  quizzes: QuizOutcome[],
  limit: number = QUIZ_CHART_ROWS,
): { group: string; value: number; key: string }[] => {
  const shown = measurableQuizzes(quizzes).slice(0, limit);
  const labels = distinctLabels(shown);
  return shown
    .map(q => ({
      group: labels.get(q.trackItemId) ?? q.title,
      key: FIRST_PASS_SERIES,
      value: q.passedFirstPct as number,
    }))
    .reverse();
};

/** One colour for every bar: the chart has one measure, and the order is the point. */
export const firstPassScale = (bars: { group: string }[]): ColorScale =>
  Object.fromEntries(bars.map(b => [b.group, PALETTE.blue]));

/** "Quiz A (n = 4), Quiz B (n = 2)" — the withheld quizzes, most attempts first, capped. */
export const withheldList = (rows: { title: string; n: number }[], max = 6): string | null => {
  if (rows.length === 0) return null;
  const head = rows.slice(0, max).map(r => `${r.title} (n = ${r.n})`);
  const rest = rows.length - head.length;
  return `${head.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}`;
};

export const firstPassTakeaway = (r: QuizOutcomesResponse): string | undefined => {
  const hardest = measurableQuizzes(r.quizzes)[0];
  if (!hardest) return undefined;
  const of = `${r.summary.measurable} of ${plural(r.summary.quizzes, "quiz", "quizzes")} have ${r.minSampleSize}+ first attempts`;
  return `Hardest first time: ${hardest.title} (${hardest.trackTitle}), ${pct(
    hardest.passedFirstPct,
  )} passed on the first attempt (n = ${hardest.firstAttempts}). ${of}.`;
};

/**
 * AAQ-212 rows: first → best per quiz, among learners with a second scored
 * attempt. Drawn grey whatever the interval says (`detectable: false`): best is
 * at least first by construction, so an interval above zero is built in, and
 * green would read it as learning.
 */
export const firstToBestRows = (quizzes: QuizOutcome[]): WhiskerRow[] =>
  quizzes
    .filter(q => q.firstToBest.learners > 0)
    .map(q => {
      const f = q.firstToBest;
      const scores =
        f.firstAvg !== null && f.bestAvg !== null
          ? `${Math.round(f.firstAvg)} → ${Math.round(f.bestAvg)}`
          : null;
      const retried = q.retriedPct !== null ? `${pct(q.retriedPct)} tried again` : null;
      return {
        key: q.trackItemId,
        label: q.title,
        sublabel: [q.trackTitle, scores, retried].filter(Boolean).join(" · "),
        change: f.change,
        ci: f.changeCi,
        n: f.learners,
        detectable: false,
      };
    });

export const firstToBestTakeaway = (r: QuizOutcomesResponse): string | undefined => {
  const stated = r.quizzes.filter(q => q.firstToBest.change !== null);
  if (stated.length === 0) return undefined;
  const top = stated.reduce((a, b) =>
    (b.firstToBest.change ?? 0) > (a.firstToBest.change ?? 0) ? b : a,
  );
  const f = top.firstToBest;
  return `Biggest recovery on a retry: ${top.title}, ${signed(f.change, 0)} points (95% CI ${
    f.changeCi ? `${signed(f.changeCi[0], 0)} to ${signed(f.changeCi[1], 0)}` : "—"
  }, n = ${f.learners}).`;
};

/** Expanded view: every quiz, with its most-missed questions by position and type. */
export const quizOutcomesTable = (quizzes: QuizOutcome[]) => ({
  columns: [
    "Quiz",
    "Course",
    "Scored first attempts",
    "Awaiting grading or unscored",
    "Passed first",
    "Passed first %",
    "Tried again %",
    "Passed later",
    "Retried, paired",
    "First avg",
    "Best avg",
    "First → best (pts)",
    "95% CI",
    "Most missed on the first attempt",
  ],
  rows: quizzes.map(q => [
    q.title,
    q.trackTitle,
    q.firstAttempts,
    q.unscoredFirstAttempts,
    q.passedFirst,
    q.passedFirstPct,
    q.retriedPct,
    q.passedLater,
    q.firstToBest.learners,
    q.firstToBest.firstAvg === null ? null : Math.round(q.firstToBest.firstAvg),
    q.firstToBest.bestAvg === null ? null : Math.round(q.firstToBest.bestAvg),
    q.firstToBest.change === null ? null : signed(q.firstToBest.change, 1),
    q.firstToBest.changeCi
      ? `${signed(q.firstToBest.changeCi[0], 1)} to ${signed(q.firstToBest.changeCi[1], 1)}`
      : null,
    q.missedQuestions.length ? q.missedQuestions.map(missedQuestionText).join("; ") : null,
  ]),
});

/* -------------------------------------------------------------------------- */
/* Roleplay gates — AAQ-213                                                    */
/* -------------------------------------------------------------------------- */

export type RoleplayGateCalibration = "tooHard" | "tooEasy";

export interface RoleplayGate {
  trackItemId: string;
  title: string;
  trackId: string;
  trackTitle: string;
  scenarioId: number | null;
  minScore: number;
  progressRows: number;
  passedFirst: number;
  passedLater: number;
  stuck: number;
  inProgress: number;
  passedFirstPct: number | null;
  passedLaterPct: number | null;
  stuckPct: number | null;
  inProgressPct: number | null;
  medianAttemptsToPass: number | null;
  calibration: RoleplayGateCalibration | null;
  withheld: boolean;
}

export interface RoleplayGatesSummary {
  items: number;
  measurable: number;
  tooHard: number;
  tooEasy: number;
  progressRows: number;
  ungatedItems: number;
}

export interface RoleplayGatesResponse {
  minSampleSize: number;
  minCohortSize: number;
  stuckAfterDays: number;
  calibrationBand: { tooHardBelowPct: number; tooEasyAbovePct: number };
  summary: RoleplayGatesSummary;
  items: RoleplayGate[];
  scoping: AnalyticsScoping;
  provenance: CurriculumProvenance;
  computedAt: string;
}

/**
 * The four outcomes of a gate, in stack order. Worded about the gate, not the
 * learner: a learner does not "fail" a scenario-scaled threshold.
 */
export const GATE_OUTCOMES = [
  "Cleared first time",
  "Cleared later",
  "Stuck",
  "In progress",
] as const;
export type GateOutcome = (typeof GATE_OUTCOMES)[number];

/** Built from the shared outcome colours, so green and gold mean what they mean elsewhere. */
export const GATE_OUTCOME_SCALE: Record<GateOutcome, string> = {
  "Cleared first time": OUTCOME_SCALE.Completed,
  "Cleared later": PALETTE.teal,
  Stuck: OUTCOME_SCALE.Failed,
  "In progress": OUTCOME_SCALE["In progress"],
};

export interface GateSegment {
  outcome: GateOutcome;
  count: number;
  pct: number;
}

export interface GateRow {
  key: string;
  label: string;
  sublabel: string;
  segments: GateSegment[];
  n: number;
  flag: string | null;
}

export const calibrationText = (
  c: RoleplayGateCalibration | null,
  band: RoleplayGatesResponse["calibrationBand"],
): string | null => {
  if (c === "tooHard")
    return `check calibration: under ${band.tooHardBelowPct}% clear it first time`;
  if (c === "tooEasy") {
    return `check calibration: over ${band.tooEasyAbovePct}% clear it first time`;
  }
  return null;
};

/**
 * One 100%-stacked row per measurable gate, lowest first-time clearance first
 * (the server's order). The shares are the server's; a withheld gate has none
 * to stack and is listed with its n instead, never drawn from its counts.
 */
export const gateRows = (r: RoleplayGatesResponse): GateRow[] =>
  r.items
    .filter(g => !g.withheld && g.passedFirstPct !== null)
    .map(g => {
      const shares: [GateOutcome, number, number | null][] = [
        ["Cleared first time", g.passedFirst, g.passedFirstPct],
        ["Cleared later", g.passedLater, g.passedLaterPct],
        ["Stuck", g.stuck, g.stuckPct],
        ["In progress", g.inProgress, g.inProgressPct],
      ];
      return {
        key: g.trackItemId,
        label: g.title,
        sublabel: [
          g.trackTitle,
          `gate ${g.minScore}`,
          g.medianAttemptsToPass !== null
            ? `median ${g.medianAttemptsToPass} ${g.medianAttemptsToPass === 1 ? "attempt" : "attempts"} to clear`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        segments: shares
          .filter(([, , p]) => p !== null && p > 0)
          .map(([outcome, count, p]) => ({ outcome, count, pct: p as number })),
        n: g.progressRows,
        flag: calibrationText(g.calibration, r.calibrationBand),
      };
    });

export const gatesTakeaway = (r: RoleplayGatesResponse): string | undefined => {
  if (r.summary.measurable === 0) return undefined;
  const flagged = r.items.filter(g => g.calibration !== null);
  if (flagged.length === 0) {
    const band = `${r.calibrationBand.tooHardBelowPct}–${r.calibrationBand.tooEasyAbovePct}% first-time clearance`;
    return r.summary.measurable === 1
      ? `The one measurable gate sits inside ${band}.`
      : `All ${r.summary.measurable} measurable gates sit inside ${band}.`;
  }
  const names = flagged
    .slice(0, 4)
    .map(g => `${g.title} (${pct(g.passedFirstPct)} first time)`)
    .join(", ");
  const more = flagged.length > 4 ? `, and ${flagged.length - 4} more` : "";
  return `Check calibration: ${names}${more}.`;
};

export const gatesTable = (r: RoleplayGatesResponse) => ({
  columns: [
    "Roleplay",
    "Course",
    "Gate (min score)",
    "Learners who tried",
    "Cleared first time",
    "Cleared later",
    "Stuck",
    "In progress",
    "Cleared first time %",
    "Cleared later %",
    "Stuck %",
    "In progress %",
    "Median attempts to clear",
    "Calibration",
  ],
  rows: r.items.map(g => [
    g.title,
    g.trackTitle,
    g.minScore,
    g.progressRows,
    g.passedFirst,
    g.passedLater,
    g.stuck,
    g.inProgress,
    g.passedFirstPct,
    g.passedLaterPct,
    g.stuckPct,
    g.inProgressPct,
    g.medianAttemptsToPass,
    g.withheld
      ? `withheld: n = ${g.progressRows}, need ${r.minSampleSize}`
      : (calibrationText(g.calibration, r.calibrationBand) ?? "inside the band"),
  ]),
});
