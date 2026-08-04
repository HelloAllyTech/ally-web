import { describe, expect, it } from "vitest";

import { UsageLevelMonth, UsageLevelResponse } from "@types";

import { CONTEXT } from "../chartScales";
import {
  bandLabels,
  buildUsageLevelMonths,
  buildUsageLevelScale,
  buildUsageLevelSeries,
  buildUsageLevelTable,
  latestUsagePopulation,
  plottableUsageMonths,
  suppressedUsageMonths,
  usageLevelTakeaway,
} from "../usageLevelChart";

/** Two bands keep the fixtures readable; the transforms are band-count agnostic. */
const BANDS = [
  { label: "Under 10 min", minMinutes: 0, maxMinutes: 10 },
  { label: "10+ min", minMinutes: 10, maxMinutes: null },
];

const month = (
  m: string,
  learnersByBand: number[],
  registeredLearners: number,
  activatedLearners: number,
  partial = false,
): UsageLevelMonth => ({
  month: m,
  learnersByBand,
  activeLearners: learnersByBand.reduce((a, b) => a + b, 0),
  registeredLearners,
  activatedLearners,
  partial,
});

const response = (months: UsageLevelMonth[]): UsageLevelResponse => ({
  bands: BANDS,
  zeroBandLabel: "0 min",
  completeMonths: 12,
  minPopulationSize: 5,
  currentMonth: "2024-06-01",
  months,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2024-06-12T12:00:00.000Z",
});

describe("bandLabels", () => {
  it("puts the zero band first so the stack reads bottom-up as rising usage", () => {
    expect(bandLabels(response([]))).toEqual(["0 min", "Under 10 min", "10+ min"]);
  });

  it("returns nothing without a response", () => {
    expect(bandLabels(undefined)).toEqual([]);
  });
});

