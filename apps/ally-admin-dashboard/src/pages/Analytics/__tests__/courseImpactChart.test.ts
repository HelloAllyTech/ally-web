import { describe, expect, it } from "vitest";

import {
  CourseImpactComparison,
  CourseImpactCourse,
  CourseImpactReference,
  CourseImpactSkill,
  POOLED_LABEL,
  biggestCoverageGap,
  comparisonLine,
  competencySourceText,
  coursePace,
  courseRows,
  courseTakeaway,
  courseVerdict,
  coverageAdvice,
  coverageStages,
  pooledRow,
  pooledTakeaway,
  referenceNote,
  referenceWindowText,
  sharePct,
  skillRows,
  toPoints,
  unhelpfulVerdict,
  unpairedCourseCount,
} from "../courseImpactChart";

const comparison = (over: Partial<CourseImpactComparison> = {}): CourseImpactComparison => ({
  learners: 24,
  beforeAvg: 2.1,
  afterAvg: 2.5,
  change: 0.4,
  changeCi: [0.2, 0.6],
  up: 18,
  down: 4,
  tied: 2,
  signP: 0.002,
  detectable: true,
  ...over,
});

const course = (over: Partial<CourseImpactCourse> = {}): CourseImpactCourse => ({
  trackId: "t1",
  title: "Listening basics",
  status: "ACTIVE",
  coverage: { enrolled: 100, started: 90, completed: 60, withBaseline: 40, paired: 24 },
  composite: comparison(),
  targetedSkills: ["verbal"],
  ...over,
});

const skill = (key: string, targeted: boolean, learners = 24): CourseImpactSkill => ({
  skill: key,
  name: key.toUpperCase(),
  targeted,
  comparison: comparison({ learners }),
});

describe("courseVerdict", () => {
  it("names the call the colour makes", () => {
    expect(courseVerdict(comparison())).toBe("improved");
    expect(courseVerdict(comparison({ change: -0.3, changeCi: [-0.5, -0.1] }))).toBe("declined");
    expect(courseVerdict(comparison({ detectable: false }))).toBe("no clear change");
    expect(courseVerdict(comparison({ change: null, learners: 7 }))).toBe(
      "too few learners to read (n = 7)",
    );
  });
});

describe("courseRows", () => {
  it("draws only courses with someone to compare, keeping the server's order", () => {
    const rows = courseRows([
      course({ trackId: "a" }),
      course({
        trackId: "b",
        coverage: { enrolled: 5, started: 5, completed: 0, withBaseline: 0, paired: 0 },
      }),
      course({
        trackId: "c",
        composite: comparison({ learners: 3, beforeAvg: null, afterAvg: null, change: null }),
        coverage: { enrolled: 9, started: 9, completed: 5, withBaseline: 4, paired: 3 },
      }),
    ]);
    expect(rows.map(r => r.key)).toEqual(["a", "c"]);
    expect(rows[0].sublabel).toBe("2.10 → 2.50 · 24 of 100 enrolled");
    expect(rows[1].sublabel).toBe("3 of 9 enrolled can be compared");
    expect(rows[1].change).toBeNull();
  });

  it("counts the courses it left out", () => {
    expect(
      unpairedCourseCount([
        course(),
        course({
          coverage: { enrolled: 1, started: 0, completed: 0, withBaseline: 0, paired: 0 },
        }),
      ]),
    ).toBe(1);
  });
});

