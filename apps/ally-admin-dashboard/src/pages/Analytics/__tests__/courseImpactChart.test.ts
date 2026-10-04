import { describe, expect, it } from "vitest";

import {
  CourseImpactComparison,
  CourseImpactCourse,
  CourseImpactSkill,
  biggestCoverageGap,
  comparisonLine,
  courseRows,
  courseTakeaway,
  courseVerdict,
  coverageAdvice,
  coverageStages,
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
