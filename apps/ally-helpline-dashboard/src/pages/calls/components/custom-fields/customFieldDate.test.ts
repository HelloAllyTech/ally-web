import { describe, expect, it } from "vitest";

import {
  formatCustomFieldDate,
  normalizeCustomFieldDate,
  parseCustomFieldDate,
  spokenDateToCustomFieldDate,
  toCustomFieldDate,
} from "./customFieldDate";

describe("toCustomFieldDate", () => {
  it("encodes a picked date from its local fields", () => {
    // `toISOString()` here is what stored 22 Aug as "2026-08-21T18:30:00.000Z"
    // in IST — the local fields are the day the user actually clicked.
    expect(toCustomFieldDate(new Date(2026, 7, 22))).toBe("2026-08-22");
  });
});

describe("normalizeCustomFieldDate", () => {
  it("passes a bare calendar date through untouched", () => {
    expect(normalizeCustomFieldDate("2026-08-22")).toBe("2026-08-22");
  });

  it("resolves a legacy IST-midnight instant to the day that was picked", () => {
    expect(normalizeCustomFieldDate("2026-08-21T18:30:00.000Z")).toBe("2026-08-22");
  });

  it("returns null for absent or unparseable input", () => {
    expect(normalizeCustomFieldDate(null)).toBeNull();
    expect(normalizeCustomFieldDate("  ")).toBeNull();
    expect(normalizeCustomFieldDate("not-a-date")).toBeNull();
  });
});

describe("parseCustomFieldDate", () => {
  it("builds the date from its parts, not a UTC-midnight parse", () => {
    const parsed = parseCustomFieldDate("2026-08-22");
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(22);
  });

  it("round-trips through the picker without drifting a day", () => {
    const stored = "2026-08-22";
    expect(toCustomFieldDate(parseCustomFieldDate(stored) as Date)).toBe(stored);
  });
});

describe("formatCustomFieldDate", () => {
  it("formats both storage shapes as the same day", () => {
    expect(formatCustomFieldDate("2026-08-22")).toBe("08/22/2026");
    expect(formatCustomFieldDate("2026-08-21T18:30:00.000Z")).toBe("08/22/2026");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatCustomFieldDate(null)).toBeNull();
  });
});

describe("spokenDateToCustomFieldDate", () => {
  it("keeps a date the LLM already returned in storage shape", () => {
    // Must short-circuit rather than round-trip through `new Date`, which
    // parses a date-only string as UTC midnight — the previous day in any
    // timezone behind UTC. These assertions run in both IST and US Eastern.
    expect(spokenDateToCustomFieldDate("2026-08-22")).toBe("2026-08-22");
  });

  it("reads a prose date off its local fields", () => {
    expect(spokenDateToCustomFieldDate("22 August 2026")).toBe("2026-08-22");
  });

  it("returns null for empty or unparseable input", () => {
    expect(spokenDateToCustomFieldDate("  ")).toBeNull();
    expect(spokenDateToCustomFieldDate("sometime next week")).toBeNull();
  });
});