describe("coverage", () => {
  it("lists the funnel in order, ending on the paired set", () => {
    const stages = coverageStages(course().coverage);
    expect(stages.map(s => s.reached)).toEqual([100, 90, 60, 40, 24]);
    expect(stages[stages.length - 1].terminal).toBe(true);
  });

  it("finds the step that loses the most learners", () => {
    expect(biggestCoverageGap(course().coverage)).toEqual({
      from: "Started",
      to: "Finished",
      lost: 30,
    });
    expect(
      biggestCoverageGap({ enrolled: 4, started: 4, completed: 4, withBaseline: 4, paired: 4 }),
    ).toBeNull();
  });

  it("explains the gap without suggesting in-course roleplays count", () => {
    const before = coverageAdvice({
      enrolled: 50,
      started: 50,
      completed: 48,
      withBaseline: 6,
      paired: 5,
    });
    expect(before).toContain("42 learners had no scored roleplay practice before they started");
    expect(
      coverageAdvice({ enrolled: 50, started: 50, completed: 48, withBaseline: 40, paired: 2 }),
    ).toContain('since finishing, so there is no "after" yet');
    expect(
      coverageAdvice({ enrolled: 2, started: 1, completed: 1, withBaseline: 1, paired: 1 }),
    ).toBe("Most lost here: 1 learner enrolled but never started.");
  });
});

describe("skillRows", () => {
  it("puts taught skills first, marks them, and drops skills nobody could show", () => {
    const rows = skillRows([
      skill("verbal", false),
      skill("harm", false, 0),
      skill("hope", true),
      skill("goals", false),
    ]);
    expect(rows.map(r => r.key)).toEqual(["hope", "verbal", "goals"]);
    expect(rows[0].sublabel).toBe("Taught in this course");
    expect(rows[1].sublabel).toBeUndefined();
  });
});

describe("courseTakeaway", () => {
  const summary = {
    courses: 6,
    measurable: 3,
    improved: 2,
    declined: 0,
    unclear: 1,
    pairedEnrollments: 80,
  };

  it("summarises only the parts that are non-zero", () => {
    expect(courseTakeaway(summary, 20)).toBe(
      "Of 3 courses with enough learners to read: 2 improved, 1 show no clear change.",
    );
  });

  it("says plainly when no course can be read yet", () => {
    expect(courseTakeaway({ ...summary, measurable: 0, improved: 0, unclear: 0 }, 20)).toBe(
      "No course has 20 learners with practice both before and after it yet.",
    );
    expect(courseTakeaway({ ...summary, courses: 0 }, 20)).toBe("");
  });
});

describe("unhelpful behaviour wording", () => {
  const share = comparison({
    beforeAvg: 0.34,
    afterAvg: 0.21,
    change: -0.13,
    changeCi: [-0.2, -0.06],
  });

  it("treats down as the good direction", () => {
    expect(unhelpfulVerdict(share)).toBe("less often after the course");
    expect(unhelpfulVerdict({ ...share, change: 0.1 })).toBe("more often after the course");
    expect(unhelpfulVerdict({ ...share, detectable: false })).toBe("no clear change");
  });

  it("re-expresses shares as percentage points", () => {
    const pts = toPoints(share);
    expect(pts.change).toBe(-13);
    expect(pts.changeCi).toEqual([-20, -6]);
    expect(comparisonLine(pts, 0, " pts")).toBe(
      "−13 pts (95% CI −20 to −6; 18 up, 4 down, p=0.00)",
    );
    expect(sharePct(0.214)).toBe("21%");
    expect(sharePct(null)).toBe("—");
  });
});

const reference = (over: Partial<CourseImpactReference> = {}): CourseImpactReference => ({
  ...comparison({
    learners: 40,
    beforeAvg: 2.0,
    afterAvg: 2.08,
    change: 0.08,
    changeCi: [-0.02, 0.18],
    detectable: false,
  }),
  candidates: 310,
  matchedStartPosition: 6,
  matchedGap: 4,
  ...over,
});

