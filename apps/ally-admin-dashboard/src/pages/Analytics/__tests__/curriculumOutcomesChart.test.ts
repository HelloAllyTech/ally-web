import { describe, expect, it } from "vitest";

import {
  CourseFunnelCourse,
  CourseFunnelResponse,
  FIRST_PASS_SERIES,
  QUIZ_CHART_ROWS,
  QuizOutcome,
  QuizOutcomesResponse,
  RoleplayGate,
  RoleplayGatesResponse,
  calibrationText,
  courseFunnelRows,
  courseFunnelTable,
  courseFunnelTakeaway,
  coursesOffChart,
  daysText,
  firstPassBars,
  firstPassTakeaway,
  firstToBestRows,
  firstToBestTakeaway,
  gateRows,
  gatesTable,
  gatesTakeaway,
  missedQuestionText,
  questionLabel,
  quizOutcomesTable,
  withheldList,
  withheldQuizzes,
} from "../curriculumOutcomesChart";

const period = {
  from: "2025-10-05",
  to: "2026-10-05",
  label: "Last 12 months",
  days: 365,
  bucket: "month" as const,
  allTime: false,
  inProgressBucket: null,
  computedAt: "2026-10-05T08:00:00.000Z",
};
const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "R10", note: "A recent cohort has had less time." };

const course = (over: Partial<CourseFunnelCourse> = {}): CourseFunnelCourse => ({
  trackId: "t1",
  title: "Listening basics",
  status: "ACTIVE",
  totalItems: 8,
  enrolled: 80,
  started: 70,
  halfway: 52,
  completed: 40,
  stalled: 12,
  startedPct: 87.5,
  halfwayPct: 65,
  completedPct: 50,
  stalledPct: 17.1,
  medianDaysToComplete: 12,
  daysToCompleteIqr: [6, 21.5],
  inChart: true,
  ...over,
});

const funnel = (over: Partial<CourseFunnelResponse> = {}): CourseFunnelResponse => ({
  window: period,
  minCohortSize: 5,
  stalledAfterDays: 30,
  chartCourses: 15,
  totals: {
    courses: 3,
    enrolled: 120,
    started: 100,
    halfway: 70,
    completed: 50,
    stalled: 20,
    completedPct: 41.7,
    stalledPct: 20,
  },
  courses: [
    course(),
    course({ trackId: "t2", title: "Safety first", completedPct: 20, status: "ARCHIVED" }),
    course({
      trackId: "t3",
      title: "Tiny course",
      enrolled: 3,
      started: 2,
      halfway: 1,
      completed: 1,
      stalled: 0,
      startedPct: null,
      halfwayPct: null,
      completedPct: null,
      stalledPct: null,
      medianDaysToComplete: null,
      daysToCompleteIqr: null,
      inChart: false,
    }),
  ],
  scoping,
  provenance,
  computedAt: period.computedAt,
  ...over,
});

describe("course funnel", () => {
  it("draws only the courses the server put in the chart, nested counts outermost first", () => {
    const rows = courseFunnelRows(funnel().courses);
    expect(rows.map(r => r.key)).toEqual(["t1", "t2"]);
    expect(rows[0].counts).toEqual([80, 70, 52, 40]);
    // Enrolled is the base, never a stated share; the rest are the server's.
    expect(rows[0].pcts).toEqual([null, 87.5, 65, 50]);
    expect(rows[0].sublabel).toBe("8 items · median 12 days to finish");
    expect(rows[1].sublabel).toContain("archived");
    expect(coursesOffChart(funnel().courses)).toBe(1);
  });

  it("states the totals and names the lowest-completing course", () => {
    expect(courseFunnelTakeaway(funnel())).toBe(
      "120 enrolments across 3 courses: 41.7% finished; 20% of those who started have had no activity for 30+ days. Lowest completion: Safety first (20%).",
    );
  });

  it("withholds the completion rate rather than computing one", () => {
    const thin = funnel({
      totals: { ...funnel().totals, enrolled: 3, completedPct: null, stalledPct: null },
    });
    expect(courseFunnelTakeaway(thin)).toBe(
      "3 enrolments across 3 courses: too few to state a completion rate (need 5).",
    );
    expect(courseFunnelTakeaway(funnel({ totals: { ...funnel().totals, enrolled: 0 } }))).toBe("");
  });

  it("keeps nulls as nulls in the table", () => {
    const table = courseFunnelTable(funnel().courses);
    const tiny = table.rows[2];
    expect(tiny[table.columns.indexOf("Finished %")]).toBeNull();
    expect(tiny[table.columns.indexOf("Days to finish (p25–p75)")]).toBeNull();
    expect(table.rows[0][table.columns.indexOf("Days to finish (p25–p75)")]).toBe("6–21.5");
    expect(daysText(1)).toBe("1 day");
    expect(daysText(3.25)).toBe("3.3 days");
  });
});

