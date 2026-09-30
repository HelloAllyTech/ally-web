import { describe, expect, it } from "vitest";

import {
  CODE_ACTIVITY_COLOURS,
  activityLevel,
  addDays,
  isMonday,
  levelRangeLabel,
  mergeDays,
  monthLabel,
  sumChurn,
} from "../codeActivity";

const day = (date: string, churn: number) => ({
  date,
  added: churn,
  deleted: 0,
  churn,
  partial: false,
});

describe("activityLevel", () => {
  it("keeps zero on its own level and bins the rest on fixed floors", () => {
    expect(activityLevel(0)).toBe(0);
    expect(activityLevel(1)).toBe(1);
    expect(activityLevel(2_999)).toBe(1);
    expect(activityLevel(3_000)).toBe(2);
    expect(activityLevel(9_999)).toBe(2);
    expect(activityLevel(10_000)).toBe(3);
    expect(activityLevel(25_000)).toBe(4);
    expect(activityLevel(500_000)).toBe(4);
  });

  it("has a colour for every level", () => {
    expect(CODE_ACTIVITY_COLOURS).toHaveLength(activityLevel(Number.MAX_SAFE_INTEGER) + 1);
  });
});

describe("levelRangeLabel", () => {
  it("names each legend swatch's range", () => {
    expect([0, 1, 2, 3, 4].map(levelRangeLabel)).toEqual([
      "No changes",
      "1–3k lines",
      "3k–10k lines",
      "10k–25k lines",
      "25k+ lines",
    ]);
  });
});

describe("addDays", () => {
  it("crosses month and year ends in UTC", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("monthLabel", () => {
  it("adds the year only on January or when asked", () => {
    expect(monthLabel("2026-09-01")).not.toMatch(/2026/);
    expect(monthLabel("2026-09-01", true)).toMatch(/2026/);
    expect(monthLabel("2027-01-01")).toMatch(/2027/);
  });
});

describe("isMonday", () => {
  it("reads the weekday in UTC", () => {
    expect(isMonday("2026-09-28")).toBe(true);
    expect(isMonday("2026-09-27")).toBe(false);
  });
});

describe("mergeDays", () => {
  it("prepends an older page, oldest first, without doubling an overlapping day", () => {
    const shown = [day("2026-09-02", 5), day("2026-09-03", 7)];
    const older = [day("2026-09-01", 1), day("2026-09-02", 6)];

    const merged = mergeDays(shown, older);

    expect(merged.map(d => d.date)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(merged[1].churn).toBe(6);
    expect(sumChurn(merged)).toBe(14);
  });
});
