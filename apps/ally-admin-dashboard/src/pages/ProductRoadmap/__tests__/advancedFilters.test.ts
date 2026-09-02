import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
  toIsoDate,
} from "../utils/filters";

const withValues = (patch: Partial<RoadmapAdvancedFilterValues>): RoadmapAdvancedFilterValues => ({
  ...EMPTY_ADVANCED_FILTERS,
  ...patch,
});

/**
 * The count drives the badge on the collapsed panel, which is the only thing standing between a
 * hidden filter and someone concluding the board is broken because rows are missing. It has to be
 * right for the cases where a value is present but falsy-looking.
 */
describe("countActiveAdvancedFilters", () => {
  it("is zero for the empty state", () => {
    expect(countActiveAdvancedFilters(EMPTY_ADVANCED_FILTERS)).toBe(0);
  });

  it("counts a creator selection", () => {
    expect(countActiveAdvancedFilters(withValues({ createdBy: [7] }))).toBe(1);
  });

  it("counts a half-open date range", () => {
    // A single bound still narrows the list, so it must count.
    expect(countActiveAdvancedFilters(withValues({ dateFrom: "2026-01-01" }))).toBe(1);
    expect(countActiveAdvancedFilters(withValues({ dateTo: "2026-01-01" }))).toBe(1);
  });

  it("counts a full date range once, not twice", () => {
    expect(
      countActiveAdvancedFilters(withValues({ dateFrom: "2026-01-01", dateTo: "2026-02-01" })),
    ).toBe(1);
  });

  it("treats filed and released ranges as separate filters", () => {
    expect(
      countActiveAdvancedFilters(
        withValues({ dateFrom: "2026-01-01", releasedFrom: "2026-01-01" }),
      ),
    ).toBe(2);
  });

  it('counts a priority bound of "0", which is a real filter and not an empty one', () => {
    // The trap: priorityMin="0" is falsy-looking as a number but means "score >= 0". Using a
    // truthiness check here would leave the badge at 0 while the panel narrows nothing visibly —
    // and worse, would let "Clear filters" appear to have nothing to clear.
    expect(countActiveAdvancedFilters(withValues({ priorityMin: "0" }))).toBe(1);
    expect(countActiveAdvancedFilters(withValues({ priorityMax: "0" }))).toBe(1);
  });

  it("counts every group when all four are active", () => {
    expect(
      countActiveAdvancedFilters(
        withValues({
          createdBy: [1, 2],
          dateFrom: "2026-01-01",
          releasedTo: "2026-03-01",
          priorityMax: "50",
        }),
      ),
    ).toBe(4);
  });
});

/**
 * The date the calendar shows and the date that gets stored have to be the same day. They were
 * not: `toISOString()` converts to UTC first, and in IST (UTC+5:30) the local midnight Carbon
 * hands back is still the previous day there — picking Sep 1 to Sep 2 stored Aug 31 to Sep 1, and
 * because the stored value is fed straight back in as the controlled `value`, the range the user
 * clicked was simply not settable.
 */
describe("toIsoDate", () => {
  const originalTz = process.env.TZ;

  // Pinned to IST rather than left on the runner's TZ: under TZ=UTC the old
  // `toISOString().slice(0, 10)` is indistinguishable from the fix, so a test that did not force
  // an offset would go green against the bug it exists to catch.
  beforeAll(() => {
    process.env.TZ = "Asia/Kolkata";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("keeps the local calendar day the user clicked", () => {
    // Local midnight in IST is 18:30 the PREVIOUS day in UTC — the exact case that stored
    // Aug 31–Sep 1 for a Sep 1–Sep 2 pick.
    expect(new Date(2026, 8, 1).toISOString().slice(0, 10)).toBe("2026-08-31"); // the old result
    expect(toIsoDate(new Date(2026, 8, 1))).toBe("2026-09-01");
    expect(toIsoDate(new Date(2026, 8, 2))).toBe("2026-09-02");
  });

  it("keeps the local calendar day across a month and year boundary", () => {
    expect(toIsoDate(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toIsoDate(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 2, 7))).toBe("2026-03-07");
  });

  it('reads a cleared or invalid bound as "" rather than a bogus date', () => {
    expect(toIsoDate(undefined)).toBe("");
    expect(toIsoDate(new Date(Number.NaN))).toBe("");
  });
});
