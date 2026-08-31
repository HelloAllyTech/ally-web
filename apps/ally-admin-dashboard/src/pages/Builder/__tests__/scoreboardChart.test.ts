import { describe, expect, it } from "vitest";

import type { BuilderScoreboardBuild, BuilderScoreboardTrendWeek } from "@types";

import {
  formatHours,
  formatScoreboardCost,
  medianCostSeries,
  medianFixRunsSeries,
  mergeRateSeries,
  sortScoreboardBuilds,
  weekLabel,
} from "../scoreboardChart";

/**
 * The scoreboard's job is to answer "is Builder getting better?", so the risk
 * worth testing against is a chart that quietly asserts something untrue: a
 * week with nothing merged plotted as a zero, or a fraction rendered as if it
 * were already a percentage.
 */

const week = (
  overrides: Partial<BuilderScoreboardTrendWeek> = {},
): BuilderScoreboardTrendWeek =>
  ({
    weekStart: "2026-05-12T00:00:00.000Z",
    builds: 4,
    merged: 3,
    mergeRate: 0.75,
    medianCostUsd: 12.345,
    medianFixRuns: 1.25,
    medianReviewComments: 2,
    medianTimeToMergeHours: 6,
    ...overrides,
  }) as BuilderScoreboardTrendWeek;

describe("trend series", () => {
  it("states a merge rate as a percentage, not the 0–1 fraction on the wire", () => {
    // The API sends 0.75; plotting that raw would show a 75% week as 0.75%.
    expect(mergeRateSeries([week()])).toEqual([
      { group: "Merge rate", key: "12 May", value: 75 },
    ]);
  });

  it("rounds cost and fix-run medians to something readable", () => {
    expect(medianCostSeries([week()])[0].value).toBe(12.35);
    expect(medianFixRunsSeries([week()])[0].value).toBe(1.3);
  });

  it("omits a week with no data rather than plotting it as zero", () => {
    // A week where nothing merged has a null median, and a zero would read as
    // "it got much cheaper" instead of "there is nothing to say".
    const series = medianCostSeries([
      week({ medianCostUsd: null }),
      week({ weekStart: "2026-05-19T00:00:00.000Z", medianCostUsd: 8 }),
    ]);

    expect(series).toHaveLength(1);
    expect(series[0].key).toBe("19 May");
  });

  it("keeps tick labels inside Carbon's 14-character truncation", () => {
    // Past 14 characters a LABELS-axis tick is silently cut off.
    expect(weekLabel("2026-05-12T00:00:00.000Z").length).toBeLessThanOrEqual(14);
  });

  it("falls back to the raw value on an unparsable date rather than showing Invalid Date", () => {
    expect(weekLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("formatters", () => {
  it("says an em dash where there is nothing to report", () => {
    expect(formatHours(null)).toBe("—");
    expect(formatScoreboardCost(null)).toBe("—");
  });

  it("reads sub-hour durations in minutes", () => {
    expect(formatHours(0.5)).toBe("30m");
    expect(formatHours(6.25)).toBe("6.3h");
  });
});

describe("sortScoreboardBuilds", () => {
  const build = (
    overrides: Partial<BuilderScoreboardBuild> = {},
  ): BuilderScoreboardBuild =>
    ({
      sessionId: "s1",
      title: "A build",
      repos: ["ally-be"],
      createdAt: "2026-05-12T00:00:00.000Z",
      outcome: "merged",
      runCount: 1,
      fixRunCount: 0,
      reviewCommentCount: 0,
      ciFailureCount: 0,
      costUsd: 10,
      runnerMinutes: 30,
      durationHours: 1,
      timeToMergeHours: 4,
      failureTags: [],
      ...overrides,
    }) as BuilderScoreboardBuild;

  const builds = [
    build({ sessionId: "cheap", costUsd: 5 }),
    build({ sessionId: "dear", costUsd: 40 }),
    build({ sessionId: "middling", costUsd: 18 }),
  ];

  it("sorts descending by default direction", () => {
    const sorted = sortScoreboardBuilds(builds, "costUsd", "desc");
    expect(sorted.map(b => b.sessionId)).toEqual(["dear", "middling", "cheap"]);
  });

  it("sorts ascending", () => {
    const sorted = sortScoreboardBuilds(builds, "costUsd", "asc");
    expect(sorted.map(b => b.sessionId)).toEqual(["cheap", "middling", "dear"]);
  });

  it("does not mutate the array it was given", () => {
    // The rows come straight from RTK's cache; sorting in place would mutate
    // cached state and desync the table from the store.
    const original = [...builds];
    sortScoreboardBuilds(builds, "costUsd", "asc");
    expect(builds).toEqual(original);
  });
});
