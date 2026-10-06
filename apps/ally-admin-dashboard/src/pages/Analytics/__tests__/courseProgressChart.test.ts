import { describe, expect, it } from "vitest";

import {
  KNOWLEDGE_SERIES,
  KnowledgeVsSkillResponse,
  ProgressCurveCourse,
  ProgressCurveResponse,
  RankCorrelation,
  belowFloorCourses,
  correlationText,
  distinctCourseNames,
  dropText,
  itemTypeWord,
  knowledgeCoverageNote,
  knowledgePoints,
  knowledgeTable,
  knowledgeTakeaway,
  progressCurvePoints,
  progressCurveScale,
  progressCurveTable,
  progressCurveTakeaway,
} from "../courseProgressChart";

const scoping = { tenantId: null, unscopedSections: [] };
const provenance = { derivation: "R10", note: "Reached means unlocked, not opened." };

const point = (position: number, of: number, reachedPct: number | null) => ({
  position,
  positionPct: of === 1 ? 0 : Math.round(((position - 1) / (of - 1)) * 1000) / 10,
  itemId: `i${position}`,
  itemTitle: `Item ${position}`,
  itemType: position === 2 ? "QUIZ" : "ROLEPLAY",
  reached: reachedPct === null ? 0 : reachedPct,
  reachedPct,
  opened: 0,
  openedPct: null,
});

const course = (over: Partial<ProgressCurveCourse> = {}): ProgressCurveCourse => ({
  trackId: "t1",
  title: "Listening basics",
  status: "ACTIVE",
  items: 3,
  enrolments: 70,
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
    toItemTitle: "Item 3",
    toFinish: false,
    lost: 18,
    dropPts: 30,
  },
  inChart: true,
  points: [point(1, 3, 100), point(2, 3, 90), point(3, 3, 60)],
  ...over,
});

