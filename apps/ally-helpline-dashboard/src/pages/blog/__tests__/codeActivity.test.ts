import { describe, expect, it } from "vitest";

import {
  CODE_ACTIVITY_LEVEL_CLASSES,
  activityLevel,
  addDays,
  axisLabel,
  isMonday,
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
    expect(CODE_ACTIVITY_LEVEL_CLASSES).toHaveLength(activityLevel(Number.MAX_SAFE_INTEGER) + 1);
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
  it("always carries the year, since the strip scrolls across years", () => {
    expect(monthLabel("2026-09-01")).toMatch(/2026/);
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

describe("axisLabel", () => {
  // 2026-09-28 is a Monday; 2026-10-05 is the next.
  const run = (from: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10),
    }));

  it("names the month on the 1st and dates each Monday", () => {
    const days = run("2026-09-20", 20);
    const labels = days.map((_, i) => axisLabel(days, i));
    const at = (date: string) => labels[days.findIndex(day => day.date === date)];

    expect(at("2026-09-20")?.kind).toBe("month");
    expect(at("2026-09-21")).toBeNull();
    expect(at("2026-09-28")).toEqual({ kind: "day", text: "28" });
    expect(at("2026-10-01")?.kind).toBe("month");
    expect(at("2026-10-05")).toEqual({ kind: "day", text: "5" });
    expect(at("2026-10-06")).toBeNull();
  });

  it("drops a Monday's date that would sit under a month name", () => {
    // 1 June 2026 is a Monday: its cell names the month instead of the date.
    // The strip starts on 3 August, a Monday, named as the leftmost cell.
    const june = run("2026-05-30", 12);
    const juneLabels = june.map((_, i) => axisLabel(june, i));
    expect(juneLabels[0]).toBeNull();
    expect(juneLabels[2]).toEqual({ kind: "month", text: expect.any(String) });
    expect(juneLabels.filter(label => label?.kind === "day").map(label => label?.text)).toEqual([
      "8",
    ]);

    // 2 August is the leftmost cell and named; Monday 3 August sits under it.
    const days = run("2026-08-02", 9);
    const labels = days.map((_, i) => axisLabel(days, i));
    expect(labels[0]?.kind).toBe("month");
    expect(labels.filter(label => label?.kind === "day").map(label => label?.text)).toEqual(["10"]);
  });

  it("leaves the leftmost cell unnamed late in a month", () => {
    const days = run("2026-09-26", 3);
    expect(axisLabel(days, 0)).toBeNull();
  });
});