const firstToBest = (over: Partial<QuizOutcome["firstToBest"]> = {}) => ({
  learners: 24,
  firstAvg: 55.2,
  bestAvg: 78.9,
  change: 23.7,
  changeCi: [18, 29.5] as [number, number],
  up: 20,
  down: 0,
  tied: 4,
  signP: 0.0001,
  detectable: true,
  ...over,
});

const quiz = (over: Partial<QuizOutcome> = {}): QuizOutcome => ({
  trackItemId: "q1",
  title: "Module 1 quiz",
  trackId: "t1",
  trackTitle: "Listening basics",
  firstAttempts: 42,
  unscoredFirstAttempts: 2,
  passedFirst: 16,
  passedFirstPct: 38.1,
  retried: 30,
  retriedPct: 71.4,
  passedLater: 18,
  withheld: false,
  firstToBest: firstToBest(),
  missedQuestions: [
    { questionId: "a", type: "mcq_single", position: 3, wrong: 19, graded: 40, wrongPct: 47.5 },
    { questionId: "b", type: null, position: null, wrong: 4, graded: 9, wrongPct: null },
  ],
  ...over,
});

const quizzes = (list: QuizOutcome[]): QuizOutcomesResponse => ({
  window: period,
  minSampleSize: 20,
  scoreDomain: [0, 100],
  summary: {
    quizzes: list.length,
    measurable: list.filter(q => !q.withheld).length,
    firstAttempts: 90,
  },
  quizzes: list,
  scoping,
  provenance,
  computedAt: period.computedAt,
});

describe("quiz outcomes", () => {
  const list = [
    quiz(),
    quiz({ trackItemId: "q2", trackTitle: "Safety first", passedFirstPct: 61 }),
    quiz({ trackItemId: "q3", title: "Final check", passedFirstPct: 90 }),
    quiz({
      trackItemId: "q4",
      title: "Small quiz",
      firstAttempts: 4,
      passedFirstPct: null,
      retriedPct: null,
      withheld: true,
      firstToBest: firstToBest({
        learners: 3,
        firstAvg: null,
        bestAvg: null,
        change: null,
        changeCi: null,
        detectable: false,
      }),
    }),
  ];

  it("hands Carbon the hardest quiz LAST so it draws at the top, with distinct labels", () => {
    const bars = firstPassBars(list);
    // Carbon draws a horizontal chart's first category at the bottom.
    expect(bars.map(b => b.value)).toEqual([90, 61, 38.1]);
    expect(bars.at(-1)?.group).toBe("Module 1 quiz · Listening basics");
    expect(bars[1].group).toBe("Module 1 quiz · Safety first");
    expect(bars.every(b => b.key === FIRST_PASS_SERIES)).toBe(true);
  });

  it("caps the chart and leaves withheld quizzes out of it", () => {
    const many = Array.from({ length: QUIZ_CHART_ROWS + 5 }, (_, i) =>
      quiz({ trackItemId: `m${i}`, title: `Quiz ${i}`, passedFirstPct: i }),
    );
    expect(firstPassBars(many)).toHaveLength(QUIZ_CHART_ROWS);
    expect(firstPassBars(many, Infinity)).toHaveLength(QUIZ_CHART_ROWS + 5);
    expect(withheldQuizzes(list).map(q => q.trackItemId)).toEqual(["q4"]);
  });

  it("names the hardest quiz in the takeaway", () => {
    expect(firstPassTakeaway(quizzes(list))).toBe(
      "Hardest first time: Module 1 quiz (Listening basics), 38.1% passed on the first attempt (n = 42). 3 of 4 quizzes have 20+ first attempts.",
    );
    expect(firstPassTakeaway(quizzes([list[3]]))).toBeUndefined();
  });

  it("draws first → best in grey whatever the interval, since best ≥ first is built in", () => {
    const rows = firstToBestRows(list);
    expect(rows.every(r => r.detectable === false)).toBe(true);
    expect(rows[0].sublabel).toBe("Listening basics · 55 → 79 · 71.4% tried again");
    // A withheld quiz stays listed with its n, with no change to draw.
    expect(rows.find(r => r.key === "q4")).toMatchObject({ change: null, n: 3 });
    expect(firstToBestTakeaway(quizzes(list))).toBe(
      "Biggest recovery on a retry: Module 1 quiz, +24 points (95% CI +18 to +30, n = 24).",
    );
  });

  it("labels questions by position and type, never by text", () => {
    expect(questionLabel({ position: 3, type: "mcq_single" })).toBe("Question 3 (single choice)");
    expect(questionLabel({ position: 2, type: "open_ended" })).toBe("Question 2 (open-ended)");
    expect(questionLabel({ position: null, type: null })).toBe("A question since removed");
    expect(missedQuestionText(quiz().missedQuestions[0])).toBe(
      "Question 3 (single choice): 47.5% wrong of 40",
    );
    // Below the floor the share is withheld; the counts are still said.
    expect(missedQuestionText(quiz().missedQuestions[1])).toBe(
      "A question since removed: 4 of 9 wrong",
    );
    const table = quizOutcomesTable(list);
    expect(table.rows[0][table.columns.indexOf("Most missed on the first attempt")]).toBe(
      "Question 3 (single choice): 47.5% wrong of 40; A question since removed: 4 of 9 wrong",
    );
  });

  it("lists withheld items with their n, capped", () => {
    expect(withheldList([])).toBeNull();
    expect(
      withheldList(
        Array.from({ length: 8 }, (_, i) => ({ title: `Q${i}`, n: i })),
        2,
      ),
    ).toBe("Q0 (n = 0), Q1 (n = 1), and 6 more");
  });
});

