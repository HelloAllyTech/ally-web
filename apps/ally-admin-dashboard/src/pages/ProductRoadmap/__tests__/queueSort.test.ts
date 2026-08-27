import { describe, expect, it } from "vitest";

import { QUEUE_SORTS, queueSortIdFor } from "../utils/queueSort";

describe("queue sort options", () => {
  it("offers exactly rank, latest, oldest", () => {
    expect(QUEUE_SORTS.map(s => s.id)).toEqual(["rank", "latest", "oldest"]);
  });

  it("maps rank to total votes descending — the thing the rank number counts", () => {
    const rank = QUEUE_SORTS.find(s => s.id === "rank")!;
    expect([rank.sortBy, rank.order]).toEqual(["priority", "DESC"]);
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

  it("round-trips query state back to the option", () => {
    expect(queueSortIdFor("createdAt", "ASC")).toBe("oldest");
    expect(queueSortIdFor("priority", "DESC")).toBe("rank");
  });

  it("falls back to rank for an ordering the Queue cannot reach", () => {
    // e.g. sort state carried in from the table, whose headers offer more fields.
    expect(queueSortIdFor("description", "ASC")).toBe("rank");
  });

});
