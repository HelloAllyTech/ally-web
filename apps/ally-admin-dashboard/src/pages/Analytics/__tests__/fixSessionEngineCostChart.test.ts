import { describe, expect, it } from "vitest";

import { FixSessionEngineCost } from "@types";

import { buildFixSessionEngineCostBars } from "../fixSessionEngineCostChart";

const row = (over: Partial<FixSessionEngineCost> = {}): FixSessionEngineCost => ({
  engine: "claude-code",
  avgCostUsd: 0,
  sessionCount: 0,
  ...over,
});

describe("buildFixSessionEngineCostBars", () => {
  it("labels claude-code as Claude and gemini as Gemini", () => {
    const bars = buildFixSessionEngineCostBars([
      row({ engine: "claude-code", avgCostUsd: 1 }),
      row({ engine: "gemini", avgCostUsd: 2 }),
    ]);

    expect(bars.map(b => b.group)).toEqual(expect.arrayContaining(["Claude", "Gemini"]));
  });

  it("falls back to the raw engine string for one this map doesn't know yet", () => {
    const bars = buildFixSessionEngineCostBars([row({ engine: "codex", avgCostUsd: 1 })]);

    expect(bars).toEqual([{ group: "codex", value: 1 }]);
  });

  it("sorts the more expensive engine first", () => {
    const bars = buildFixSessionEngineCostBars([
      row({ engine: "claude-code", avgCostUsd: 3 }),
      row({ engine: "gemini", avgCostUsd: 0.5 }),
    ]);

    expect(bars.map(b => b.group)).toEqual(["Claude", "Gemini"]);
  });

  it("returns nothing rather than a misleading empty bar when there's no data yet", () => {
    expect(buildFixSessionEngineCostBars([])).toEqual([]);
  });
});
