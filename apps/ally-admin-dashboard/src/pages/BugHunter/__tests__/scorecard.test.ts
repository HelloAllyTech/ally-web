import { describe, expect, it } from "vitest";

import { BugHuntRun, BugHuntRunStatus, BugHuntTrigger } from "@types";

import {
  buildAgentScorecard,
  formatRate,
  formatTokens,
  formatUsd,
  runCostUsd,
  RUNS_WINDOW,
  SERIES_DAYS,
} from "../scorecard";

/** Fixed clock, so the windows and the fourteen-day series are deterministic. */
const NOW = new Date("2026-08-20T12:00:00.000Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

const run = (overrides: Partial<BugHuntRun> & { id: string }): BugHuntRun =>
  ({
    trigger: BugHuntTrigger.SCHEDULED,
    repo: "ally-be",
    status: BugHuntRunStatus.COMPLETED,
    finishedAt: null,
    foundCount: 0,
    autoMergedCount: 0,
    prOpenedCount: 0,
    dismissedCount: 0,
    totalTokenCostUsd: "0",
    cliReportedCostUsd: null,
    totalInputTokens: null,
    totalOutputTokens: null,
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  }) as BugHuntRun;

/** `daysAgo` fractional, so a run can be placed inside a specific local day. */
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

describe("runCostUsd", () => {
  /**
   * The token estimate prices prompt-cache reads at full rate and so overstates
   * a cache-heavy run, often by a lot. When the CLI reported its own figure
   * that is the one that reflects the invoice.
   */
  it("prefers the CLI's own cost over the cache-blind token estimate", () => {
    expect(runCostUsd(run({ id: "a", totalTokenCostUsd: "9.5000", cliReportedCostUsd: 1.25 }))).toBe(
      1.25,
    );
  });

  it("falls back to the token estimate for runs closed before the CLI figure was captured", () => {
    expect(runCostUsd(run({ id: "a", totalTokenCostUsd: "2.5000" }))).toBe(2.5);
  });

  /**
   * A `numeric` that fails to parse must contribute zero rather than turning
   * the page's whole total into NaN — one bad row would otherwise blank every
   * spend figure on the tab.
   */
  it("treats an unparseable cost as zero rather than poisoning the sum", () => {
    expect(runCostUsd(run({ id: "a", totalTokenCostUsd: "not-a-number" }))).toBe(0);
    const card = buildAgentScorecard({
      runs: [run({ id: "a", totalTokenCostUsd: "oops" }), run({ id: "b", totalTokenCostUsd: "3" })],
      now: NOW,
    });
    expect(card.spend.find(s => s.days === null)?.costUsd).toBe(3);
  });
});

describe("spend windows", () => {
  const runs = [
    run({ id: "today", createdAt: at(0.2), cliReportedCostUsd: 1 }),
    run({ id: "recent", createdAt: at(3), cliReportedCostUsd: 2 }),
    run({ id: "older", createdAt: at(20), cliReportedCostUsd: 4 }),
    run({ id: "ancient", createdAt: at(120), cliReportedCostUsd: 8 }),
  ];

  it("sums only the runs inside each window", () => {
    const card = buildAgentScorecard({ runs, now: NOW });
    expect(card.spend.find(s => s.days === 7)?.costUsd).toBe(3);
    expect(card.spend.find(s => s.days === 30)?.costUsd).toBe(7);
    expect(card.spend.find(s => s.days === null)?.costUsd).toBe(15);
  });

  /**
   * The honesty property the whole module exists for. A window is only a floor
   * when the server actually capped us AND the oldest run we hold starts inside
   * the period — that is the only case where we can prove runs are missing from
   * it. A short list proves nothing is missing, so every window is complete.
   */
  it("calls every window complete when the run list came back under the cap", () => {
    const card = buildAgentScorecard({ runs, now: NOW });
    expect(card.spend.every(window => window.complete)).toBe(true);
    expect(card.runWindowTruncated).toBe(false);
  });

  it("marks a window incomplete when the cap hid older runs inside it", () => {
    // A full window of runs, all from the last three days: there are certainly
    // older runs in the 7- and 30-day periods that we were never sent.
    const capped = Array.from({ length: RUNS_WINDOW }, (_, index) =>
      run({ id: `r-${index}`, createdAt: at(index / 20), cliReportedCostUsd: 1 }),
    );
    const card = buildAgentScorecard({ runs: capped, now: NOW });

    expect(card.runWindowTruncated).toBe(true);
    expect(card.spend.find(s => s.days === 7)?.complete).toBe(false);
    expect(card.spend.find(s => s.days === 30)?.complete).toBe(false);
    // "Everything loaded" describes exactly what we hold, so it is complete by
    // construction however truncated the window is.
    expect(card.spend.find(s => s.days === null)?.complete).toBe(true);
  });

  it("keeps a window complete when the oldest run we hold predates it", () => {
    const capped = Array.from({ length: RUNS_WINDOW }, (_, index) =>
      run({ id: `r-${index}`, createdAt: at(index === 0 ? 400 : index / 20) }),
    );
    const card = buildAgentScorecard({ runs: capped, now: NOW });
    // We hold a run from beyond the 30-day boundary, so nothing inside it is missing.
    expect(card.spend.find(s => s.days === 30)?.complete).toBe(true);
  });
});

describe("token totals", () => {
  it("counts reported tokens and says how many runs reported none", () => {
    const card = buildAgentScorecard({
      runs: [
        run({ id: "a", totalInputTokens: 1000, totalOutputTokens: 200 }),
        run({ id: "b", totalInputTokens: 500, totalOutputTokens: 100 }),
        // Closed before token tracking existed; never backfilled.
        run({ id: "c" }),
      ],
      now: NOW,
    });

    expect(card.tokens).toEqual({ input: 1500, output: 300, reported: 2, missing: 1 });
  });
});

describe("run outcomes", () => {
  it("rates only finished shifts, ignoring running and off-duty ones", () => {
    const card = buildAgentScorecard({
      runs: [
        run({ id: "a", status: BugHuntRunStatus.COMPLETED }),
        run({ id: "b", status: BugHuntRunStatus.COMPLETED }),
        run({ id: "c", status: BugHuntRunStatus.COMPLETED }),
        run({ id: "d", status: BugHuntRunStatus.FAILED }),
        run({ id: "e", status: BugHuntRunStatus.RUNNING }),
        run({ id: "f", status: BugHuntRunStatus.SKIPPED_DISABLED }),
      ],
      now: NOW,
    });

    expect(card.runs.completed).toBe(3);
    expect(card.runs.failed).toBe(1);
    expect(card.runs.running).toBe(1);
    expect(card.runs.skipped).toBe(1);
    expect(card.runs.successRate).toBe(0.75);
  });

  /** 0/0 is not "0% reliable" — it is "nothing has finished", and a rate would libel it. */
  it("reports no success rate at all when nothing has finished", () => {
    const card = buildAgentScorecard({
      runs: [run({ id: "a", status: BugHuntRunStatus.RUNNING })],
      now: NOW,
    });
    expect(card.runs.successRate).toBeNull();
  });
});

describe("pipeline totals", () => {
  it("adds the per-run tallies and derives the auto-merge rate", () => {
    const card = buildAgentScorecard({
      runs: [
        run({ id: "a", foundCount: 6, autoMergedCount: 2, prOpenedCount: 3, dismissedCount: 1 }),
        run({ id: "b", foundCount: 4, autoMergedCount: 1, prOpenedCount: 2, dismissedCount: 1 }),
      ],
      now: NOW,
    });

    expect(card.pipeline).toEqual({
      found: 10,
      autoMerged: 3,
      prOpened: 5,
      dismissed: 2,
      autoMergeRate: 0.3,
    });
  });

  it("reports no rate when nothing has been found", () => {
    expect(buildAgentScorecard({ runs: [run({ id: "a" })], now: NOW }).pipeline.autoMergeRate).toBe(
      null,
    );
  });
});

describe("the fourteen-day series", () => {
  /**
   * Dense on purpose. A day Bug Hunter did nothing is a real zero, and a
   * sparkline that omitted it would draw four busy days as a straight line and
   * lie about the shape.
   */
  it("always spans the full window, including days with no shifts", () => {
    const card = buildAgentScorecard({
      runs: [run({ id: "a", createdAt: at(1), foundCount: 3, cliReportedCostUsd: 2 })],
      now: NOW,
    });

    expect(card.series).toHaveLength(SERIES_DAYS);
    expect(card.series.filter(point => point.runs === 0)).toHaveLength(SERIES_DAYS - 1);
    const busy = card.series.find(point => point.runs > 0);
    expect(busy).toMatchObject({ found: 3, costUsd: 2, runs: 1 });
  });

  it("leaves runs older than the window out of the series without dropping them from spend", () => {
    const card = buildAgentScorecard({
      runs: [run({ id: "old", createdAt: at(200), cliReportedCostUsd: 5, foundCount: 9 })],
      now: NOW,
    });

    expect(card.series.every(point => point.runs === 0)).toBe(true);
    expect(card.spend.find(s => s.days === null)?.costUsd).toBe(5);
    expect(card.pipeline.found).toBe(9);
  });

  it("sums several shifts landing on the same day into one bar", () => {
    const card = buildAgentScorecard({
      runs: [
        run({ id: "a", createdAt: at(1.1), foundCount: 1, cliReportedCostUsd: 1 }),
        run({ id: "b", createdAt: at(1.2), foundCount: 2, cliReportedCostUsd: 3 }),
      ],
      now: NOW,
    });

    const busy = card.series.filter(point => point.runs > 0);
    expect(busy).toHaveLength(1);
    expect(busy[0]).toMatchObject({ found: 3, costUsd: 4, runs: 2 });
  });
});

describe("empty input", () => {
  it("produces a whole scorecard rather than throwing, so the card can render its empty state", () => {
    const card = buildAgentScorecard({ runs: [], now: NOW });

    expect(card.pipeline.found).toBe(0);
    expect(card.runs.successRate).toBeNull();
    expect(card.latestRunAt).toBeNull();
    expect(card.oldestRunAt).toBeNull();
    expect(card.series).toHaveLength(SERIES_DAYS);
    expect(card.spend.every(window => window.costUsd === 0 && window.complete)).toBe(true);
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
