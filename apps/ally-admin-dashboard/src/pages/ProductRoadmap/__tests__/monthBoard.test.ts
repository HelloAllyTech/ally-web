import { describe, expect, it } from "vitest";

import { RoadmapBoardGroupBy } from "@types";

import {
  LaneSnapshot,
  isDraggable,
  isLaneDomId,
  laneDomId,
  laneLabel,
  laneSupportsReordering,
  monthFromLaneDomId,
  monthKeyOf,
  monthKeyRange,
  monthLabel,
  resolveDrop,
  shiftMonthKey,
} from "../utils/monthBoard";

const lanes = (): LaneSnapshot[] => [
  { key: null, ids: ["u1", "u2", "u3"] },
  { key: "2026-08", ids: ["a1", "a2"] },
  { key: "2026-09", ids: [] },
];

describe("monthKeyOf", () => {
  it("formats YYYY-MM zero-padded on the UTC month", () => {
    expect(monthKeyOf(new Date("2026-09-15T12:00:00Z"))).toBe("2026-09");
    expect(monthKeyOf(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });
});

describe("shiftMonthKey", () => {
  it("crosses the year boundary in both directions", () => {
    // THE BUG THIS PREVENTS: string arithmetic or a local-time Date produces '2026-13' here, which
    // the backend rejects outright with a 400 on the very first drag into next January.
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("does not skip February off a 31-day anchor", () => {
    expect(shiftMonthKey("2026-01", 1)).toBe("2026-02");
    expect(shiftMonthKey("2026-03", -1)).toBe("2026-02");
  });

  it("stays in step with the backend's window default", () => {
    // The page computes the initial window client-side while the backend defaults it server-side.
    // If these two disagreed, the first render would request one window and render another.
    expect(shiftMonthKey("2026-08", -1)).toBe("2026-07");
    expect(shiftMonthKey("2026-08", 4)).toBe("2026-12");
  });
});

describe("monthKeyRange", () => {
  it("is inclusive and spans years", () => {
    expect(monthKeyRange("2026-11", "2027-01")).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("returns nothing for an inverted range rather than looping forever", () => {
    expect(monthKeyRange("2026-11", "2026-08")).toEqual([]);
  });
});

describe("monthLabel", () => {
  it("renders a readable heading", () => {
    expect(monthLabel("2026-08")).toBe("Aug 2026");
    expect(monthLabel("2026-12")).toBe("Dec 2026");
  });

  it("names the Unscheduled lane", () => {
    expect(monthLabel(null)).toBe("Unscheduled");
  });

  it("shows a malformed key rather than rendering 'undefined 2026'", () => {
    expect(monthLabel("2026-13")).toBe("2026-13");
  });
});

describe("lane dom ids", () => {
  it("round-trips a month and the Unscheduled lane", () => {
    expect(monthFromLaneDomId(laneDomId("2026-08"))).toBe("2026-08");
    expect(monthFromLaneDomId(laneDomId(null))).toBeNull();
  });

  it("distinguishes a lane id from a bare card uuid", () => {
    // THE BUG THIS PREVENTS: without the prefix, a drop on a lane's empty space looks like a drop
    // on a card that doesn't exist, and the drag is silently discarded — which is exactly the
    // gesture you make to plan the first item into an empty month.
    expect(isLaneDomId(laneDomId("2026-08"))).toBe(true);
    expect(isLaneDomId("3f0c9d2e-0000-4000-8000-000000000000")).toBe(false);
    expect(monthFromLaneDomId("3f0c9d2e-0000-4000-8000-000000000000")).toBeUndefined();
  });
});

describe("resolveDrop — within one lane", () => {
  it("moves a card DOWN to the dropped-on card's index", () => {
    // THE CLASSIC OFF-BY-ONE. Dragging u1 onto u3 must land u1 last, not second. A hand-rolled
    // filter-then-insert-at-indexOf produces ["u2","u1","u3"] here, which visibly snaps back
    // because it disagrees with the preview dnd-kit already animated.
    const result = resolveDrop(lanes(), "u1", "u3");
    expect(result).toEqual({ key: null, orderedIds: ["u2", "u3", "u1"], withinLane: true });
  });

  it("moves a card UP to the dropped-on card's index", () => {
    const result = resolveDrop(lanes(), "u3", "u1");
    expect(result).toEqual({ key: null, orderedIds: ["u3", "u1", "u2"], withinLane: true });
  });

  it("returns null when a card is dropped on itself", () => {
    // A plain click passes the sensor's 8px threshold often enough to matter. Writing here would
    // fire a mutation and a socket broadcast that repaints every other open board for nothing.
    expect(resolveDrop(lanes(), "u2", "u2")).toBeNull();
  });

  it("sends the card to the end when dropped on its own lane's empty space", () => {
    const result = resolveDrop(lanes(), "u1", laneDomId(null));
    expect(result).toEqual({ key: null, orderedIds: ["u2", "u3", "u1"], withinLane: true });
  });
});

describe("resolveDrop — across lanes", () => {
  it("inserts at the dropped-on card's position and reports the crossing", () => {
    const result = resolveDrop(lanes(), "u1", "a2");
    expect(result).toEqual({
      key: "2026-08",
      orderedIds: ["a1", "u1", "a2"],
      withinLane: false,
    });
  });

  it("appends when dropped on a lane rather than a card", () => {
    const result = resolveDrop(lanes(), "u1", laneDomId("2026-08"));
    expect(result).toEqual({
      key: "2026-08",
      orderedIds: ["a1", "a2", "u1"],
      withinLane: false,
    });
  });

  it("handles a drop into a completely EMPTY month", () => {
    // The case a SortableContext alone cannot serve — an empty lane has no cards to collide with,
    // so this only works because the lane is a droppable in its own right.
    const result = resolveDrop(lanes(), "a1", laneDomId("2026-09"));
    expect(result).toEqual({ key: "2026-09", orderedIds: ["a1"], withinLane: false });
  });

  it("moves a card back to Unscheduled", () => {
    const result = resolveDrop(lanes(), "a1", "u2");
    expect(result).toEqual({
      key: null,
      orderedIds: ["u1", "a1", "u2", "u3"],
      withinLane: false,
    });
  });

  it("returns ONLY the destination lane's order", () => {
    // The source lane is deliberately not rewritten: its remaining cards keep their positions,
    // now with a gap, and gaps are harmless because the ordering has deterministic tiebreaks.
    const result = resolveDrop(lanes(), "u2", laneDomId("2026-08"));
    expect(result?.orderedIds).not.toContain("u1");
    expect(result?.orderedIds).not.toContain("u3");
  });

  it("never duplicates a card that was already in the destination", () => {
    // Defensive: a stale snapshot could list the same id in two lanes. Emitting it twice would
    // give the same card two positions and make the lane order nondeterministic.
    const stale: LaneSnapshot[] = [
      { key: null, ids: ["x1", "x2"] },
      { key: "2026-08", ids: ["x1", "b1"] },
    ];
    const result = resolveDrop(stale, "x1", "b1");
    expect(result?.orderedIds.filter(id => id === "x1")).toHaveLength(1);
  });
});

describe("resolveDrop — no-ops", () => {
  it("returns null for a card that is in no lane", () => {
    expect(resolveDrop(lanes(), "ghost", "u1")).toBeNull();
  });

  it("returns null for an unresolvable target", () => {
    expect(resolveDrop(lanes(), "u1", "ghost")).toBeNull();
  });

  it("returns null for a lane that is not in the window", () => {
    expect(resolveDrop(lanes(), "u1", laneDomId("2027-05"))).toBeNull();
  });
});

describe("isDraggable", () => {
  it("locks a card whose month is pinned", () => {
    // A shipped card's lane is its release month, and the backend answers 422 for a move. Locking
    // it is how that rule gets explained in a tooltip instead of arriving as a failed drop.
    expect(isDraggable({ monthPinned: true })).toBe(false);
    expect(isDraggable({ monthPinned: false })).toBe(true);
  });

  it("treats a missing flag as draggable", () => {
    expect(isDraggable({})).toBe(true);
  });
});

describe("laneLabel", () => {
  it("formats month keys and names the catch-all lane per grouping", () => {
    expect(laneLabel("2026-08", RoadmapBoardGroupBy.MONTH)).toBe("Aug 2026");
    // "Unscheduled" and "No owner" are different facts; a shared "None" would say neither.
    expect(laneLabel(null, RoadmapBoardGroupBy.MONTH)).toBe("Unscheduled");
    expect(laneLabel(null, RoadmapBoardGroupBy.OWNER)).toBe("No owner");
    expect(laneLabel(null, RoadmapBoardGroupBy.PRODUCT_GOAL)).toBe("No goal");
  });

  it("labels a stage through the display map, not its wire value", () => {
    expect(laneLabel("under_development", RoadmapBoardGroupBy.STAGE)).toBe("In development");
  });

  it("passes goal and owner names through — they ARE their display names", () => {
    expect(laneLabel("Scribe", RoadmapBoardGroupBy.PRODUCT_GOAL)).toBe("Scribe");
    expect(laneLabel("Ajey Gore", RoadmapBoardGroupBy.OWNER)).toBe("Ajey Gore");
  });
});

describe("laneSupportsReordering", () => {
  it("is month-only", () => {
    // boardPosition is one column and cannot hold four independent orders; the other groupings
    // order by priority, which is the ranking the board exists to express.
    expect(laneSupportsReordering(RoadmapBoardGroupBy.MONTH)).toBe(true);
    expect(laneSupportsReordering(RoadmapBoardGroupBy.STAGE)).toBe(false);
    expect(laneSupportsReordering(RoadmapBoardGroupBy.PRODUCT_GOAL)).toBe(false);
    expect(laneSupportsReordering(RoadmapBoardGroupBy.OWNER)).toBe(false);
  });
});
