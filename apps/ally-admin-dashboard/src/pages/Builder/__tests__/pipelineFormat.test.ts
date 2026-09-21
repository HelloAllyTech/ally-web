import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatDurationMs,
  formatPassRate,
  formatPipelineCost,
  sortPhasesByCostDesc,
  timeSplit,
} from "../pipelineFormat";

import type { BuilderPipelinePhase } from "@types";

const phase = (over: Partial<BuilderPipelinePhase> = {}): BuilderPipelinePhase => ({
  phase: "code-1",
  model: "claude-sonnet-5",
  invocations: 1,
  totalCostUsd: 1,
  medianCostUsd: 1,
  medianWallMs: 1000,
  p95WallMs: 1000,
  medianApiMs: 500,
  medianTurns: 10,
  ...over,
});

describe("formatDurationMs", () => {
  it("renders the scales a build actually spans", () => {
    expect(formatDurationMs(420)).toBe("420ms");
    expect(formatDurationMs(3200)).toBe("3.2s");
    expect(formatDurationMs(1_122_000)).toBe("18m 42s");
    expect(formatDurationMs(5_000_000)).toBe("1h 23m");
  });

  it("does not produce a 60th second", () => {
    // 119.6s rounds to 120s. Splitting before rounding gives "1m 60s".
    expect(formatDurationMs(119_600)).toBe("2m 0s");
  });

  it("says nothing when there is nothing measured", () => {
    expect(formatDurationMs(null)).toBe("—");
    expect(formatDurationMs(undefined)).toBe("—");
    expect(formatDurationMs(Number.NaN)).toBe("—");
    expect(formatDurationMs(-1)).toBe("—");
  });

  it("keeps a real zero distinct from an absent one", () => {
    expect(formatDurationMs(0)).toBe("0ms");
  });
});

describe("formatPipelineCost / formatPassRate / formatCount", () => {
  it("formats present values", () => {
    expect(formatPipelineCost(8.9164)).toBe("$8.92");
    expect(formatPassRate(0.5)).toBe("50%");
    expect(formatPassRate(2 / 3)).toBe("67%");
    expect(formatCount(148)).toBe("148");
    expect(formatCount(12.5)).toBe("12.5");
  });

  it("dashes an absent one rather than showing a zero", () => {
    expect(formatPipelineCost(null)).toBe("—");
    expect(formatPassRate(null)).toBe("—");
    expect(formatCount(null)).toBe("—");
    // A genuine zero is a fact and must survive.
    expect(formatPipelineCost(0)).toBe("$0.00");
    expect(formatPassRate(0)).toBe("0%");
    expect(formatCount(0)).toBe("0");
  });
});

describe("timeSplit", () => {
  it("splits wall clock into model time and tool time", () => {
    // The first real build's coder phase: 776s of API inside 2009s of wall.
    expect(timeSplit(phase({ medianWallMs: 2_008_802, medianApiMs: 775_569 }))).toEqual({
      apiPercent: 39,
      toolPercent: 61,
    });
  });

  it("refuses to invent a split it cannot measure", () => {
    expect(timeSplit(phase({ medianWallMs: null, medianApiMs: 500 }))).toBeNull();
    expect(timeSplit(phase({ medianWallMs: 1000, medianApiMs: null }))).toBeNull();
    expect(timeSplit(phase({ medianWallMs: 0, medianApiMs: 0 }))).toBeNull();
  });

  it("refuses a split that would render past 100%", () => {
    // Parallel subagents can genuinely bill more API time than wall clock.
    expect(timeSplit(phase({ medianWallMs: 1000, medianApiMs: 4000 }))).toBeNull();
  });
});

describe("sortPhasesByCostDesc", () => {
  it("puts the most expensive phase first", () => {
    const sorted = sortPhasesByCostDesc([
      phase({ phase: "verify-1", totalCostUsd: 3.5 }),
      phase({ phase: "code-1", totalCostUsd: 8.92 }),
      phase({ phase: "plan", totalCostUsd: 7.85 }),
    ]);
    expect(sorted.map(p => p.phase)).toEqual(["code-1", "plan", "verify-1"]);
  });

  it("sorts an uncosted phase last rather than treating it as free", () => {
    const sorted = sortPhasesByCostDesc([
      phase({ phase: "unknown", totalCostUsd: null }),
      phase({ phase: "plan", totalCostUsd: 2 }),
    ]);
    expect(sorted.map(p => p.phase)).toEqual(["plan", "unknown"]);
  });

  it("does not mutate its input", () => {
    const input = [phase({ phase: "a", totalCostUsd: 1 }), phase({ phase: "b", totalCostUsd: 2 })];
    sortPhasesByCostDesc(input);
    expect(input.map(p => p.phase)).toEqual(["a", "b"]);
  });
});