describe("buildUsageLevelMonths", () => {
  it("derives the zero band as the residual of the chosen denominator", () => {
    const data = response([month("2024-05-01", [6, 4], 30, 20)]);

    const registered = buildUsageLevelMonths(data, "registered")[0];
    const activated = buildUsageLevelMonths(data, "activated")[0];

    // 30 registered - 10 active = 20 who practised nothing.
    expect(registered.countsByBand).toEqual([20, 6, 4]);
    expect(registered.population).toBe(30);
    // Same numerators, smaller denominator: 20 activated - 10 active = 10.
    expect(activated.countsByBand).toEqual([10, 6, 4]);
    expect(activated.population).toBe(20);
  });

  it("shares each band over the selected denominator and sums to 100", () => {
    const data = response([month("2024-05-01", [6, 4], 40, 20)]);

    const shares = buildUsageLevelMonths(data, "registered")[0].sharesByBand;

    expect(shares).toEqual([75, 15, 10]);
    expect((shares as number[]).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it("drops a month whose population is zero — a share of nobody is undefined, not zero", () => {
    const data = response([month("2024-04-01", [0, 0], 0, 0), month("2024-05-01", [6, 4], 30, 20)]);

    expect(buildUsageLevelMonths(data, "registered").map(m => m.month)).toEqual(["2024-05-01"]);
  });

  it("suppresses shares but keeps counts below the minimum population", () => {
    const data = response([month("2024-05-01", [2, 1], 4, 4)]);

    const view = buildUsageLevelMonths(data, "registered")[0];

    expect(view.belowFloor).toBe(true);
    expect(view.sharesByBand).toBeNull();
    expect(view.countsByBand).toEqual([1, 2, 1]);
  });

  it("never lets the population fall below the people counted inside it", () => {
    // Anomalous data: more active learners than registered accounts. Clamping the
    // population keeps the zero band at 0 rather than inverting the stack.
    const data = response([month("2024-05-01", [8, 4], 5, 5)]);

    const view = buildUsageLevelMonths(data, "registered")[0];

    expect(view.population).toBe(12);
    expect(view.countsByBand[0]).toBe(0);
  });
});

describe("plottableUsageMonths", () => {
  const data = response([
    month("2024-03-01", [6, 4], 30, 20),
    month("2024-04-01", [2, 1], 4, 4),
    month("2024-06-01", [1, 1], 30, 20, true),
  ]);
  const months = buildUsageLevelMonths(data, "registered");

  it("leaves off the in-progress month, whose low bands are overstated", () => {
    expect(plottableUsageMonths(months).map(m => m.month)).toEqual(["2024-03-01"]);
  });

  it("counts the small months as suppressed rather than losing them silently", () => {
    expect(suppressedUsageMonths(months).map(m => m.month)).toEqual(["2024-04-01"]);
  });
});

describe("buildUsageLevelSeries", () => {
  it("emits one segment per band per plottable month, in stack order", () => {
    const data = response([
      month("2024-04-01", [6, 4], 40, 20),
      month("2024-06-01", [1, 0], 40, 20, true),
    ]);
    const months = buildUsageLevelMonths(data, "registered");
    const labels = bandLabels(data);

    const series = buildUsageLevelSeries(months, labels);

    // 3 bands x 1 plottable month; the partial month contributes nothing.
    expect(series).toEqual([
      { group: "0 min", key: "Apr 2024", value: 75 },
      { group: "Under 10 min", key: "Apr 2024", value: 15 },
      { group: "10+ min", key: "Apr 2024", value: 10 },
    ]);
  });
});

describe("buildUsageLevelScale", () => {
  it("greys the zero band and ramps the usage bands", () => {
    const scale = buildUsageLevelScale(["0 min", "Under 10 min", "10+ min"]);

    expect(scale["0 min"]).toBe(CONTEXT.faint);
    // Ordered categories share one hue at rising saturation, and the zero band is
    // never part of that ramp — it is the absence of a usage level, not the lowest.
    expect(scale["Under 10 min"]).not.toBe(scale["10+ min"]);
    expect(scale["Under 10 min"]).not.toBe(CONTEXT.faint);
  });
});

describe("usageLevelTakeaway", () => {
  it("states the latest complete month against the oldest one as its basis", () => {
    const data = response([
      month("2024-03-01", [5, 5], 100, 60),
      month("2024-04-01", [10, 10], 100, 60),
    ]);

    const takeaway = usageLevelTakeaway(buildUsageLevelMonths(data, "registered"));

    expect(takeaway).toBe("20% of 100 learners practised at all in Apr 2024 — ↑ 10 pp vs Mar 2024");
  });

  it("states the month alone rather than inventing a comparison from one month", () => {
    const data = response([month("2024-04-01", [10, 10], 100, 60)]);

    expect(usageLevelTakeaway(buildUsageLevelMonths(data, "registered"))).toBe(
      "20% of 100 learners practised at all in Apr 2024",
    );
  });

  it("says nothing when no month can be plotted", () => {
    const data = response([month("2024-06-01", [1, 1], 30, 20, true)]);

    expect(usageLevelTakeaway(buildUsageLevelMonths(data, "registered"))).toBeNull();
  });
});

describe("buildUsageLevelTable", () => {
  it("carries counts for every month, including the ones the chart cannot draw", () => {
    const data = response([
      month("2024-04-01", [6, 4], 40, 20),
      month("2024-05-01", [2, 1], 4, 4),
      month("2024-06-01", [1, 1], 40, 20, true),
    ]);
    const months = buildUsageLevelMonths(data, "registered");

    const table = buildUsageLevelTable(months, bandLabels(data));

    expect(table.columns).toEqual([
      "Month",
      "Learners",
      "0 min (n)",
      "Under 10 min (n)",
      "10+ min (n)",
      "Practised at all (%)",
    ]);
    expect(table.rows).toEqual([
      ["Apr 2024", 40, 30, 6, 4, 25],
      // Below the floor: counts stay, the share does not.
      ["May 2024", 4, 1, 2, 1, null],
      ["Jun 2024 (in progress)", 40, 38, 1, 1, 5],
    ]);
  });
});

describe("latestUsagePopulation", () => {
  it("reports the latest COMPLETE month's population as the chart's n", () => {
    const data = response([
      month("2024-04-01", [6, 4], 40, 20),
      month("2024-06-01", [1, 1], 90, 50, true),
    ]);

    expect(latestUsagePopulation(buildUsageLevelMonths(data, "registered"))).toBe(40);
  });
});
