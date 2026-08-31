import { describe, expect, it } from "vitest";

import { QUEUE_SORTS, queueSortIdFor } from "../utils/queueSort";

describe("queue sort options", () => {
  it("offers the rank pair, the raw vote pair, backers, and the date orderings", () => {
    expect(QUEUE_SORTS.map(s => s.id)).toEqual([
      "topRank",
      "bottomRank",
      "topVotes",
      "bottomVotes",
      "mostBackers",
      "latest",
      "oldest",
      "expected",
    ]);
  });

  it("maps both rank orderings to the COMPOSITE — the thing the rank number is", () => {
    // ally-be's queueRankSql numbers the queue by the same expression, so a rank badge cannot
    // disagree with the order the cards are displayed in.
    expect(QUEUE_SORTS.find(s => s.id === "topRank")).toMatchObject({
      sortBy: "composite",
      order: "DESC",
    });
    expect(QUEUE_SORTS.find(s => s.id === "bottomRank")).toMatchObject({
      sortBy: "composite",
      order: "ASC",
    });
  });

  it("keeps the raw vote ordering reachable, so the composite can be checked against it", () => {
    // A blended score nobody can compare against its own inputs is one people learn to ignore.
    expect(QUEUE_SORTS.find(s => s.id === "topVotes")).toMatchObject({
      sortBy: "priority",
      order: "DESC",
    });
    expect(QUEUE_SORTS.find(s => s.id === "bottomVotes")).toMatchObject({
      sortBy: "priority",
      order: "ASC",
    });
  });

  it("offers backers, which neither votes nor the composite can be read off", () => {
    // Forty admins voting once each and one admin spending forty votes are the same total.
    expect(QUEUE_SORTS.find(s => s.id === "mostBackers")).toMatchObject({
      sortBy: "voters",
      order: "DESC",
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
    expect(queueSortIdFor("composite", "DESC")).toBe("topRank");
    // The direction is the only thing separating the two rank options, so the round trip has to
    // discriminate on it — a lookup keyed on sortBy alone would collapse them into one.
    expect(queueSortIdFor("composite", "ASC")).toBe("bottomRank");
    // The vote orderings are their own options now, not aliases of the rank ones.
    expect(queueSortIdFor("priority", "DESC")).toBe("topVotes");
    expect(queueSortIdFor("voters", "DESC")).toBe("mostBackers");
    expect(queueSortIdFor("plannedMonth", "ASC")).toBe("expected");
  });

  it("falls back to top rank for an ordering the Queue cannot reach", () => {
    // e.g. sort state carried in from the table, whose headers offer more fields.
    expect(queueSortIdFor("description", "ASC")).toBe("topRank");
  });
});
