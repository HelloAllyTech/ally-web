import { describe, expect, it } from "vitest";

import { GoalsXpPoint } from "@types";

import {
  ACTUAL_GROUP,
  GOAL_GROUP,
  buildGoalsXpSeries,
  buildGoalsXpTable,
  goalsXpEmptyText,
  goalsXpNoGoalNote,
  goalsXpTakeaway,
  goalsXpUpcomingNote,
  noGoalPeriods,
} from "../goalsXpChart";

const point = (overrides: Partial<GoalsXpPoint> & { periodLabel: string }): GoalsXpPoint => ({
  periodStart: "2026-01-01",
  actualXp: 0,
  goalXp: null,
  hasGoal: false,
  inProgress: false,
  upcoming: false,
  ...overrides,
});

describe("buildGoalsXpSeries", () => {
  it("plots Actual XP for every period, including one with no goal", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_545 }),
      point({ periodLabel: "Jul 2026", actualXp: 1_615, goalXp: 2_000, hasGoal: true }),
    ];

    const series = buildGoalsXpSeries(points);

    expect(series.filter(d => d.group === ACTUAL_GROUP)).toEqual([
      { group: ACTUAL_GROUP, key: "Jun 2026", value: 1_545 },
      { group: ACTUAL_GROUP, key: "Jul 2026", value: 1_615 },
    ]);
  });

  it("omits the Goal datum entirely for a period with no goal row — never a fabricated zero", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_545 }),
      point({ periodLabel: "Jul 2026", actualXp: 1_615, goalXp: 2_000, hasGoal: true }),
    ];

    const series = buildGoalsXpSeries(points);

    const goalKeys = series.filter(d => d.group === GOAL_GROUP).map(d => d.key);
    expect(goalKeys).toEqual(["Jul 2026"]);
  });

  it("omits the Actual datum for an upcoming period — nothing has happened yet", () => {
    const points = [
      point({ periodLabel: "Sep 2026", actualXp: 1_500, inProgress: true }),
      point({
        periodLabel: "Oct 2026",
        actualXp: 0,
        goalXp: 3_000,
        hasGoal: true,
        upcoming: true,
      }),
    ];

    const series = buildGoalsXpSeries(points);

    expect(series.filter(d => d.group === ACTUAL_GROUP)).toEqual([
      { group: ACTUAL_GROUP, key: "Sep 2026", value: 1_500 },
    ]);
    expect(series.filter(d => d.group === GOAL_GROUP)).toEqual([
      { group: GOAL_GROUP, key: "Oct 2026", value: 3_000 },
    ]);
  });
});

describe("noGoalPeriods / goalsXpNoGoalNote", () => {
  it("returns null when every period has a goal", () => {
    const points = [point({ periodLabel: "Jul 2026", goalXp: 2_000, hasGoal: true })];
    expect(noGoalPeriods(points)).toEqual([]);
    expect(goalsXpNoGoalNote(points)).toBeNull();
  });

  it("names the missing periods when some, not all, lack a goal", () => {
    const points = [
      point({ periodLabel: "Jun 2026" }),
      point({ periodLabel: "Jul 2026", goalXp: 2_000, hasGoal: true }),
      point({ periodLabel: "Sep 2026", inProgress: true }),
    ];

    const note = goalsXpNoGoalNote(points);
    expect(note).toContain("Jun 2026");
    expect(note).toContain("Sep 2026");
    expect(note).not.toContain("Jul 2026");
  });

  it("uses the whole-axis message when nothing has a goal yet", () => {
    const points = [point({ periodLabel: "Jun 2026" }), point({ periodLabel: "Jul 2026" })];
    expect(goalsXpNoGoalNote(points)).toMatch(/no goal has been set for any period/i);
  });
});

