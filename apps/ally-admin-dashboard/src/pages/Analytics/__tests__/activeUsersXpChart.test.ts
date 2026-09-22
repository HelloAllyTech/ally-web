import { describe, expect, it } from "vitest";

import {
  ACTIVE_USER_XP_THRESHOLD,
  ActiveUsersXpPoint,
  activeUsersXpEmptyText,
  activeUsersXpTakeaway,
  buildActiveUsersXpSeries,
  buildActiveUsersXpTable,
} from "../activeUsersXpChart";

const point = (
  overrides: Partial<ActiveUsersXpPoint> & { bucket: string },
): ActiveUsersXpPoint => ({
  activeUsers: 0,
  ...overrides,
});

describe("buildActiveUsersXpSeries", () => {
  it("plots one datum per bucket", () => {
    const points = [
      point({ bucket: "2026-06-01", activeUsers: 12 }),
      point({ bucket: "2026-07-01", activeUsers: 5 }),
    ];

    expect(buildActiveUsersXpSeries(points)).toEqual([
      { group: "Active learners", key: "2026-06-01", value: 12 },
      { group: "Active learners", key: "2026-07-01", value: 5 },
    ]);
  });

  it("keeps a real zero bucket on the axis rather than dropping it", () => {
    const points = [point({ bucket: "2026-06-01", activeUsers: 0 })];
    expect(buildActiveUsersXpSeries(points)).toEqual([
      { group: "Active learners", key: "2026-06-01", value: 0 },
    ]);
  });
});

describe("activeUsersXpEmptyText", () => {
  it("is undefined once any bucket cleared the bar", () => {
    expect(
      activeUsersXpEmptyText([point({ bucket: "2026-06-01", activeUsers: 1 })]),
    ).toBeUndefined();
  });

  it(`flags an empty window naming the ${ACTIVE_USER_XP_THRESHOLD}-XP bar when every bucket is zero`, () => {
    const text = activeUsersXpEmptyText([
      point({ bucket: "2026-06-01" }),
      point({ bucket: "2026-07-01" }),
    ]);
    expect(text).toBeDefined();
    expect(text).toContain(String(ACTIVE_USER_XP_THRESHOLD));
  });

  it("flags empty for no points at all", () => {
    expect(activeUsersXpEmptyText([])).toBeDefined();
  });
});

describe("activeUsersXpTakeaway", () => {
  it("reads off the latest COMPLETE bucket, excluding the in-progress one", () => {
    const points = [
      point({ bucket: "2026-06-01", activeUsers: 40 }),
      point({ bucket: "2026-07-01", activeUsers: 3 }),
    ];

    const takeaway = activeUsersXpTakeaway(points, "2026-07-01", "month");

    expect(takeaway).toContain("40");
    expect(takeaway).not.toContain("2026-07-01");
  });

  it("returns undefined when there is no complete bucket", () => {
    expect(activeUsersXpTakeaway([], null, "month")).toBeUndefined();
  });
});

describe("buildActiveUsersXpTable", () => {
  it("flags the in-progress bucket in its row label", () => {
    const points = [
      point({ bucket: "2026-06-01", activeUsers: 40 }),
      point({ bucket: "2026-07-01", activeUsers: 3 }),
    ];

    const table = buildActiveUsersXpTable(points, "2026-07-01");

    expect(table.columns).toEqual(["Period", "Active learners"]);
    expect(table.rows).toEqual([
      ["2026-06-01", 40],
      ["2026-07-01 (in progress)", 3],
    ]);
  });
});
