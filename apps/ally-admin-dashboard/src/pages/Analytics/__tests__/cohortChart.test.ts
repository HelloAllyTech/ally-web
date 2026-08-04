import { describe, expect, it } from "vitest";

import { CohortRetentionResponse, CohortRetentionRow } from "@types";

import {
  MAX_CURVE_COHORTS,
  buildCohortCurveScale,
  buildCohortCurves,
  buildCohortGrid,
  cellBackground,
  curvesOmitted,
  maxMonthIndex,
  monthLabel,
  monthOneTakeaway,
  thresholdIndex,
  totalCohortLearners,
} from "../cohortChart";

const cohort = (
  cohortMonth: string,
  learners: number,
  cells: CohortRetentionRow["cells"],
  belowFloor = false,
): CohortRetentionRow => ({ cohortMonth, learners, belowFloor, cells });

const cell = (monthIndex: number, activeByThreshold: number[], partial = false) => ({
  monthIndex,
  activityMonth: "2024-05-01",
  activeByThreshold,
  partial,
});

const response = (cohorts: CohortRetentionRow[]): CohortRetentionResponse => ({
  thresholds: [10, 50, 100],
  minCohortSize: 5,
  currentMonth: "2024-06-01",
  cohorts,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T12:00:00.000Z",
});

