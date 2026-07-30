import { describe, expect, it } from "vitest";

import { AnalyticsAgentChart } from "@types";

import { MAX_SERIES, buildAgentChart, toNumberOrNull } from "../agentChart";

/**
 * The Analytics Agent proposes a chart; this mapper decides whether the rows can
 * honestly carry it. These tests pin the honesty rules, because every one of them
 * fails *silently* if it regresses — a zero where a measurement is missing, or a
 * plot over fewer rows than the table beside it, both render perfectly happily.
 */

const spec = (overrides: Partial<AnalyticsAgentChart> = {}): AnalyticsAgentChart => ({
  type: "line",
  x: "bucket",
  y: "n",
  group: "",
  xLabel: "Week",
  yLabel: "Sessions",
  title: "Sessions per week",
  ...overrides,
});

const rows = [
  { bucket: "2026-07-01", n: 10 },
  { bucket: "2026-07-08", n: 14 },
  { bucket: "2026-07-15", n: 9 },
];

describe("toNumberOrNull", () => {
  it("accepts a numeric string, because Postgres returns numeric as text", () => {
    // A `numeric` average arrives as "12.5" through the driver. Treating it as
    // unplottable would blank exactly the charts people ask for most.
    expect(toNumberOrNull("12.5")).toBe(12.5);
    expect(toNumberOrNull(0)).toBe(0);
  });

  it("maps null, empty and non-numeric text to null rather than zero", () => {
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
    expect(toNumberOrNull("")).toBeNull();
    expect(toNumberOrNull("n/a")).toBeNull();
    expect(toNumberOrNull({})).toBeNull();
  });

  it("maps non-finite numbers to null", () => {
    expect(toNumberOrNull(Number.NaN)).toBeNull();
    expect(toNumberOrNull(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("buildAgentChart — when there is no chart to draw", () => {
  it("returns null for an absent or explicit no-chart spec", () => {
    expect(buildAgentChart(null, rows)).toBeNull();
    expect(buildAgentChart(spec({ type: "none" }), rows)).toBeNull();
  });

  it("returns null when there are no rows", () => {
    expect(buildAgentChart(spec(), [])).toBeNull();
  });

  it("returns null when a named column is not in the result", () => {
    // An empty plot reads as a broken panel; the table alone is the honest
    // fallback.
    expect(buildAgentChart(spec({ y: "total" }), rows)).toBeNull();
    expect(buildAgentChart(spec({ x: "week" }), rows)).toBeNull();
  });

  it("returns null when no row has a numeric measure", () => {
    expect(
      buildAgentChart(spec({ type: "bar" }), [
        { bucket: "a", n: null },
        { bucket: "b", n: "n/a" },
      ]),
    ).toBeNull();
  });
});

describe("buildAgentChart — line", () => {
  it("maps rows to key/value with a single series named for the measure", () => {
    const model = buildAgentChart(spec(), rows);

    expect(model?.kind).toBe("line");
    expect(model?.data).toEqual([
      { group: "Sessions", key: "2026-07-01", value: 10 },
      { group: "Sessions", key: "2026-07-08", value: 14 },
      { group: "Sessions", key: "2026-07-15", value: 9 },
    ]);
    expect(model?.skippedRows).toBe(0);
  });

  it("keeps a missing measure as null so the line breaks instead of dipping to zero", () => {
    // The whole point: an unmarked flat segment at zero is indistinguishable
    // from a measured zero, and reads as the good news it isn't.
    const model = buildAgentChart(spec(), [
      { bucket: "w1", n: 10 },
      { bucket: "w2", n: null },
      { bucket: "w3", n: 12 },
    ]);

    expect(model?.data.map(d => d.value)).toEqual([10, null, 12]);
    // Counted, so the panel can say the plot is not over every row.
    expect(model?.skippedRows).toBe(1);
  });

  it("splits into series when a group column is present, and enables the legend", () => {
    const model = buildAgentChart(spec({ group: "language" }), [
      { bucket: "w1", n: 5, language: "en" },
      { bucket: "w1", n: 3, language: "hi" },
      { bucket: "w2", n: 6, language: "en" },
    ]);

    expect(model?.data.map(d => d.group)).toEqual(["en", "hi", "en"]);
    expect((model?.options as { legend: { enabled: boolean } }).legend.enabled).toBe(true);
  });

  it("ignores a group column that is not in the result", () => {
    const model = buildAgentChart(spec({ group: "tenant" }), rows);
    expect(model?.data.every(d => d.group === "Sessions")).toBe(true);
  });

  it("trims an ISO midnight timestamp to its date, which is what the bucket means", () => {
    const model = buildAgentChart(spec(), [
      { bucket: "2026-07-01T00:00:00.000Z", n: 1 },
      { bucket: "2026-07-02T00:00:00.000Z", n: 2 },
      { bucket: "2026-07-03T00:00:00.000Z", n: 3 },
    ]);
    expect(model?.data.map(d => d.key)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("drops series beyond the palette rather than repeating a colour", () => {
    // Two series sharing a colour look like one series, which is worse than an
    // acknowledged omission.
    const many = Array.from({ length: MAX_SERIES + 3 }, (_, i) => ({
      bucket: "w1",
      n: i,
      language: `lang-${i}`,
    }));
    const model = buildAgentChart(spec({ group: "language" }), many);

    expect(new Set(model?.data.map(d => d.group)).size).toBe(MAX_SERIES);
    expect(model?.skippedRows).toBe(3);
  });
});

describe("buildAgentChart — bar", () => {
  it("maps the x column onto the bar category, which is what barOpts plots", () => {
    const model = buildAgentChart(spec({ type: "bar", x: "org", y: "sessions" }), [
      { org: "Alpha", sessions: 12 },
      { org: "Beta", sessions: 7 },
    ]);

    expect(model?.kind).toBe("bar");
    expect(model?.data).toEqual([
      { group: "Alpha", value: 12 },
      { group: "Beta", value: 7 },
    ]);
  });

  it("omits a bar for an unmeasured value and counts it", () => {
    // A bar encodes magnitude by length, so there is no honest bar for "not
    // measured" — unlike a line, which can carry a gap.
    const model = buildAgentChart(spec({ type: "bar", x: "org", y: "sessions" }), [
      { org: "Alpha", sessions: 12 },
      { org: "Beta", sessions: null },
    ]);

    expect(model?.data).toEqual([{ group: "Alpha", value: 12 }]);
    expect(model?.skippedRows).toBe(1);
  });

  it("renders a bar that turned out to have series as a stack", () => {
    // With an unknown series count, side-by-side bars get thinner until they are
    // unreadable; a stack stays legible.
    const model = buildAgentChart(spec({ type: "bar", group: "language" }), [
      { bucket: "w1", n: 5, language: "en" },
      { bucket: "w1", n: 3, language: "hi" },
      { bucket: "w2", n: 6, language: "en" },
    ]);

    expect(model?.kind).toBe("stacked");
  });
});

describe("buildAgentChart — stacked bar", () => {
  it("maps series to group and buckets to key", () => {
    const model = buildAgentChart(spec({ type: "stacked_bar", group: "language" }), [
      { bucket: "w1", n: 5, language: "en" },
      { bucket: "w1", n: 3, language: "hi" },
      { bucket: "w2", n: 6, language: "en" },
    ]);

    expect(model?.kind).toBe("stacked");
    expect(model?.data).toEqual([
      { group: "en", key: "w1", value: 5 },
      { group: "hi", key: "w1", value: 3 },
      { group: "en", key: "w2", value: 6 },
    ]);
  });
});

describe("buildAgentChart — scatter", () => {
  it("maps both measures onto x and y", () => {
    const model = buildAgentChart(
      spec({ type: "scatter", x: "minutes", y: "score", xLabel: "Minutes", yLabel: "Score" }),
      [
        { minutes: 10, score: 60 },
        { minutes: 40, score: 82 },
      ],
    );

    expect(model?.kind).toBe("scatter");
    expect(model?.data).toEqual([
      { group: "Score", x: 10, y: 60 },
      { group: "Score", x: 40, y: 82 },
    ]);
  });

  it("drops a point missing either coordinate", () => {
    const model = buildAgentChart(spec({ type: "scatter", x: "minutes", y: "score" }), [
      { minutes: 10, score: 60 },
      { minutes: null, score: 82 },
      { minutes: 30, score: null },
    ]);

    expect(model?.data).toHaveLength(1);
    expect(model?.skippedRows).toBe(2);
  });
});

describe("buildAgentChart — axis labels", () => {
  it("uses the agent's labels when it supplied them", () => {
    const model = buildAgentChart(spec(), rows);
    const options = model?.options as {
      axes: { left: { title: string }; bottom: { title: string } };
    };

    expect(options.axes.left.title).toBe("Sessions");
    expect(options.axes.bottom.title).toBe("Week");
  });

  it("falls back to the column name, which is at least true", () => {
    const model = buildAgentChart(spec({ xLabel: "", yLabel: "  " }), rows);
    const options = model?.options as {
      axes: { left: { title: string }; bottom: { title: string } };
    };

    expect(options.axes.left.title).toBe("n");
    expect(options.axes.bottom.title).toBe("bucket");
  });
});
