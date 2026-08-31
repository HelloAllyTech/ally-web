import { describe, expect, it } from "vitest";

import { QUEUE_SORTS, queueSortIdFor } from "../utils/queueSort";

describe("queue sort options", () => {
  it("offers exactly top rank, bottom rank, latest, oldest, expected", () => {
    expect(QUEUE_SORTS.map(s => s.id)).toEqual([
      "topRank",
      "bottomRank",
      "latest",
      "oldest",
      "expected",
    ]);
  });

  it("maps both rank orderings to total votes — the thing the rank number counts", () => {
    expect(QUEUE_SORTS.find(s => s.id === "topRank")).toMatchObject({
      sortBy: "priority",
      order: "DESC",
    });
    expect(QUEUE_SORTS.find(s => s.id === "bottomRank")).toMatchObject({
      sortBy: "priority",
      order: "ASC",
    });
  });

  it("maps latest and oldest to filing date in each direction", () => {
    expect(QUEUE_SORTS.find(s => s.id === "latest")).toMatchObject({
      sortBy: "createdAt",
      order: "DESC",
    });
    expect(QUEUE_SORTS.find(s => s.id === "oldest")).toMatchObject({
      sortBy: "createdAt",
      order: "ASC",
    });
  });

  it("maps expected to the planned month, soonest first", () => {
    // ASC, not DESC: plannedMonth is a 'YYYY-MM' string, so ascending is chronological and
    // "expected first" means the nearest month — not the furthest one.
    expect(QUEUE_SORTS.find(s => s.id === "expected")).toMatchObject({
      sortBy: "plannedMonth",
      order: "ASC",
    });
  });

  it("round-trips query state back to the option", () => {
    expect(queueSortIdFor("createdAt", "ASC")).toBe("oldest");
    expect(queueSortIdFor("priority", "DESC")).toBe("topRank");
    // The direction is the only thing separating the two rank options, so the round trip has to
    // discriminate on it — a lookup keyed on sortBy alone would collapse them into one.
    expect(queueSortIdFor("priority", "ASC")).toBe("bottomRank");
    expect(queueSortIdFor("plannedMonth", "ASC")).toBe("expected");
  });

  it("falls back to top rank for an ordering the Queue cannot reach", () => {
    // e.g. sort state carried in from the table, whose headers offer more fields.
    expect(queueSortIdFor("description", "ASC")).toBe("topRank");
  });
});
