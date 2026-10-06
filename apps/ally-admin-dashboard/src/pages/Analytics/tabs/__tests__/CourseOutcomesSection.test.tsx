import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KnowledgeVsSkillResponse, ProgressCurveResponse } from "../../courseProgressChart";
import type {
  CourseFunnelResponse,
  QuizOutcome,
  QuizOutcomesResponse,
  RoleplayGatesResponse,
} from "../../curriculumOutcomesChart";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const funnelMock = vi.fn();
const quizMock = vi.fn();
const gatesMock = vi.fn();
const prefsMock = vi.fn();
const curveMock = vi.fn();
const knowMock = vi.fn();

const result = <T,>(data: T | undefined, over: object = {}) => ({
  data,
  currentData: data,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
  ...over,
});

// Full replacement, not a partial spread: the real barrel reaches the store
// before a test store exists (see WeakPerformingMetricsTab.test.tsx).
vi.mock("@api", () => ({
  useGetCurriculumCourseFunnelQuery: (args: unknown, opts: unknown) => funnelMock(args, opts),
  useGetCurriculumQuizOutcomesQuery: (args: unknown, opts: unknown) => quizMock(args, opts),
  useGetCurriculumRoleplayGatesQuery: (args: unknown) => gatesMock(args),
  useGetCurriculumProgressCurveQuery: (args: unknown) => curveMock(args),
  useGetCurriculumKnowledgeVsSkillQuery: (args: unknown) => knowMock(args),
  useGetChartPreferencesQuery: () => prefsMock(),
  useSaveChartPreferencesMutation: () => [vi.fn(), {}],
}));

import { CourseOutcomesSection } from "../../CourseOutcomesSection";

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
const provenance = { derivation: "derivation", note: "note" };

const funnel: CourseFunnelResponse = {
  window: period,
  minCohortSize: 5,
  stalledAfterDays: 30,
  chartCourses: 15,
  totals: {
    courses: 2,
    enrolled: 83,
    started: 72,
    halfway: 53,
    completed: 41,
    stalled: 12,
    completedPct: 49.4,
    stalledPct: 16.7,
  },
  courses: [
    {
      trackId: "t1",
      title: "Listening basics for helpline volunteers",
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
      daysToCompleteIqr: [6, 21],
      inChart: true,
    },
    {
      trackId: "t2",
      title: "Tiny pilot course",
      status: "ACTIVE",
      totalItems: 2,
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
      inChart: true,
    },
  ],
  scoping,
  provenance,
  computedAt: period.computedAt,
};

const quiz = (over: Partial<QuizOutcome>): QuizOutcome => ({
  trackItemId: "q1",
  title: "Module 1 quiz",
  trackId: "t1",
  trackTitle: "Listening basics for helpline volunteers",
  firstAttempts: 42,
  unscoredFirstAttempts: 0,
  passedFirst: 16,
  passedFirstPct: 38.1,
  retried: 30,
  retriedPct: 71.4,
  passedLater: 18,
  withheld: false,
  firstToBest: {
    learners: 24,
    firstAvg: 55,
    bestAvg: 79,
    change: 24,
    changeCi: [18, 30],
    up: 20,
    down: 0,
    tied: 4,
    signP: 0.0001,
    detectable: true,
  },
  missedQuestions: [],
  ...over,
});

const quizzes: QuizOutcomesResponse = {
  window: period,
  minSampleSize: 20,
  scoreDomain: [0, 100],
  summary: { quizzes: 2, measurable: 1, firstAttempts: 46 },
  quizzes: [
    quiz({}),
    quiz({
      trackItemId: "q2",
      title: "Pilot check-in",
      firstAttempts: 4,
      passedFirstPct: null,
      retriedPct: null,
      withheld: true,
      firstToBest: {
        learners: 2,
        firstAvg: null,
        bestAvg: null,
        change: null,
        changeCi: null,
        up: 2,
        down: 0,
        tied: 0,
        signP: null,
        detectable: false,
      },
    }),
  ],
  scoping,
  provenance,
  computedAt: period.computedAt,
};

const gates: RoleplayGatesResponse = {
  minSampleSize: 20,
  minCohortSize: 5,
  stuckAfterDays: 14,
  calibrationBand: { tooHardBelowPct: 40, tooEasyAbovePct: 95 },
  summary: { items: 2, measurable: 1, tooHard: 1, tooEasy: 0, progressRows: 46, ungatedItems: 1 },
  items: [
    {
      trackItemId: "g1",
      title: "Opening the call",
      trackId: "t1",
      trackTitle: "Listening basics for helpline volunteers",
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
    },
    {
      trackItemId: "g2",
      title: "Pilot gate",
      trackId: "t2",
      trackTitle: "Tiny pilot course",
      scenarioId: 8,
      minScore: 40,
      progressRows: 6,
      passedFirst: 2,
      passedLater: 1,
      stuck: 1,
      inProgress: 2,
      passedFirstPct: null,
      passedLaterPct: null,
      stuckPct: null,
      inProgressPct: null,
      medianAttemptsToPass: null,
      calibration: null,
      withheld: true,
    },
  ],
  scoping,
  provenance,
  computedAt: period.computedAt,
};

