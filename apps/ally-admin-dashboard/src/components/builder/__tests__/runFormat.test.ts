import { describe, expect, it } from "vitest";

import { formatCostUsd, formatRunDuration, runDidNothing, totalCostUsd } from "../runFormat";

/**
 * A run's duration and spend are read to answer "was that reasonable?", so the
 * cases that matter are the ones where a naive formatter would state something
 * false: a run still in flight, or a run whose timestamps are nonsense.
 */

describe("formatRunDuration", () => {
  const start = "2026-08-27T10:00:00.000Z";
  const plus = (ms: number) => new Date(Date.parse(start) + ms).toISOString();

  it("reads in seconds under a minute", () => {
    expect(formatRunDuration(start, plus(42_000))).toBe("42s");
  });

  it("reads in minutes and seconds under an hour", () => {
    expect(formatRunDuration(start, plus(192_000))).toBe("3m 12s");
  });

  it("drops seconds once it is hours long", () => {
    // Nobody reading "1h 4m 12s" cares about the 12.
    expect(formatRunDuration(start, plus(3_852_000))).toBe("1h 4m");
  });

  it("says nothing for a run still in flight", () => {
    // Null rather than "0s": a running build and an instant one must not read
    // the same, and the caller decides what to show instead.
    expect(formatRunDuration(start, null)).toBeNull();
  });

  it("says nothing when the timestamps are impossible", () => {
    expect(formatRunDuration(start, "2026-08-27T09:00:00.000Z")).toBeNull();
    expect(formatRunDuration("not a date", plus(1_000))).toBeNull();
  });
});

describe("formatCostUsd", () => {
  it("formats a number and a numeric string alike", () => {
    // The API sends numeric columns as strings; both reach this.
    expect(formatCostUsd(12.5)).toBe("$12.50");
    expect(formatCostUsd("12.5000")).toBe("$12.50");
  });

  it("says nothing for a spend of zero", () => {
    // "$0.00" on a run that has not billed yet reads as a fact rather than an
    // absence, which is how a missing cost report gets mistaken for a free run.
    expect(formatCostUsd(0)).toBeNull();
    expect(formatCostUsd("0")).toBeNull();
  });

  it("says nothing for a missing or unparsable spend", () => {
    expect(formatCostUsd(null)).toBeNull();
    expect(formatCostUsd(undefined)).toBeNull();
    expect(formatCostUsd("not money")).toBeNull();
  });
});

/**
 * Fixtures are one real session's seven runs, from 2026-09-24. They are the
 * reason this exists: six failures in a row rendered identically, and the one
 * that cost $10.18 was indistinguishable from the two that died in a minute on
 * a config error.
 */
const run = (over: Partial<Parameters<typeof runDidNothing>[0]> = {}) => ({
  status: "FAILED",
  costUsd: null,
  dispatchedAt: "2026-09-24T19:34:34Z",
  completedAt: "2026-09-24T19:35:37Z",
  ...over,
});

describe("runDidNothing", () => {
  it("quiets a run that died in seconds having spent nothing", () => {
    // Run 3: 1m03s, no spend — a key-name error fixed in the next minute.
    expect(runDidNothing(run())).toBe(true);
  });

  it("keeps a run that spent real money, however it ended", () => {
    // Run 1: 34m, $10.18. The most important card in the strip.
    expect(runDidNothing(run({ costUsd: "10.18", completedAt: "2026-09-24T20:08:39Z" }))).toBe(
      false,
    );
  });

  it("keeps a long run even when its spend is unrecorded", () => {
    // Gemini reports no cost of its own, so an absent figure must never be
    // read as "did nothing" — that is the whole Gemini fleet.
    expect(runDidNothing(run({ completedAt: "2026-09-24T19:50:00Z" }))).toBe(false);
  });

  it("never quiets a live run", () => {
    // It has spent nothing yet and is the most interesting thing on the page.
    expect(runDidNothing(run({ completedAt: null }))).toBe(false);
  });

  it("never quiets a run that succeeded", () => {
    expect(runDidNothing(run({ status: "SUCCEEDED" }))).toBe(false);
  });

  it("keeps a run that spent even a cent", () => {
    expect(runDidNothing(run({ costUsd: "0.01" }))).toBe(false);
  });
});

describe("totalCostUsd", () => {
  it("adds up what a session actually cost", () => {
    // The seven runs as they were: the number nobody could see without adding
    // them up by hand.
    expect(
      totalCostUsd([
        { costUsd: "10.18" },
        { costUsd: null },
        { costUsd: null },
        { costUsd: "0.33" },
        { costUsd: "0.65" },
        { costUsd: "0.47" },
      ]),
    ).toBeCloseTo(11.63, 2);
  });

  it("treats unrecorded and unparsable spend as zero, not NaN", () => {
    expect(totalCostUsd([{ costUsd: null }, { costUsd: "not money" }])).toBe(0);
  });
});