describe("goalsXpTakeaway", () => {
  it("counts completed periods that met their goal", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_500, goalXp: 2_000, hasGoal: true }),
      point({ periodLabel: "Jul 2026", actualXp: 1_600, goalXp: 1_000, hasGoal: true }),
    ];

    expect(goalsXpTakeaway(points)).toBe("Goal met in 1 of 2 completed periods with a target set");
  });

  it("excludes the in-progress period — its actual figure can still rise", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_500, goalXp: 1_000, hasGoal: true }),
      point({
        periodLabel: "Sep 2026",
        actualXp: 10,
        goalXp: 5_000,
        hasGoal: true,
        inProgress: true,
      }),
    ];

    expect(goalsXpTakeaway(points)).toBe("Goal met in 1 of 1 completed period with a target set");
  });

  it("excludes periods with no goal — there is nothing for them to meet", () => {
    const points = [point({ periodLabel: "Jun 2026", actualXp: 1_500 })];
    expect(goalsXpTakeaway(points)).toBeNull();
  });

  it("returns null when nothing qualifies at all", () => {
    expect(goalsXpTakeaway([])).toBeNull();
  });

  it("excludes upcoming periods — they haven't happened, so they were never missed", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_500, goalXp: 1_000, hasGoal: true }),
      point({
        periodLabel: "Oct 2026",
        actualXp: 0,
        goalXp: 3_000,
        hasGoal: true,
        upcoming: true,
      }),
    ];

    expect(goalsXpTakeaway(points)).toBe("Goal met in 1 of 1 completed period with a target set");
  });
});

describe("goalsXpUpcomingNote", () => {
  it("returns null when nothing is upcoming", () => {
    const points = [point({ periodLabel: "Jun 2026", goalXp: 2_000, hasGoal: true })];
    expect(goalsXpUpcomingNote(points)).toBeNull();
  });

  it("names upcoming periods that have a goal set", () => {
    const points = [
      point({ periodLabel: "Sep 2026", inProgress: true }),
      point({ periodLabel: "Oct 2026", goalXp: 3_000, hasGoal: true, upcoming: true }),
      point({ periodLabel: "Nov 2026", upcoming: true }),
    ];

    const note = goalsXpUpcomingNote(points);
    expect(note).toContain("Oct 2026");
    expect(note).not.toContain("Nov 2026");
  });
});

describe("goalsXpEmptyText", () => {
  it("is undefined once any period has earned XP", () => {
    const points = [point({ periodLabel: "Jun 2026", actualXp: 1 })];
    expect(goalsXpEmptyText(points)).toBeUndefined();
  });

  it("flags an empty window when every period is zero", () => {
    const points = [point({ periodLabel: "Jun 2026" }), point({ periodLabel: "Jul 2026" })];
    expect(goalsXpEmptyText(points)).toBeDefined();
  });

  it("flags an empty window when there are no periods at all", () => {
    expect(goalsXpEmptyText([])).toBeDefined();
  });

  it("is undefined for a window of only upcoming periods — nothing has happened, but that's not a data gap", () => {
    const points = [
      point({ periodLabel: "Oct 2026", goalXp: 3_000, hasGoal: true, upcoming: true }),
    ];
    expect(goalsXpEmptyText(points)).toBeUndefined();
  });

  it("still flags empty when past periods earned nothing, even with upcoming periods present", () => {
    const points = [
      point({ periodLabel: "Sep 2026", actualXp: 0, inProgress: true }),
      point({ periodLabel: "Oct 2026", goalXp: 3_000, hasGoal: true, upcoming: true }),
    ];
    expect(goalsXpEmptyText(points)).toBeDefined();
  });
});

describe("buildGoalsXpTable", () => {
  it("renders a literal 'No goal set' cell rather than a blank or a zero", () => {
    const points = [
      point({ periodLabel: "Jun 2026", actualXp: 1_545 }),
      point({ periodLabel: "Jul 2026", actualXp: 1_615, goalXp: 2_000, hasGoal: true }),
      point({ periodLabel: "Sep 2026", actualXp: 0, inProgress: true }),
    ];

    const table = buildGoalsXpTable(points);

    expect(table.columns).toEqual(["Period", "Actual XP", "Goal XP"]);
    expect(table.rows).toEqual([
      ["Jun 2026", 1_545, "No goal set"],
      ["Jul 2026", 1_615, 2_000],
      ["Sep 2026 (in progress)", 0, "No goal set"],
    ]);
  });

  it("labels an upcoming period and renders its Actual XP as '—', not a fabricated zero", () => {
    const points = [
      point({
        periodLabel: "Oct 2026",
        actualXp: 0,
        goalXp: 3_000,
        hasGoal: true,
        upcoming: true,
      }),
    ];

    const table = buildGoalsXpTable(points);

    expect(table.rows).toEqual([["Oct 2026 (upcoming)", "—", 3_000]]);
  });
});