const gate = (over: Partial<RoleplayGate> = {}): RoleplayGate => ({
  trackItemId: "g1",
  title: "Opening the call",
  trackId: "t1",
  trackTitle: "Listening basics",
  scenarioId: 7,
  minScore: 60,
  progressRows: 40,
  passedFirst: 8,
  passedLater: 20,
  stuck: 8,
  inProgress: 4,
  passedFirstPct: 20,
  passedLaterPct: 50,
  stuckPct: 20,
  inProgressPct: 10,
  medianAttemptsToPass: 3,
  calibration: "tooHard",
  withheld: false,
  ...over,
});

const gates = (items: RoleplayGate[]): RoleplayGatesResponse => ({
  minSampleSize: 20,
  minCohortSize: 5,
  stuckAfterDays: 14,
  calibrationBand: { tooHardBelowPct: 40, tooEasyAbovePct: 95 },
  summary: {
    items: items.length,
    measurable: items.filter(g => !g.withheld).length,
    tooHard: items.filter(g => g.calibration === "tooHard").length,
    tooEasy: items.filter(g => g.calibration === "tooEasy").length,
    progressRows: 100,
    ungatedItems: 2,
  },
  items,
  scoping,
  provenance,
  computedAt: period.computedAt,
});

describe("roleplay gates", () => {
  const items = [
    gate(),
    gate({
      trackItemId: "g2",
      title: "Closing well",
      passedFirstPct: 97,
      passedLaterPct: 3,
      stuckPct: 0,
      inProgressPct: 0,
      passedFirst: 39,
      passedLater: 1,
      stuck: 0,
      inProgress: 0,
      calibration: "tooEasy",
      medianAttemptsToPass: 1,
    }),
    gate({
      trackItemId: "g3",
      title: "Thin gate",
      progressRows: 6,
      passedFirstPct: null,
      passedLaterPct: null,
      stuckPct: null,
      inProgressPct: null,
      medianAttemptsToPass: null,
      calibration: null,
      withheld: true,
    }),
  ];

  it("stacks only the server's shares, dropping empty segments, and skips withheld gates", () => {
    const rows = gateRows(gates(items));
    expect(rows.map(r => r.key)).toEqual(["g1", "g2"]);
    expect(rows[0].segments.map(s => [s.outcome, s.pct])).toEqual([
      ["Cleared first time", 20],
      ["Cleared later", 50],
      ["Stuck", 20],
      ["In progress", 10],
    ]);
    expect(rows[1].segments.map(s => s.outcome)).toEqual(["Cleared first time", "Cleared later"]);
    expect(rows[0].sublabel).toBe("Listening basics · gate 60 · median 3 attempts to clear");
    expect(rows[1].sublabel).toContain("median 1 attempt to clear");
    expect(rows[0].flag).toBe("check calibration: under 40% clear it first time");
  });

  it("names the gates flagged for a calibration check", () => {
    expect(gatesTakeaway(gates(items))).toBe(
      "Check calibration: Opening the call (20% first time), Closing well (97% first time).",
    );
    expect(gatesTakeaway(gates([gate({ calibration: null, passedFirstPct: 60 })]))).toBe(
      "The one measurable gate sits inside 40–95% first-time clearance.",
    );
    expect(gatesTakeaway(gates([items[2]]))).toBeUndefined();
    expect(calibrationText(null, { tooHardBelowPct: 40, tooEasyAbovePct: 95 })).toBeNull();
  });

  it("says why a gate is missing from the table's calibration column", () => {
    const table = gatesTable(gates(items));
    const col = table.columns.indexOf("Calibration");
    expect(table.rows[2][col]).toBe("withheld: n = 6, need 20");
    expect(table.rows[1][col]).toBe("check calibration: over 95% clear it first time");
  });
});
