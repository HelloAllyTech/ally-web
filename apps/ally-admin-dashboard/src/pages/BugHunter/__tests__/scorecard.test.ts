import { describe, expect, it } from "vitest";

import { BugHuntRunWindowSummary } from "@types";

import {
  autoMergeRate,
  formatRate,
  formatTokens,
  formatUsd,
  successRate,
  tokensMissing,
} from "../scorecard";

const window = (overrides: Partial<BugHuntRunWindowSummary> = {}): BugHuntRunWindowSummary => ({
  runs: 0,
  costUsd: 0,
  completed: 0,
  failed: 0,
  running: 0,
  skipped: 0,
  found: 0,
  autoMerged: 0,
  prOpened: 0,
  dismissed: 0,
  inputTokens: 0,
  outputTokens: 0,
  tokensReported: 0,
  ...overrides,
});

describe("successRate", () => {
  it("rates only finished shifts, ignoring running and off-duty ones", () => {
    expect(successRate(window({ completed: 3, failed: 1, running: 1, skipped: 1 }))).toBe(0.75);
  });

  /** 0/0 is not "0% reliable" — it is "nothing has finished", and a rate would libel it. */
  it("reports no rate at all when nothing has finished", () => {
    expect(successRate(window({ running: 1 }))).toBeNull();
  });
});

describe("autoMergeRate", () => {
  it("divides what merged on its own by what was found", () => {
    expect(autoMergeRate(window({ found: 10, autoMerged: 3 }))).toBe(0.3);
  });

  it("reports no rate when nothing has been found", () => {
    expect(autoMergeRate(window())).toBeNull();
  });

  /** Not clamped: 120% is how anyone would find a backend accounting bug. */
  it("does not hide a rate above one", () => {
    expect(autoMergeRate(window({ found: 5, autoMerged: 6 }))).toBe(1.2);
  });
});

describe("tokensMissing", () => {
  it("counts the runs in the window that reported no tokens", () => {
    expect(tokensMissing(window({ runs: 52, tokensReported: 40 }))).toBe(12);
  });

  it("never goes negative if the counts disagree", () => {
    expect(tokensMissing(window({ runs: 1, tokensReported: 2 }))).toBe(0);
  });
});

describe("formatters", () => {
  /**
   * A sweep costs cents and a month costs tens of dollars, and one precision
   * cannot serve both: `$0.03` printed as `$0` says the run was free.
   */
  it("keeps cents below a dollar and rounds above it", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.03)).toBe("$0.03");
    expect(formatUsd(0.994)).toBe("$0.99");
    expect(formatUsd(41.9847)).toBe("$42");
    expect(formatUsd(1234)).toBe("$1,234");
  });

  it("has no opinion on a number it cannot format", () => {
    expect(formatUsd(Number.NaN)).toBe("—");
  });

  it("shows a missing rate as an em-dash rather than as zero", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(0)).toBe("0%");
    expect(formatRate(0.336)).toBe("34%");
  });

  it("abbreviates token counts, since no decision turns on the digits", () => {
    expect(formatTokens(500)).toBe("500");
    expect(formatTokens(84_000)).toBe("84k");
    expect(formatTokens(1_238_004)).toBe("1.2M");
  });
});
