import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CourseImpactResponse } from "../courseImpactChart";

/**
 * The populated tab, end to end through its own markup: a course list, the
 * drill-down for the course it opens on, and the thin and empty states. The
 * HighlightsTab mount check only ever sees the idle (no data) path.
 */

const comparison = (over: Partial<CourseImpactResponse["summary"]> | object = {}) => ({
  learners: 24,
  beforeAvg: 2.1,
  afterAvg: 2.55,
  change: 0.45,
  changeCi: [0.3, 0.6] as [number, number],
  up: 19,
  down: 3,
  tied: 2,
  signP: 0.001,
  detectable: true,
  ...over,
});

const fixture: CourseImpactResponse = {
  rubricVersion: "fhs-text-v1",
  minSampleSize: 20,
  scoreDomain: [1, 4],
  windowCuts: 3,
  summary: {
    courses: 3,
    measurable: 1,
    improved: 1,
    declined: 0,
    unclear: 0,
    pairedEnrollments: 27,
  },
  courses: [
    {
      trackId: "t1",
      title: "Listening basics",
      status: "ACTIVE",
      coverage: { enrolled: 80, started: 70, completed: 50, withBaseline: 30, paired: 24 },
      composite: comparison(),
      targetedSkills: ["verbal"],
    },
    {
      trackId: "t2",
      title: "Safety first",
      status: "ACTIVE",
      coverage: { enrolled: 10, started: 8, completed: 5, withBaseline: 4, paired: 3 },
      composite: comparison({
        learners: 3,
        beforeAvg: null,
        afterAvg: null,
        change: null,
        changeCi: null,
        signP: null,
        detectable: false,
      }),
      targetedSkills: [],
    },
    {
      trackId: "t3",
      title: "Brand new course",
      status: "DRAFT",
      coverage: { enrolled: 2, started: 0, completed: 0, withBaseline: 0, paired: 0 },
      composite: comparison({
        learners: 0,
        beforeAvg: null,
        afterAvg: null,
        change: null,
        changeCi: null,
        up: 0,
        down: 0,
        tied: 0,
        signP: null,
        detectable: false,
      }),
      targetedSkills: [],
    },
  ],
  course: {
    trackId: "t1",
    title: "Listening basics",
    competencies: ["Verbal Communication", "Custom framework skill"],
    skills: [
      {
        skill: "verbal",
        name: "Verbal communication",
        targeted: true,
        comparison: comparison(),
      },
      {
        skill: "empathy",
        name: "Empathy, warmth and genuineness",
        targeted: false,
        comparison: comparison({ detectable: false, changeCi: [-0.1, 0.3], change: 0.1 }),
      },
      {
        skill: "harm",
        name: "Assessment of harm and developing a response plan",
        targeted: false,
        comparison: comparison({ learners: 0, change: null, changeCi: null }),
      },
    ],
    unhelpful: comparison({
      beforeAvg: 0.34,
      afterAvg: 0.21,
      change: -0.13,
      changeCi: [-0.2, -0.06],
      up: 3,
      down: 15,
    }),
  },
  provenance: "Not a controlled comparison: learners also practise outside the course.",
  computedAt: "2026-10-04T08:00:00.000Z",
};

const result = (data: CourseImpactResponse | undefined) => ({
  data,
  currentData: data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});

const useGetCourseImpactQuery = vi.fn();

vi.mock("@api", () => ({
  useGetCourseImpactQuery: (arg: unknown) => useGetCourseImpactQuery(arg),
  useGetTenantsQuery: () => ({ data: { data: [{ id: "org-1", name: "Org One" }] } }),
}));

import { CourseImpactSubTab } from "../tabs/CourseImpactSubTab";

describe("CourseImpactSubTab", () => {
  it("lists courses with someone to compare and opens on the best-covered one", () => {
    useGetCourseImpactQuery.mockReturnValue(result(fixture));
    render(<CourseImpactSubTab />);

    // Course list: the two courses with paired learners, the third only counted.
    expect(screen.getAllByText("Listening basics").length).toBeGreaterThan(0);
    expect(screen.getByText("2.10 → 2.55 · 24 of 80 enrolled")).toBeTruthy();
    expect(screen.getByText("3 of 10 enrolled can be compared")).toBeTruthy();
    expect(screen.getByText(/1 more course has no learner who can be compared yet/)).toBeTruthy();
    expect(screen.getByText("Of 1 course with enough learners to read: 1 improved.")).toBeTruthy();

    // It asked for the default course's detail once it knew the list.
    expect(useGetCourseImpactQuery).toHaveBeenLastCalledWith({ trackId: "t1" });

    // Drill-down: funnel, taught skill first, the no-opportunity skill left out.
    expect(screen.getByText("Practised after")).toBeTruthy();
    expect(screen.getByText("Taught in this course")).toBeTruthy();
    expect(screen.queryByText("Assessment of harm and developing a response plan")).toBeNull();
    expect(
      screen.getByText(/Competencies this course's roleplays assess: Verbal Communication/),
    ).toBeTruthy();

    // Unhelpful behaviour reads down as good.
    expect(screen.getByText("34%")).toBeTruthy();
    expect(screen.getByText("21%")).toBeTruthy();
    expect(screen.getAllByText(/less often after the course/).length).toBeGreaterThan(0);
  });

  it("explains an empty list instead of drawing nothing", () => {
    useGetCourseImpactQuery.mockReturnValue(
      result({
        ...fixture,
        summary: { ...fixture.summary, measurable: 0, improved: 0, pairedEnrollments: 0 },
        courses: [fixture.courses[2]],
        course: null,
      }),
    );
    render(<CourseImpactSubTab />);
    expect(
      screen.getByText(/no learner has scored practice both before starting and after finishing/),
    ).toBeTruthy();
  });

  it("says when nobody has enrolled at all", () => {
    useGetCourseImpactQuery.mockReturnValue(
      result({
        ...fixture,
        summary: {
          courses: 0,
          measurable: 0,
          improved: 0,
          declined: 0,
          unclear: 0,
          pairedEnrollments: 0,
        },
        courses: [],
        course: null,
      }),
    );
    render(<CourseImpactSubTab />);
    expect(screen.getAllByText("No one has enrolled in a course yet").length).toBeGreaterThan(0);
  });
});
