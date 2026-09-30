import { describe, expect, it } from "vitest";

import type { PublicProductUpdate } from "@api";

import { formatWeek, groupByWeek, weekStartUtc } from "../productUpdateWeeks";

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

describe("weekStartUtc", () => {
  it("anchors on Sunday 00:00 UTC", () => {
    // Wednesday 30 Sep 2026 → Sunday 27 Sep.
    expect(weekStartUtc("2026-09-30T10:10:00Z").toISOString()).toBe("2026-09-27T00:00:00.000Z");
    // A Sunday is its own week start.
    expect(weekStartUtc("2026-09-27T00:00:00Z").toISOString()).toBe("2026-09-27T00:00:00.000Z");
    // Saturday 23:59 UTC still belongs to the week before.
    expect(weekStartUtc("2026-09-26T23:59:59Z").toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });
});

describe("groupByWeek", () => {
  it("groups newest week first, new before improved, and fixes apart", () => {
    const groups = groupByWeek([
      update("a", "2026-09-30T10:00:00Z", "improved"),
      update("b", "2026-09-29T10:00:00Z", "fixed"),
      update("c", "2026-09-28T10:00:00Z", "new"),
      update("d", "2026-09-24T10:00:00Z", "new"),
    ]);

    expect(groups.map(group => group.key)).toEqual(["2026-09-27", "2026-09-20"]);
    expect(groups[0].highlights.map(u => u.id)).toEqual(["c", "a"]);
    expect(groups[0].fixes.map(u => u.id)).toEqual(["b"]);
    expect(groups[1].highlights.map(u => u.id)).toEqual(["d"]);
  });
});

describe("formatWeek", () => {
  it("names the week by its UTC Sunday", () => {
    expect(formatWeek(new Date("2026-09-27T00:00:00Z"))).toMatch(/^Week of .*27.*2026$/);
  });
});
