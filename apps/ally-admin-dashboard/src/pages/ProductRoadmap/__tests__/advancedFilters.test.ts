import { describe, expect, it } from "vitest";

import {
  EMPTY_ADVANCED_FILTERS,
  RoadmapAdvancedFilterValues,
  countActiveAdvancedFilters,
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
