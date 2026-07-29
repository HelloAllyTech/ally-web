import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUPING,
  bucketTitle,
  groupingNote,
  inProgressCaption,
  isInProgress,
  useChartGrouping,
  withoutInProgress,
} from "../analyticsGrouping";

describe("bucketTitle", () => {
  it("names every grain, including the one added for all-time views", () => {
    expect(bucketTitle("day")).toBe("Day");
    expect(bucketTitle("week")).toBe("Week");
    expect(bucketTitle("month")).toBe("Month");
    expect(bucketTitle("year")).toBe("Year");
  });

  it("falls back rather than rendering undefined on an unknown value", () => {
    expect(bucketTitle(undefined)).toBe("Week");
    expect(bucketTitle("fortnight")).toBe("Week");
  });
});

describe("withoutInProgress", () => {
  const points = [{ bucket: "2026-05-01" }, { bucket: "2026-06-01" }, { bucket: "2026-07-01" }];

  it("drops the still-accruing period from a plotted series", () => {
    // The current month can only rise, so plotting it draws a fall that is an
    // artefact of the clock rather than a change in the metric.
    expect(withoutInProgress(points, p => p.bucket, "2026-07-01")).toEqual([
      { bucket: "2026-05-01" },
      { bucket: "2026-06-01" },
    ]);
  });

  it("leaves the series untouched when the window ended in the past", () => {
    expect(withoutInProgress(points, p => p.bucket, null)).toBe(points);
    expect(withoutInProgress(points, p => p.bucket, undefined)).toBe(points);
  });

  it("drops nothing when the flagged bucket is not in the series", () => {
    expect(withoutInProgress(points, p => p.bucket, "2026-08-01")).toHaveLength(3);
  });

  it("keys off the accessor, so a series keyed by `date` works too", () => {
    const growth = [{ date: "2026-06-01" }, { date: "2026-07-01" }];

    expect(withoutInProgress(growth, p => p.date, "2026-07-01")).toEqual([{ date: "2026-06-01" }]);
  });
});

describe("isInProgress", () => {
  it("flags only the named bucket, and nothing when none is named", () => {
    expect(isInProgress("2026-07-01", "2026-07-01")).toBe(true);
    expect(isInProgress("2026-06-01", "2026-07-01")).toBe(false);
    expect(isInProgress("2026-07-01", null)).toBe(false);
  });
});

describe("captions and notes", () => {
  it("names the omission on the chart's face, at the chart's own grain", () => {
    expect(inProgressCaption("month", "2026-07-01")).toContain("current month");
    expect(inProgressCaption("year", "2026-01-01")).toContain("current year");
  });

  it("says nothing when there is nothing omitted", () => {
    expect(inProgressCaption("month", null)).toBe("");
  });

  it("states the grain for a provenance line", () => {
    expect(groupingNote("week")).toBe("grouped by week");
  });
});

describe("useChartGrouping", () => {
  const defaults = { a: DEFAULT_GROUPING, b: DEFAULT_GROUPING } as const;

  it("starts every chart on the base grain, costing one query", () => {
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    expect(result.current.groupingFor("a")).toBe(DEFAULT_GROUPING);
    expect([...result.current.bucketsInUse]).toEqual([DEFAULT_GROUPING]);
  });

  it("re-grains one chart without touching its neighbour", () => {
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    act(() => result.current.setGrouping("a", "year"));

    expect(result.current.groupingFor("a")).toBe("year");
    expect(result.current.groupingFor("b")).toBe(DEFAULT_GROUPING);
  });

  it("keeps the base grain in use even when no chart is showing it", () => {
    // The KPI strip and the panels with no time axis read from the base
    // response; they must not blink out because the last chart on that grain was
    // switched away.
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    act(() => {
      result.current.setGrouping("a", "year");
      result.current.setGrouping("b", "day");
    });

    expect(result.current.bucketsInUse).toContain(DEFAULT_GROUPING);
    expect([...result.current.bucketsInUse].sort()).toEqual(
      [DEFAULT_GROUPING, "day", "year"].sort(),
    );
  });

  it("collapses two charts on the same grain into one query", () => {
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    act(() => {
      result.current.setGrouping("a", "week");
      result.current.setGrouping("b", "week");
    });

    // base + week — not one entry per chart.
    expect(result.current.bucketsInUse.size).toBe(2);
  });

  it("scopes grains to the charts asked about, so one endpoint's charts do not pull another's", () => {
    // Re-graining a chart fed by endpoint A must not add a grain to endpoint B,
    // which would re-run an aggregation for data nothing there is showing.
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    act(() => result.current.setGrouping("a", "year"));

    expect([...result.current.bucketsFor(["a"])].sort()).toEqual([DEFAULT_GROUPING, "year"].sort());
    expect([...result.current.bucketsFor(["b"])]).toEqual([DEFAULT_GROUPING]);
  });

  it("always includes the base grain in a scoped set too", () => {
    const { result } = renderHook(() => useChartGrouping({ ...defaults }));

    act(() => result.current.setGrouping("a", "day"));

    expect(result.current.bucketsFor(["a"])).toContain(DEFAULT_GROUPING);
  });
});
