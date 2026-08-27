import { describe, expect, it } from "vitest";

import { formatCostUsd, formatRunDuration } from "../runFormat";

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
