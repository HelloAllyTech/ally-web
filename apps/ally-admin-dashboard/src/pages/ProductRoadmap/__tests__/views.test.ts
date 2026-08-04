import { describe, expect, it } from "vitest";
import { RoadmapSavedView, RoadmapViewState } from "@types";

import {
  applySavedViewOrder,
  normaliseSortField,
  isValidViewDrop,
  isViewDirty,
  serializeViewState,
} from "../utils/views";

const view = (id: string, pinned = false, createdBy = 1): RoadmapSavedView => ({
  id,
  name: id,
  state: {},
  pinned,
  createdBy,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
});

describe("serializeViewState", () => {
  it("is stable regardless of key insertion order", () => {
    // THE BUG THIS PREVENTS: Postgres jsonb does not preserve key order, so the state coming
    // back from the API is a differently-ordered object than the one sent. A naive
    // JSON.stringify comparison therefore always mismatches and every saved view looks
    // permanently dirty.
    const a: RoadmapViewState = { searchQuery: "voice", typeFilter: ["bug"] };
    const b: RoadmapViewState = { typeFilter: ["bug"], searchQuery: "voice" };
    expect(serializeViewState(a)).toBe(serializeViewState(b));
  });

  it("is stable regardless of array order, since filter order carries no meaning", () => {
    expect(serializeViewState({ stageFilter: ["new", "released"] })).toBe(
      serializeViewState({ stageFilter: ["released", "new"] }),
    );
  });

  it("treats empty, null and undefined values as absent", () => {
    expect(serializeViewState({ searchQuery: "", typeFilter: [] })).toBe("{}");
    expect(serializeViewState({})).toBe("{}");
    expect(serializeViewState(undefined)).toBe("{}");
  });

  it("sorts nested object keys too", () => {
    expect(serializeViewState({ sort: { dir: "asc", field: "priority" } })).toBe(
      serializeViewState({ sort: { field: "priority", dir: "asc" } }),
    );
  });
});

describe("isViewDirty", () => {
  it("is false for the same state in a different key order", () => {
    expect(
      isViewDirty(
        { searchQuery: "a", goalFilter: ["Scribe"] },
        { goalFilter: ["Scribe"], searchQuery: "a" },
      ),
    ).toBe(false);
  });

  it("is true when a filter actually changes", () => {
    expect(isViewDirty({ goalFilter: ["Scribe"] }, { goalFilter: ["Reliability & Trust"] })).toBe(
      true,
    );
  });

  it("treats a cleared filter as dirty against a saved one", () => {
    expect(isViewDirty({ goalFilter: [] }, { goalFilter: ["Scribe"] })).toBe(true);
  });
});

describe("applySavedViewOrder", () => {
  const views = [view("a"), view("b"), view("c")];

  it("honours the saved order", () => {
    expect(applySavedViewOrder(views, ["c", "a", "b"]).map(v => v.id)).toEqual(["c", "a", "b"]);
  });

  it("appends views missing from the saved order", () => {
    expect(applySavedViewOrder(views, ["c"]).map(v => v.id)).toEqual(["c", "a", "b"]);
  });

  it("ignores stale ids WITHOUT hiding any view", () => {
    // A stale order must degrade to a slightly-wrong order, never to a disappeared tab.
    expect(applySavedViewOrder(views, ["ghost", "b", "zzz"]).map(v => v.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("handles no saved order at all", () => {
    expect(applySavedViewOrder(views, undefined).map(v => v.id)).toEqual(["a", "b", "c"]);
  });

  it("always sorts pinned views ahead of personal ones", () => {
    const mixed = [view("personal"), view("pinned", true)];
    expect(applySavedViewOrder(mixed, ["personal", "pinned"]).map(v => v.id)).toEqual([
      "pinned",
      "personal",
    ]);
  });
});

describe("isValidViewDrop", () => {
  // Two pinned, then two personal.
  const views = [view("p1", true), view("p2", true), view("m1"), view("m2")];

  it("rejects dropping a personal view into the pinned block", () => {
    // The source persisted such an order and then re-sorted on render, so the tab visibly
    // snapped back. Rejecting the drop is clearer than accepting and undoing it.
    expect(isValidViewDrop(views, 2, 0)).toBe(false);
    expect(isValidViewDrop(views, 3, 1)).toBe(false);
  });

  it("rejects dropping a pinned view into the personal block", () => {
    expect(isValidViewDrop(views, 0, 3)).toBe(false);
  });

  it("allows reordering within a block", () => {
    expect(isValidViewDrop(views, 0, 1)).toBe(true);
    expect(isValidViewDrop(views, 2, 3)).toBe(true);
  });

  it("rejects an out-of-range source index", () => {
    expect(isValidViewDrop(views, 99, 0)).toBe(false);
  });
});

describe("normaliseSortField", () => {
  it("maps the standalone app's legacy names to the API's", () => {
    // 3 of the 8 views migrated from production carry these. Sending them straight through made
    // the API 400 and the board silently kept the previous rows.
    expect(normaliseSortField("created")).toBe("createdAt");
    expect(normaliseSortField("released")).toBe("releasedAt");
  });

  it("passes canonical names through untouched", () => {
    for (const field of ["priority", "createdAt", "releasedAt", "myCoins", "description"]) {
      expect(normaliseSortField(field)).toBe(field);
    }
  });

  it("defaults to priority when the field is missing", () => {
    expect(normaliseSortField(undefined)).toBe("priority");
    expect(normaliseSortField("")).toBe("priority");
  });
});

describe("serializeViewState with legacy sort fields", () => {
  it("treats a legacy field and its canonical equivalent as EQUAL", () => {
    // Otherwise every migrated view shows a permanent unsaved-changes dot the moment it opens,
    // and an owner's autosave would fire on load.
    expect(serializeViewState({ sort: { field: "created", dir: "desc" } })).toBe(
      serializeViewState({ sort: { field: "createdAt", dir: "desc" } }),
    );
  });

  it("still reports a genuine sort change as dirty", () => {
    expect(
      isViewDirty(
        { sort: { field: "priority", dir: "desc" } },
        { sort: { field: "created", dir: "desc" } },
      ),
    ).toBe(true);
  });
});
