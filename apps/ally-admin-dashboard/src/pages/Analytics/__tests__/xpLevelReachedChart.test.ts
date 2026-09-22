import { describe, expect, it } from "vitest";

import {
  XP_LEVEL_REACHED_MAX_LEVEL,
  XpLevelReachedPoint,
  buildXpLevelReachedSeries,
  buildXpLevelReachedTable,
  xpLevelReachedEmptyText,
  xpLevelReachedScale,
  xpLevelReachedTakeaway,
} from "../xpLevelReachedChart";

const levelCounts = (usersByLevel: number[]) =>
  usersByLevel.map((users, i) => ({ level: i + 1, users }));

const point = (bucket: string, usersByLevel: number[]): XpLevelReachedPoint => ({
  bucket,
  levelCounts: levelCounts(usersByLevel),
});

describe("buildXpLevelReachedSeries", () => {
  it("emits one datum per level per bucket, zeros included", () => {
    const points = [point("2026-06-01", [5, 2, 0])];

    expect(buildXpLevelReachedSeries(points)).toEqual([
      { group: "L1", key: "2026-06-01", value: 5 },
      { group: "L2", key: "2026-06-01", value: 2 },
      { group: "L3", key: "2026-06-01", value: 0 },
    ]);
  });
});

describe("xpLevelReachedScale", () => {
  it("gives every level its own colour, ordered low to high saturation", () => {
    const scale = xpLevelReachedScale([1, 2, 3]);
    expect(Object.keys(scale)).toEqual(["L1", "L2", "L3"]);
    expect(new Set(Object.values(scale)).size).toBe(3);
  });
});

describe("xpLevelReachedEmptyText", () => {
  it("is undefined once anything crossed any level", () => {
    expect(xpLevelReachedEmptyText([point("2026-06-01", [1, 0, 0])])).toBeUndefined();
  });

  it("flags empty only when EVERY level in EVERY bucket is zero", () => {
    const text = xpLevelReachedEmptyText([
      point("2026-06-01", [0, 0, 0]),
      point("2026-07-01", [0, 0, 0]),
    ]);
    expect(text).toBeDefined();
  });

  it("does not read an all-zero L8-L10 tail as empty when L1 has crossings — that's expected, not broken", () => {
    const usersByLevel = Array.from({ length: XP_LEVEL_REACHED_MAX_LEVEL }, (_, i) =>
      i === 0 ? 12 : 0,
    );
    expect(xpLevelReachedEmptyText([point("2026-06-01", usersByLevel)])).toBeUndefined();
  });
});

describe("xpLevelReachedTakeaway", () => {
  it("names L1's share of the latest complete bucket's crossings", () => {
    const points = [point("2026-06-01", [8, 2, 0])];

    const takeaway = xpLevelReachedTakeaway(points, null, "month");

    expect(takeaway).toContain("10");
    expect(takeaway).toContain("80%");
  });

  it("excludes the in-progress bucket", () => {
    const points = [point("2026-06-01", [8, 2, 0]), point("2026-07-01", [1, 0, 0])];

    const takeaway = xpLevelReachedTakeaway(points, "2026-07-01", "month");

    expect(takeaway).toContain("10");
    expect(takeaway).not.toContain("1 new");
  });

  it("returns undefined when there is no complete bucket", () => {
    expect(xpLevelReachedTakeaway([], null, "month")).toBeUndefined();
  });
});

describe("buildXpLevelReachedTable", () => {
  it("flags the in-progress bucket", () => {
    const points = [point("2026-06-01", [8, 2])];

    const table = buildXpLevelReachedTable(points, "2026-06-01");

    expect(table.columns).toEqual(["Period", "L1", "L2"]);
    expect(table.rows).toEqual([["2026-06-01 (in progress)", 8, 2]]);
  });
});
