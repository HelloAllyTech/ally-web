import { describe, expect, it } from "vitest";

import { XpPerMinutePoint, XpSourceGroupDef, XpSourceGroups } from "@types";

import { CONTEXT } from "../chartScales";
import {
  allTimeDescription,
  buildXpPerMinuteStack,
  formatShare,
  formatXpPerMinute,
  nonRoleplayPerMinute,
  sourceScale,
  tableColumns,
  tableRow,
  visibleSources,
} from "../xpPerMinuteChart";

const SOURCES: XpSourceGroupDef[] = [
  { key: "roleplay", label: "Roleplay", description: "" },
  { key: "tracks", label: "Track items", description: "" },
  { key: "community", label: "Debriefs & peer comments", description: "" },
  { key: "consistency", label: "Weekly consistency", description: "" },
  { key: "other", label: "Retired rules", description: "" },
];

const groups = (over: Partial<XpSourceGroups> = {}): XpSourceGroups => ({
  roleplay: 0,
  tracks: 0,
  community: 0,
  consistency: 0,
  other: 0,
  ...over,
});

const point = (over: Partial<XpPerMinutePoint> = {}): XpPerMinutePoint => ({
  bucket: "2026-08-01",
  xp: 200,
  minutes: 100,
  xpPerMinute: 2,
  roleplaySharePct: 50,
  xpBySource: groups({ roleplay: 100, tracks: 60, consistency: 40 }),
  perMinuteBySource: groups({ roleplay: 1, tracks: 0.6, consistency: 0.4 }),
  ...over,
});

describe("xpPerMinuteChart", () => {
  it("stacks each source's XP per minute under the period key", () => {
    const stack = buildXpPerMinuteStack([point()], SOURCES.slice(0, 2));
    expect(stack).toEqual([
      { group: "Roleplay", key: "2026-08-01", value: 1 },
      { group: "Track items", key: "2026-08-01", value: 0.6 },
    ]);
  });

  it("keeps a period with no roleplay minutes on the axis as a single null", () => {
    const nulls = groups({
      roleplay: null,
      tracks: null,
      community: null,
      consistency: null,
      other: null,
    });
    const stack = buildXpPerMinuteStack(
      [point({ minutes: 0, xpPerMinute: null, perMinuteBySource: nulls })],
      SOURCES,
    );
    expect(stack).toEqual([{ group: "Roleplay", key: "2026-08-01", value: null }]);
  });

  it("hides sources that paid nothing on screen but always keeps roleplay", () => {
    const shown = visibleSources([point({ xpBySource: groups({ tracks: 5 }) })], SOURCES);
    expect(shown.map(s => s.key)).toEqual(["roleplay", "tracks"]);
  });

  it("colours by fixed position, with retired rules in grey", () => {
    const scale = sourceScale(SOURCES);
    expect(scale["Retired rules"]).toBe(CONTEXT.faint);
    expect(new Set(Object.values(scale)).size).toBe(SOURCES.length);
  });

  it("formats ratios and shares, with a dash for no data", () => {
    expect(formatXpPerMinute(1.2345)).toBe("1.23");
    expect(formatXpPerMinute(null)).toBe("—");
    expect(formatShare(62.4)).toBe("62%");
    expect(formatShare(null)).toBe("—");
  });

  it("derives the non-roleplay part of the headline", () => {
    expect(nonRoleplayPerMinute(point())).toBe(1);
    expect(nonRoleplayPerMinute(point({ xpPerMinute: null }))).toBeNull();
  });

  it("describes the all-time split, or says there are no minutes yet", () => {
    expect(allTimeDescription(point())).toBe(
      "200 XP across 100 roleplay minutes. Roleplay itself pays 1.00 XP/min; " +
        "other learning adds 1.00 (50% of all XP).",
    );
    expect(allTimeDescription(point({ xpPerMinute: null }))).toMatch(/No roleplay minutes/);
    expect(allTimeDescription(undefined)).toMatch(/No roleplay minutes/);
  });

  it("builds table rows that line up with the columns", () => {
    const cols = tableColumns("Month", SOURCES);
    const row = tableRow(point(), SOURCES, true);
    expect(row).toHaveLength(cols.length);
    expect(row.slice(0, 5)).toEqual(["2026-08-01 (in progress)", 100, 200, "2.00", "50%"]);
  });
});
