import { describe, expect, it } from "vitest";

import type { PublicProductUpdate } from "@api";

import { dayKeyUtc, daySummary, formatDay, groupByDay } from "../productUpdateDays";

const update = (
  id: string,
  liveAt: string,
  kind: PublicProductUpdate["kind"],
): PublicProductUpdate => ({
  id,
  slug: id,
  title: `Title ${id}`,
  summary: `Summary ${id}`,
  kind,
  surfaces: ["web_app"],
  area: "Roleplays",
  liveAt,
});

describe("dayKeyUtc", () => {
  it("buckets by the UTC calendar day", () => {
    expect(dayKeyUtc("2026-09-30T10:10:00Z")).toBe("2026-09-30");
    expect(dayKeyUtc("2026-09-30T00:00:00Z")).toBe("2026-09-30");
    // 23:59 UTC is still the same day, whatever the reader's local time.
    expect(dayKeyUtc("2026-09-29T23:59:59Z")).toBe("2026-09-29");
    // An offset timestamp lands on its UTC day.
    expect(dayKeyUtc("2026-10-01T02:00:00+05:30")).toBe("2026-09-30");
  });
});

describe("groupByDay", () => {
  it("groups newest day first, new before improved, and fixes apart", () => {
    const groups = groupByDay([
      update("a", "2026-09-30T17:00:00Z", "improved"),
      update("b", "2026-09-30T10:00:00Z", "fixed"),
      update("c", "2026-09-30T07:00:00Z", "new"),
      update("d", "2026-09-29T10:00:00Z", "new"),
      update("e", "2026-09-24T10:00:00Z", "fixed"),
    ]);

    expect(groups.map(group => group.key)).toEqual(["2026-09-30", "2026-09-29", "2026-09-24"]);
    expect(groups[0].highlights.map(u => u.id)).toEqual(["c", "a"]);
    expect(groups[0].fixes.map(u => u.id)).toEqual(["b"]);
    expect(groups[1].highlights.map(u => u.id)).toEqual(["d"]);
    expect(groups[2].highlights).toEqual([]);
    expect(groups[2].fixes.map(u => u.id)).toEqual(["e"]);
  });

  it("puts a day back together when a later page continues it", () => {
    const groups = groupByDay([
      update("a", "2026-09-30T17:00:00Z", "new"),
      update("b", "2026-09-29T10:00:00Z", "new"),
      update("c", "2026-09-30T09:00:00Z", "improved"),
    ]);

    expect(groups.map(group => group.key)).toEqual(["2026-09-30", "2026-09-29"]);
    expect(groups[0].highlights.map(u => u.id)).toEqual(["a", "c"]);
  });
});

describe("formatDay", () => {
  it("names the day, not a week", () => {
    const label = formatDay("2026-09-30");
    expect(label).toMatch(/30.*2026/);
    expect(label).not.toMatch(/week/i);
  });
});

describe("daySummary", () => {
  it("counts each kind, leaving out the ones a day has none of", () => {
    const [day] = groupByDay([
      update("a", "2026-09-30T10:00:00Z", "new"),
      update("b", "2026-09-30T09:00:00Z", "new"),
      update("c", "2026-09-30T08:00:00Z", "fixed"),
      update("d", "2026-09-30T07:00:00Z", "fixed"),
      update("e", "2026-09-30T06:00:00Z", "fixed"),
    ]);
    expect(daySummary(day)).toBe("2 new · 3 fixes");
  });

  it("says fix, not fixes, for one", () => {
    const [day] = groupByDay([update("a", "2026-09-30T10:00:00Z", "fixed")]);
    expect(daySummary(day)).toBe("1 fix");
  });

  it("lists new, then improved, then fixes", () => {
    const [day] = groupByDay([
      update("a", "2026-09-30T10:00:00Z", "fixed"),
      update("b", "2026-09-30T09:00:00Z", "improved"),
      update("c", "2026-09-30T08:00:00Z", "new"),
    ]);
    expect(daySummary(day)).toBe("1 new · 1 improved · 1 fix");
  });
});