describe("course pace in the row's sublabel", () => {
  it("adds median days to finish and slices between when the server states them", () => {
    const c = course({ medianDaysToComplete: 12, medianCutsBetween: 3.5 });
    expect(coursePace(c)).toBe("median 12 days to finish · 3.5 slices between");
    expect(courseRows([c])[0].sublabel).toBe(
      "2.10 → 2.50 · 24 of 100 enrolled · median 12 days to finish · 3.5 slices between",
    );
  });

  it("says nothing extra when withheld or sent by an older backend", () => {
    expect(coursePace(course({ medianDaysToComplete: null, medianCutsBetween: null }))).toBeNull();
    expect(coursePace(course())).toBeNull();
    expect(coursePace(course({ medianDaysToComplete: 1, medianCutsBetween: 1 }))).toBe(
      "median 1 day to finish · 1 slice between",
    );
  });
});

describe("pooled row and free-practice reference", () => {
  it("heads the list with every learner once, or nothing when nobody is paired", () => {
    expect(pooledRow(comparison({ learners: 31 }))).toMatchObject({
      label: POOLED_LABEL,
      sublabel: "2.10 → 2.50 · 31 learners",
      change: 0.4,
      n: 31,
    });
    expect(pooledRow(comparison({ learners: 0 }))).toBeNull();
    expect(pooledRow(undefined)).toBeNull();
    expect(
      pooledRow(comparison({ learners: 7, beforeAvg: null, afterAvg: null, change: null }))
        ?.sublabel,
    ).toBe("7 learners can be compared");
  });

  it("names the slice positions the reference reads, clamped at the first slice", () => {
    expect(referenceWindowText(reference(), 3)).toBe("slices 4–6 against 10–12");
    expect(referenceWindowText(reference({ matchedStartPosition: 2, matchedGap: 1 }), 3)).toBe(
      "slices 1–2 against 3–5",
    );
    expect(referenceWindowText(reference({ matchedStartPosition: 1, matchedGap: 2 }), 1)).toBe(
      "slices 1 against 3",
    );
    expect(referenceWindowText(reference({ matchedGap: null }), 3)).toBeNull();
  });

  it("states the reference, or its n when withheld", () => {
    expect(referenceNote(reference(), 3, 20)).toBe(
      "Free practice, same slice positions: 40 of 310 learners who never enrolled in a course, read over the same point in their own practice (slices 4–6 against 10–12): +0.08 (95% CI −0.02 to +0.18).",
    );
    expect(referenceNote(reference({ learners: 12, change: null, changeCi: null }), 3, 20)).toBe(
      "Free practice, same slice positions: withheld — 12 of 310 learners who never enrolled in a course have practised far enough to compare (slices 4–6 against 10–12); need 20.",
    );
    expect(referenceNote(reference({ matchedStartPosition: null }), 3, 20)).toMatch(
      /drawn once a course learner can be compared/,
    );
    expect(referenceNote(undefined, 3, 20)).toBeNull();
  });

  it("puts the pooled change beside free practice, without claiming cause", () => {
    expect(pooledTakeaway(comparison({ learners: 31 }), reference())).toBe(
      "All courses together (31 learners, each once): +0.40 (95% CI +0.20 to +0.60), against +0.08 for free practice over the same slices.",
    );
    expect(pooledTakeaway(comparison(), reference({ change: null }))).toBe(
      "All courses together (24 learners, each once): +0.40 (95% CI +0.20 to +0.60).",
    );
    expect(pooledTakeaway(comparison({ change: null }), reference())).toBeNull();
  });
});

describe("where a course's taught skills come from", () => {
  it("marks taught skills with their source when known", () => {
    expect(competencySourceText("explicit")).toBe("tagged by the author");
    expect(competencySourceText("derived")).toBe("from its roleplays");
    expect(competencySourceText(null)).toBeNull();
    expect(skillRows([skill("hope", true)], "explicit")[0].sublabel).toBe(
      "Taught in this course (tagged by the author)",
    );
    expect(skillRows([skill("hope", true)], "derived")[0].sublabel).toBe(
      "Taught in this course (from its roleplays)",
    );
    expect(skillRows([skill("hope", true)])[0].sublabel).toBe("Taught in this course");
  });
});
