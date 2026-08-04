import { describe, expect, it } from "vitest";

import { buildCsv } from "../ChartDetailModal";
import { hBarOpts, timeBarOpts } from "../chartKit";
import { single } from "../chartKit";

describe("buildCsv", () => {
  it("writes the window, filters and n above the header row", () => {
    // A bare table of numbers loses its context the moment it lands in a
    // spreadsheet, and then gets quoted in a meeting without it.
    const csv = buildCsv(
      "Roleplay quality",
      { columns: ["Week", "Score"], rows: [["2024-06-10", 82.5]] },
      ["Window: Last 30 days", "n = 412 evaluated sessions"],
    );

    expect(csv.split("\n")).toEqual([
      "# Roleplay quality",
      "# Window: Last 30 days",
      "# n = 412 evaluated sessions",
      "Week,Score",
      "2024-06-10,82.5",
    ]);
  });

  it("renders a null as an empty cell, never as a zero", () => {
    const csv = buildCsv("t", { columns: ["Week", "Score"], rows: [["2024-06-10", null]] });

    expect(csv.endsWith("2024-06-10,")).toBe(true);
    expect(csv).not.toContain("2024-06-10,0");
  });

  it("quotes and escapes cells containing commas or quotes", () => {
    const csv = buildCsv("t", {
      columns: ["Org", "Note"],
      rows: [["Acme, Inc.", 'said "hello"']],
    });

    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"said ""hello"""');
  });

  it("still emits the header when there are no rows", () => {
    expect(buildCsv("t", { columns: ["A"], rows: [] })).toBe("# t\nA");
  });
});

describe("axis mapping guards the collapsed-bar bug", () => {
  it("timeBarOpts maps the x-axis to `key` (the period)", () => {
    // A per-bucket series is {group: <constant>, key: <period>}. Mapped to
    // `group` — the categorical bar default — every period collapses onto one
    // bar labelled with the constant, which is exactly what used to happen on
    // two tabs.
    const opts = timeBarOpts({ colorScale: single("Simulations") });

    expect(opts.axes.bottom.mapsTo).toBe("key");
    expect(opts.axes.left.mapsTo).toBe("value");
  });

  it("hBarOpts swaps the axes so long category labels stay readable", () => {
    const opts = hBarOpts({ colorScale: single("Org") });

    expect(opts.axes.left.mapsTo).toBe("group");
    expect(opts.axes.bottom.mapsTo).toBe("value");
  });

  it("applies an explicit bounded domain when one is given", () => {
    const opts = timeBarOpts({ colorScale: single("x"), domain: [1, 5] });

    expect(opts.axes.left).toMatchObject({ domain: [1, 5] });
  });

  it("anchors at zero when no domain is given — counts and rates have a real zero", () => {
    // Left to fit the data, Carbon starts just below the minimum, so a series of
    // 1s and 2s sits halfway up the plot.
    const opts = timeBarOpts({ colorScale: single("x") });

    expect("domain" in opts.axes.left).toBe(false);
    expect(opts.axes.left).toMatchObject({ includeZero: true });
  });

  it("lets an explicit bounded domain win over the zero anchor", () => {
    const opts = timeBarOpts({ colorScale: single("x"), domain: [1, 5] });

    expect(opts.axes.left).toMatchObject({ domain: [1, 5] });
    expect("includeZero" in opts.axes.left).toBe(false);
  });
});