const curve: ProgressCurveResponse = {
  minSampleSize: 20,
  chartCourses: 5,
  courses: [
    {
      trackId: "t1",
      title: "Listening basics for helpline volunteers",
      status: "ACTIVE",
      items: 3,
      enrolments: 80,
      startedEnrolments: 60,
      completed: 30,
      completedPct: 50,
      steepestDrop: {
        fromPosition: 2,
        fromItemId: "i2",
        fromItemTitle: "Reflective listening quiz",
        fromItemType: "QUIZ",
        toPosition: 3,
        toItemId: "i3",
        toItemTitle: "Practice call",
        toFinish: false,
        lost: 18,
        dropPts: 30,
      },
      inChart: true,
      points: [1, 2, 3].map((position, i) => ({
        position,
        positionPct: i * 50,
        itemId: `i${position}`,
        itemTitle: `Item ${position}`,
        itemType: "ARTICLE",
        reached: [60, 54, 36][i],
        reachedPct: [100, 90, 60][i],
        opened: [60, 50, 30][i],
        openedPct: [100, 83.3, 50][i],
      })),
    },
  ],
  others: [],
  belowFloor: [
    {
      trackId: "t2",
      title: "Tiny pilot course",
      status: "ACTIVE",
      items: 2,
      enrolments: 3,
      startedEnrolments: 2,
      completed: 1,
      completedPct: null,
      steepestDrop: null,
      inChart: false,
    },
  ],
  totals: { courses: 2, measurable: 1, enrolments: 83, startedEnrolments: 62 },
  provenance,
  scoping,
  computedAt: period.computedAt,
};

const knowledge: KnowledgeVsSkillResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 30,
  scoreDomain: [1, 4],
  quizScoreDomain: [0, 100],
  skillWindowCuts: 6,
  coverage: { courses: 1, enrolments: 30, points: 12, learners: 12, missingQuiz: 10, missingSkill: 8 },
  overall: { points: 12, learners: 12, r: null, rCi: null, detectable: false },
  courses: [],
  points: [{ trackId: "t1", learnerId: 1, quizScore: 80, skillScore: 2.5, quizzes: 2, slices: 6 }],
  provenance,
  scoping,
  computedAt: period.computedAt,
};

const query = { range: "all" as const };

