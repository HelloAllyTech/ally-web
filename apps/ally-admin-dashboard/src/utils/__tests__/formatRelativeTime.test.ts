import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "../common";

/**
 * The two behaviours worth pinning: the switch back to an absolute date once "N days ago" stops
 * being easier to read than the date itself, and the clock-skew guard — a browser a few seconds
 * behind the server must not render "in 4s", which reads as a bug in the log rather than the clocks.
 */
describe("formatRelativeTime", () => {
  const now = new Date("2026-08-12T12:00:00Z");
  const ago = (seconds: number) =>
    formatRelativeTime(new Date(now.getTime() - seconds * 1000).toISOString(), now);

  it.each([
    [0, "just now"],
    [30, "just now"],
    [59, "just now"],
  ])("renders %ss ago as %s", (seconds, expected) => {
    expect(ago(seconds)).toBe(expected);
  });

  it("counts minutes, then hours, then days", () => {
    expect(ago(60)).toBe("1m ago");
    expect(ago(60 * 59)).toBe("59m ago");
    expect(ago(60 * 60)).toBe("1h ago");
    expect(ago(60 * 60 * 23)).toBe("23h ago");
    expect(ago(60 * 60 * 24)).toBe("1d ago");
    expect(ago(60 * 60 * 24 * 6)).toBe("6d ago");
  });

  it("falls back to an absolute date past a week", () => {
    // "63d ago" is harder to place than a date, so the relative form stops earning its place.
    expect(ago(60 * 60 * 24 * 7)).toMatch(/\d/);
    expect(ago(60 * 60 * 24 * 7)).not.toContain("ago");
  });

  it("does not render a future time for small clock skew", () => {
    const skewed = new Date(now.getTime() + 4000).toISOString();
    expect(formatRelativeTime(skewed, now)).toBe("just now");
  });

  it("returns empty for an unparseable value rather than 'Invalid Date'", () => {
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});