const curve = (over: Partial<ProgressCurveResponse> = {}): ProgressCurveResponse => ({
  minSampleSize: 20,
  chartCourses: 5,
  courses: [
    course(),
    course({
      trackId: "t2",
      title: "Safety first",
      steepestDrop: {
        fromPosition: 3,
        fromItemId: "i3",
        fromItemTitle: "Final roleplay",
        fromItemType: "ROLEPLAY",
        toPosition: null,
        toItemId: null,
        toItemTitle: null,
        toFinish: true,
        lost: 12,
        dropPts: 20,
      },
      points: [point(1, 3, 100), point(2, 3, null), point(3, 3, 80)],
    }),
  ],
  others: [],
  belowFloor: [
    {
      trackId: "t9",
      title: "Pilot",
      status: "ACTIVE",
      items: 2,
      enrolments: 5,
      startedEnrolments: 4,
      completed: 1,
      completedPct: null,
      steepestDrop: null,
      inChart: false,
    },
  ],
  totals: { courses: 3, measurable: 2, enrolments: 145, startedEnrolments: 124 },
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("progress curve", () => {
  it("draws each course on a 0–100 position axis, skipping points with no share", () => {
    const pts = progressCurvePoints(curve().courses);
    expect(pts.filter(p => p.group === "Listening basics").map(p => [p.x, p.y])).toEqual([
      [0, 100],
      [50, 90],
      [100, 60],
    ]);
    // A null share is a gap, never a 0.
    expect(pts.filter(p => p.group === "Safety first").map(p => p.x)).toEqual([0, 100]);
    expect(pts[1].item).toBe("2. Item 2");
  });

  it("keeps two courses with one title as two lines", () => {
    const names = distinctCourseNames([
      { trackId: "a", title: "Basics", status: "ACTIVE" },
      { trackId: "b", title: "Basics", status: "ARCHIVED" },
      { trackId: "c", title: "Other", status: "ACTIVE" },
    ]);
    expect([...names.values()]).toEqual(["Basics (active)", "Basics (archived)", "Other"]);
    expect(Object.keys(progressCurveScale(curve().courses))).toEqual([
      "Listening basics",
      "Safety first",
    ]);
  });

  it("names the item learners stop at, and the last-item-to-finish case", () => {
    expect(dropText(curve().courses[0])).toBe(
      '30% of those who started stop at item 2, "Reflective listening quiz" (quiz)',
    );
    expect(dropText(curve().courses[1])).toBe(
      '20% of those who started reach the last item, "Final roleplay" (roleplay), and never finish it',
    );
    expect(dropText(curve().belowFloor[0])).toBeNull();
    expect(itemTypeWord("FILL_BLANK")).toBe("fill blank");
  });

  it("leads with the steepest fall across every measurable course", () => {
    expect(progressCurveTakeaway(curve())).toBe(
      'Steepest fall: Listening basics — 30% of those who started stop at item 2, "Reflective listening quiz" (quiz) (18 of 60 learners).',
    );
    expect(
      progressCurveTakeaway(curve({ courses: [course({ steepestDrop: null })] })),
    ).toBeUndefined();
  });

  it("lists courses under the floor with their n, and tables every course", () => {
    expect(belowFloorCourses(curve())).toBe("Pilot (n = 4)");
    const table = progressCurveTable(curve());
    expect(table.rows).toHaveLength(3);
    const drawn = table.columns.indexOf("Drawn");
    expect(table.rows[2][drawn]).toBe("no — n = 4, need 20");
    expect(table.rows[1][table.columns.indexOf("Steepest fall at")]).toBe(
      'last item "Final roleplay" → finishing',
    );
    expect(table.rows[2][table.columns.indexOf("Finished % of started")]).toBeNull();
  });
});

const corr = (over: Partial<RankCorrelation> = {}): RankCorrelation => ({
  points: 58,
  learners: 41,
  r: 0.21,
  rCi: [-0.05, 0.44],
  detectable: false,
  ...over,
});

const know = (over: Partial<KnowledgeVsSkillResponse> = {}): KnowledgeVsSkillResponse => ({
  rubricVersion: "fhs-text-v1",
  minSampleSize: 30,
  scoreDomain: [1, 4],
  quizScoreDomain: [0, 100],
  skillWindowCuts: 6,
  coverage: { courses: 2, enrolments: 90, points: 58, learners: 41, missingQuiz: 20, missingSkill: 12 },
  overall: corr(),
  courses: [
    {
      trackId: "t1",
      title: "Listening basics",
      status: "ACTIVE",
      quizItems: 3,
      enrolments: 60,
      missingQuiz: 10,
      missingSkill: 8,
      correlation: corr({ points: 42, learners: 42, r: 0.38, rCi: [0.08, 0.6], detectable: true }),
    },
    {
      trackId: "t2",
      title: "Safety first",
      status: "ACTIVE",
      quizItems: 1,
      enrolments: 30,
      missingQuiz: 10,
      missingSkill: 4,
      correlation: corr({ points: 16, learners: 16, r: null, rCi: null }),
    },
  ],
  points: [
    { trackId: "t1", learnerId: 1, quizScore: 80, skillScore: 2.5, quizzes: 2, slices: 6 },
    { trackId: "t2", learnerId: 2, quizScore: 40, skillScore: 1.75, quizzes: 1, slices: 3 },
  ],
  provenance,
  scoping,
  computedAt: "2026-10-05T08:00:00.000Z",
  ...over,
});

describe("knowledge vs skill", () => {
  it("plots one single-colour series, x = quiz, y = skill", () => {
    expect(knowledgePoints(know())).toEqual([
      { group: KNOWLEDGE_SERIES, x: 80, y: 2.5 },
      { group: KNOWLEDGE_SERIES, x: 40, y: 1.75 },
    ]);
  });

  it("states r with its interval, or why it is withheld", () => {
    expect(correlationText(corr(), 30)).toBe("r = +0.21 (95% CI −0.05 to +0.44)");
    expect(correlationText(corr({ points: 12, r: null, rCi: null }), 30)).toBe(
      "r withheld: 12 of 30 points",
    );
    expect(correlationText(corr({ r: null, rCi: null }), 30)).toBe(
      "r not computable: one side does not vary",
    );
  });

  it("words the association without claiming a cause", () => {
    expect(knowledgeTakeaway(know())).toBe(
      "Spearman r = +0.21 (95% CI −0.05 to +0.44) over 58 learner-course points (41 learners): no detectable association. 1 course has enough points to read on its own (expanded view).",
    );
    expect(
      knowledgeTakeaway(know({ overall: corr({ r: -0.42, rCi: [-0.6, -0.2], detectable: true }), courses: [] })),
    ).toBe(
      "Spearman r = −0.42 (95% CI −0.60 to −0.20) over 58 learner-course points (41 learners): a moderate negative association.",
    );
    expect(
      knowledgeTakeaway(know({ overall: corr({ points: 12, learners: 9, r: null, rCi: null }) })),
    ).toBe(
      "12 learner-course points (9 learners): r withheld: 12 of 30 points — the correlation is stated from 30.",
    );
    expect(knowledgeTakeaway(know({ overall: corr({ points: 0 }) }))).toBeUndefined();
  });

  it("says who is not plotted, and tables each course's own r", () => {
    expect(knowledgeCoverageNote(know())).toBe(
      "Not plotted: 20 enrolments with no scored first quiz attempt, and 12 with a quiz score but no helping-skills slice after enrolling.",
    );
    expect(
      knowledgeCoverageNote(know({ coverage: { ...know().coverage, missingQuiz: 0, missingSkill: 0 } })),
    ).toBeNull();
    const table = knowledgeTable(know());
    expect(table.rows[0][table.columns.indexOf("Spearman r")]).toBe("+0.38");
    expect(table.rows[0][table.columns.indexOf("Clears zero")]).toBe("yes");
    expect(table.rows[1][table.columns.indexOf("Spearman r")]).toBeNull();
  });
});
