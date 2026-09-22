import { describe, expect, it } from "vitest";

import {
  BugHunterVolumePoint,
  buildBugHunterVolumeSeries,
  buildBugHunterVolumeTable,
  bugHunterVolumeEmptyText,
  bugHunterVolumeTakeaway,
} from "../bugHunterVolumeChart";

const point = (
  overrides: Partial<BugHunterVolumePoint> & { bucket: string },
): BugHunterVolumePoint => ({
  found: 0,
  fixed: 0,
  ...overrides,
});

describe("buildBugHunterVolumeSeries", () => {
  it("emits Found and Fixed as two independent, non-stacked series", () => {
    const points = [point({ bucket: "2026-06-01", found: 10, fixed: 6 })];

    expect(buildBugHunterVolumeSeries(points)).toEqual([
      { group: "Found", key: "2026-06-01", value: 10 },
      { group: "Fixed", key: "2026-06-01", value: 6 },
    ]);
  });
});

describe("bugHunterVolumeEmptyText", () => {
  it("is undefined once either found or fixed has anything", () => {
    expect(bugHunterVolumeEmptyText([point({ bucket: "2026-06-01", found: 1 })])).toBeUndefined();
    expect(bugHunterVolumeEmptyText([point({ bucket: "2026-06-01", fixed: 1 })])).toBeUndefined();
  });

  it("flags empty when both are zero across every bucket", () => {
    expect(
      bugHunterVolumeEmptyText([point({ bucket: "2026-06-01" }), point({ bucket: "2026-07-01" })]),
    ).toBeDefined();
  });

  it("flags empty for no points at all", () => {
    expect(bugHunterVolumeEmptyText([])).toBeDefined();
  });
});

describe("bugHunterVolumeTakeaway", () => {
  it("says fixing is keeping pace within a 90-110% band", () => {
    const points = [point({ bucket: "2026-06-01", found: 100, fixed: 95 })];
    expect(bugHunterVolumeTakeaway(points, null)).toContain("keeping pace");
  });

  it("says fixing is trailing when well below found", () => {
    const points = [point({ bucket: "2026-06-01", found: 100, fixed: 40 })];
    const takeaway = bugHunterVolumeTakeaway(points, null);
    expect(takeaway).toContain("trailing");
    expect(takeaway).toContain("60%");
  });

  it("says fixing is ahead when well above found", () => {
    const points = [point({ bucket: "2026-06-01", found: 100, fixed: 150 })];
    const takeaway = bugHunterVolumeTakeaway(points, null);
    expect(takeaway).toContain("ahead");
  });

  it("excludes the in-progress bucket from the totals", () => {
    const points = [
      point({ bucket: "2026-06-01", found: 100, fixed: 95 }),
      point({ bucket: "2026-07-01", found: 1000, fixed: 0 }),
    ];
    const takeaway = bugHunterVolumeTakeaway(points, "2026-07-01");
    expect(takeaway).toContain("100 found");
  });

  it("returns undefined when there is nothing recorded at all", () => {
    expect(bugHunterVolumeTakeaway([point({ bucket: "2026-06-01" })], null)).toBeUndefined();
  });
});

describe("buildBugHunterVolumeTable", () => {
  it("flags the in-progress bucket", () => {
    const points = [point({ bucket: "2026-06-01", found: 3, fixed: 2 })];
    const table = buildBugHunterVolumeTable(points, "2026-06-01");

    expect(table.columns).toEqual(["Period", "Found", "Fixed"]);
    expect(table.rows).toEqual([["2026-06-01 (in progress)", 3, 2]]);
  });
});