describe("monthLabel", () => {
  it("renders the month in UTC so it never slips to the previous one", () => {
    expect(monthLabel("2025-08-01")).toBe("Aug 2025");
  });

  it("passes an unparseable value straight through", () => {
    expect(monthLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("thresholdIndex", () => {
  it("finds the selected threshold", () => {
    expect(thresholdIndex([10, 50, 100], 50)).toBe(1);
  });

  it("falls back to the loosest when the selection is not offered", () => {
    expect(thresholdIndex([10, 50, 100], 999)).toBe(0);
  });
});

describe("buildCohortGrid", () => {
  it("divides by the cohort's own size, per selected threshold", () => {
    const grid = buildCohortGrid(response([cohort("2024-03-01", 20, [cell(1, [10, 5, 1])])]), 1);

    expect(grid[0].cells[0]).toMatchObject({ active: 5, pct: 25 });
  });

  it("keeps the same denominator when the threshold changes", () => {
    const data = response([cohort("2024-03-01", 20, [cell(1, [10, 5, 1])])]);

    expect(buildCohortGrid(data, 0)[0].cells[0]?.pct).toBe(50);
    expect(buildCohortGrid(data, 2)[0].cells[0]?.pct).toBe(5);
  });

  it("leaves unmeasured months undefined rather than filling them with zero", () => {
    const grid = buildCohortGrid(response([cohort("2024-03-01", 20, [cell(2, [4, 0, 0])])]), 0);

    expect(grid[0].cells[0]).toBeUndefined();
    expect(grid[0].cells[1]).toMatchObject({ monthIndex: 2, active: 4 });
  });

  it("suppresses the rate for a cohort below the floor but keeps its size", () => {
    const grid = buildCohortGrid(
      response([cohort("2024-03-01", 3, [cell(1, [2, 1, 0])], true)]),
      0,
    );

    expect(grid[0]).toMatchObject({ learners: 3, belowFloor: true });
    expect(grid[0].cells[0]).toMatchObject({ active: 2, pct: null });
  });

  it("carries the partial flag through to the cell", () => {
    const grid = buildCohortGrid(
      response([cohort("2024-03-01", 20, [cell(1, [4, 0, 0], true)])]),
      0,
    );

    expect(grid[0].cells[0]?.partial).toBe(true);
  });

  it("returns nothing for a missing response instead of a fabricated row", () => {
    expect(buildCohortGrid(undefined, 0)).toEqual([]);
  });
});

describe("maxMonthIndex", () => {
  it("takes the widest row so the axis is months-since-signup, not the last row", () => {
    expect(
      maxMonthIndex([
        cohort("2024-01-01", 10, [cell(1, [1, 0, 0]), cell(4, [1, 0, 0])]),
        cohort("2024-04-01", 10, [cell(1, [1, 0, 0])]),
      ]),
    ).toBe(4);
  });

  it("is zero when no cohort has an elapsed month", () => {
    expect(maxMonthIndex([cohort("2024-06-01", 10, [])])).toBe(0);
  });
});

describe("totalCohortLearners", () => {
  it("sums every cohort, including those below the floor", () => {
    expect(
      totalCohortLearners(
        response([cohort("2024-03-01", 20, []), cohort("2024-04-01", 3, [], true)]),
      ),
    ).toBe(23);
  });
});

describe("buildCohortCurves", () => {
  it("anchors every cohort at 100% for month 0", () => {
    const rows = buildCohortGrid(response([cohort("2024-03-01", 20, [cell(1, [10, 0, 0])])]), 0);
    const curves = buildCohortCurves(rows);

    expect(curves[0]).toMatchObject({ key: "0", value: 100 });
  });

  it("drops the unfinished current month, which would read as a fall", () => {
    const rows = buildCohortGrid(
      response([cohort("2024-03-01", 20, [cell(1, [10, 0, 0]), cell(2, [1, 0, 0], true)])]),
      0,
    );

    expect(buildCohortCurves(rows).map(p => p.key)).toEqual(["0", "1"]);
  });

  it("leaves out a cohort whose only month so far is the unfinished one", () => {
    // Otherwise it takes a colour and a legend entry to say nothing but "100%".
    const rows = buildCohortGrid(
      response([cohort("2024-05-01", 20, [cell(1, [8, 0, 0], true)])]),
      0,
    );

    expect(buildCohortCurves(rows)).toEqual([]);
  });

  it("excludes below-floor cohorts, which have no stateable rate", () => {
    const rows = buildCohortGrid(
      response([cohort("2024-03-01", 3, [cell(1, [2, 0, 0])], true)]),
      0,
    );

    expect(buildCohortCurves(rows)).toEqual([]);
  });

  it("caps at the most recent cohorts and reports how many it left out", () => {
    const many = Array.from({ length: MAX_CURVE_COHORTS + 2 }, (_, i) =>
      cohort(`2024-0${i + 1}-01`, 20, [cell(1, [10, 0, 0])]),
    );
    const rows = buildCohortGrid(response(many), 0);
    const plotted = new Set(buildCohortCurves(rows).map(p => p.group));

    expect(plotted.size).toBe(MAX_CURVE_COHORTS);
    expect(curvesOmitted(rows)).toBe(2);
    // The cap keeps the RECENT cohorts — the ones the question is about.
    expect(plotted.has(monthLabel("2024-01-01"))).toBe(false);
  });
});

describe("buildCohortCurveScale", () => {
  it("gives each plotted cohort one hue, keyed on its label not its position", () => {
    const rows = buildCohortGrid(
      response([
        cohort("2024-03-01", 20, [cell(1, [10, 0, 0])]),
        cohort("2024-04-01", 20, [cell(1, [10, 0, 0])]),
      ]),
      0,
    );
    const scale = buildCohortCurveScale(rows);

    expect(Object.keys(scale)).toEqual([monthLabel("2024-03-01"), monthLabel("2024-04-01")]);
    expect(new Set(Object.values(scale)).size).toBe(2);
  });
});

describe("cellBackground", () => {
  const alpha = (css: string | undefined) => Number(css?.match(/,\s*([\d.]+)\)$/)?.[1]);

  it("gives an unmeasured cell no fill at all", () => {
    expect(cellBackground(null)).toBeUndefined();
  });

  it("still fills a measured 0%, so it reads as measured rather than blank", () => {
    expect(cellBackground(0)).toBeDefined();
    expect(cellBackground(0)).not.toBe(cellBackground(50));
  });

  it("darkens monotonically with the rate", () => {
    expect(alpha(cellBackground(20))).toBeLessThan(alpha(cellBackground(80)));
  });

  it("stays light enough at 100% for one dark text colour to stay legible", () => {
    // Past roughly 0.6 alpha neither dark nor white text clears 4.5:1 against
    // the tile, so the ramp must not go there — the number is the value, the
    // colour only supports it.
    expect(alpha(cellBackground(100))).toBeLessThanOrEqual(0.6);
  });
});

describe("monthOneTakeaway", () => {
  it("states the median month-1 return and how many cohorts back it", () => {
    const rows = buildCohortGrid(
      response([
        cohort("2024-03-01", 20, [cell(1, [10, 0, 0])]),
        cohort("2024-04-01", 20, [cell(1, [4, 0, 0])]),
      ]),
      0,
    );

    expect(monthOneTakeaway(rows, 10)).toBe(
      "Median month-1 return: 35% across 2 complete cohorts at 10+ min",
    );
  });

  it("says nothing rather than inventing a finding when no month 1 is complete", () => {
    const rows = buildCohortGrid(
      response([cohort("2024-03-01", 20, [cell(1, [10, 0, 0], true)])]),
      0,
    );

    expect(monthOneTakeaway(rows, 10)).toBeNull();
  });
});