describe("CourseOutcomesSection", () => {
  beforeEach(() => {
    funnelMock.mockReset();
    quizMock.mockReset();
    gatesMock.mockReset();
    prefsMock.mockReset();
    curveMock.mockReset();
    knowMock.mockReset();
    curveMock.mockReturnValue(result(curve));
    knowMock.mockReturnValue(result(knowledge));
    // Preferences answered with nothing saved: every card opens on its default.
    prefsMock.mockReturnValue(result({ preferences: [] }));
    funnelMock.mockReturnValue(result(funnel));
    quizMock.mockReturnValue(result(quizzes));
    gatesMock.mockReturnValue(result(gates));
  });

  it("asks for 12 months on the windowed cards and all time on the gates, platform-wide", () => {
    render(<CourseOutcomesSection query={query} />);
    // The page-level `range: "all"` never reaches a windowed card: each owns its period.
    expect(funnelMock).toHaveBeenLastCalledWith({ range: "12m" }, { skip: false });
    expect(quizMock).toHaveBeenLastCalledWith({ range: "12m" }, { skip: false });
    expect(gatesMock).toHaveBeenLastCalledWith({});
    expect(curveMock).toHaveBeenLastCalledWith({});
    expect(knowMock).toHaveBeenLastCalledWith({});
  });

  it("narrows every card to the tab's org", () => {
    render(<CourseOutcomesSection query={{ range: "all", tenantId: "t-alpha" }} />);
    expect(funnelMock).toHaveBeenLastCalledWith(
      { tenantId: "t-alpha", range: "12m" },
      { skip: false },
    );
    expect(gatesMock).toHaveBeenLastCalledWith({ tenantId: "t-alpha" });
  });

  it("holds the windowed requests until saved preferences are read", () => {
    prefsMock.mockReturnValue(result(undefined, { isLoading: true }));
    render(<CourseOutcomesSection query={query} />);
    expect(funnelMock).toHaveBeenLastCalledWith({ range: "12m" }, { skip: true });
  });

  it("moves one card's period without touching the others", async () => {
    render(<CourseOutcomesSection query={query} />);
    // First period picker is the funnel's (cards render in on-screen order).
    await userEvent.click(screen.getAllByRole("combobox", { name: "Period" })[0]);
    await userEvent.click(screen.getByRole("option", { name: "All time" }));
    expect(funnelMock).toHaveBeenLastCalledWith({ range: "all" }, { skip: false });
    expect(quizMock).toHaveBeenLastCalledWith({ range: "12m" }, { skip: false });
  });

  it("draws the populated cards from the server's numbers", () => {
    render(<CourseOutcomesSection query={query} />);

    // getAll where the closed detail modal repeats a card's body (it stays mounted).
    // AAQ-210: full course titles, nested counts, server shares only.
    expect(screen.getAllByText("Listening basics for helpline volunteers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("80 → 70 → 52 → 40").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50% finished · 12 stalled \(17\.1% of started\)/).length).toBeGreaterThan(0);
    // The tiny course has no stated rate, so none is shown.
    expect(screen.getAllByText("3 → 2 → 1 → 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0 stalled").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/83 enrolments across 2 courses: 49\.4% finished/),
    ).toBeTruthy();

    // AAQ-211: the hardest quiz named, the withheld one listed with its n.
    expect(
      screen.getByText(/Hardest first time: Module 1 quiz \(Listening basics for helpline volunteers\), 38\.1%/),
    ).toBeTruthy();
    expect(
      screen.getByText("Under 20 scored first attempts, so not rated: Pilot check-in (n = 4)."),
    ).toBeTruthy();

    // AAQ-212: a retry's recovery, in points.
    expect(screen.getByText(/Biggest recovery on a retry: Module 1 quiz, \+24 points/)).toBeTruthy();
    expect(screen.getAllByText(/too few retries \(n = 2\)/).length).toBeGreaterThan(0);

    // AAQ-213: the flagged gate is named, the thin one listed with its n.
    expect(screen.getByText("Check calibration: Opening the call (20% first time).")).toBeTruthy();
    expect(screen.getAllByText("check calibration: under 40% clear it first time").length).toBeGreaterThan(0);
    expect(screen.getByText("Under 20 learners, so not split: Pilot gate (n = 6).")).toBeTruthy();

    // AAQ-225: the steepest fall named; the thin course listed with its n.
    expect(
      screen.getByText(
        'Steepest fall: Listening basics for helpline volunteers — 30% of those who started stop at item 2, "Reflective listening quiz" (quiz) (18 of 60 learners).',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Under 20 started learners, so not drawn: Tiny pilot course (n = 2)."),
    ).toBeTruthy();

    // AAQ-226: points shown, r withheld below its floor, the unplotted counted.
    expect(
      screen.getByText(
        "12 learner-course points (12 learners): r withheld: 12 of 30 points — the correlation is stated from 30.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/^Not plotted: 10 enrolments with no scored first quiz attempt/)).toBeTruthy();

    for (const id of ["AAQ-210", "AAQ-211", "AAQ-212", "AAQ-213", "AAQ-225", "AAQ-226"]) {
      expect(screen.getByText(id)).toBeTruthy();
    }
  });

  it("says what is missing when there is nothing to draw, naming the floor", () => {
    funnelMock.mockReturnValue(result({ ...funnel, courses: [], totals: { ...funnel.totals, enrolled: 0 } }));
    quizMock.mockReturnValue(
      result({
        ...quizzes,
        summary: { ...quizzes.summary, measurable: 0 },
        quizzes: [quizzes.quizzes[1]],
      }),
    );
    gatesMock.mockReturnValue(
      result({ ...gates, items: [], summary: { ...gates.summary, items: 0, measurable: 0 } }),
    );
    curveMock.mockReturnValue(result({ ...curve, courses: [] }));
    knowMock.mockReturnValue(result({ ...knowledge, points: [] }));
    render(<CourseOutcomesSection query={query} />);
    expect(
      screen.getByText(
        "No course has 20 learners who started it yet — 1 has fewer: Tiny pilot course (n = 2)",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "No learner has both a scored quiz attempt and a helping-skills slice after enrolling yet (10 enrolments have no quiz score, 8 no slice)",
      ),
    ).toBeTruthy();

    expect(screen.getByText("No one enrolled in a course in the last 12 months")).toBeTruthy();
    expect(
      screen.getByText(/No quiz has 20 scored first attempts in the last 12 months — 2 quizzes have fewer/),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "No quiz has 20 learners with a second scored attempt in the last 12 months (the most is 2)",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "No course roleplay with a minimum score has been attempted yet (1 attempted roleplay has no gate)",
      ),
    ).toBeTruthy();
  });

  it("shows an error with a retry when an endpoint is not deployed yet", () => {
    funnelMock.mockReturnValue(result(undefined, { isError: true }));
    gatesMock.mockReturnValue(result(undefined, { isError: true }));
    curveMock.mockReturnValue(result(undefined, { isError: true }));
    render(<CourseOutcomesSection query={query} />);
    expect(
      screen.getByText("The progress-curve endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
    expect(
      screen.getByText("The course-funnel endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
    expect(
      screen.getByText("The roleplay-gates endpoint did not respond — it may not be deployed yet."),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBe(3);
  });
});
