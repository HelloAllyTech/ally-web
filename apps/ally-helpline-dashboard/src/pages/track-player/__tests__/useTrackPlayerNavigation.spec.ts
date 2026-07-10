import { describe, expect, it } from "vitest";

import { TrackDetail, TrackDetailItem, TrackItemStatus, TrackItemType } from "@types";

import {
  computeCanAdvance,
  computeOverallPct,
  findItemIndex,
  flattenTrackItems,
} from "../useTrackPlayerNavigation";

const makeItem = (
  id: string,
  order: number,
  status: TrackItemStatus = TrackItemStatus.UNLOCKED,
): TrackDetailItem => ({
  id,
  type: TrackItemType.ARTICLE,
  order,
  title: `Item ${id}`,
  description: null,
  scenarioId: null,
  caseId: null,
  completionCriteria: null,
  contentMeta: null,
  status,
  startedAt: null,
  completedAt: null,
  score: null,
  attemptCount: null,
  maxWatchedPct: null,
});

const makeTrack = (): TrackDetail => ({
  id: "t1",
  title: "Track",
  description: null,
  coverImageUrl: null,
  status: "ACTIVE",
  totalItems: 3,
  estimatedDurationMinutes: null,
  enrolled: true,
  trackEnrollmentId: "e1",
  completedItems: 1,
  completedAt: null,
  sections: [
    // Deliberately out of order to prove sorting by `order`.
    {
      id: "s2",
      title: "Section 2",
      description: null,
      order: 2,
      items: [makeItem("c", 1), makeItem("d", 2)],
    },
    {
      id: "s1",
      title: "Section 1",
      description: null,
      order: 1,
      items: [makeItem("b", 2), makeItem("a", 1, TrackItemStatus.COMPLETED)],
    },
  ],
});

describe("flattenTrackItems", () => {
  it("returns an empty list for undefined", () => {
    expect(flattenTrackItems(undefined)).toEqual([]);
  });

  it("orders sections and items by their `order` field", () => {
    const flat = flattenTrackItems(makeTrack());
    expect(flat.map(f => f.item.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("carries section metadata and per-section index/count", () => {
    const flat = flattenTrackItems(makeTrack());
    expect(flat[0]).toMatchObject({
      sectionId: "s1",
      sectionTitle: "Section 1",
      indexInSection: 0,
      sectionItemCount: 2,
    });
    expect(flat[2]).toMatchObject({
      sectionId: "s2",
      indexInSection: 0,
      sectionItemCount: 2,
    });
  });
});

describe("findItemIndex", () => {
  it("locates an item by id", () => {
    const flat = flattenTrackItems(makeTrack());
    expect(findItemIndex(flat, "c")).toBe(2);
  });

  it("returns -1 when absent", () => {
    const flat = flattenTrackItems(makeTrack());
    expect(findItemIndex(flat, "zzz")).toBe(-1);
  });
});

describe("prev/next derivation", () => {
  it("derives neighbours from the flattened order", () => {
    const flat = flattenTrackItems(makeTrack());
    const idx = findItemIndex(flat, "b");
    expect(flat[idx - 1].item.id).toBe("a");
    expect(flat[idx + 1].item.id).toBe("c");
  });

  it("has no prev at the head and no next at the tail", () => {
    const flat = flattenTrackItems(makeTrack());
    expect(findItemIndex(flat, "a")).toBe(0);
    expect(findItemIndex(flat, "d")).toBe(flat.length - 1);
  });
});

describe("computeCanAdvance", () => {
  it("is false without an entry", () => {
    expect(computeCanAdvance(undefined, new Set())).toBe(false);
  });

  it("is true for a COMPLETED item regardless of the just-completed set", () => {
    const flat = flattenTrackItems(makeTrack());
    const completed = flat.find(f => f.item.id === "a");
    expect(computeCanAdvance(completed, new Set())).toBe(true);
  });

  it("is true when the item was just completed this session", () => {
    const flat = flattenTrackItems(makeTrack());
    const entry = flat.find(f => f.item.id === "b");
    expect(computeCanAdvance(entry, new Set())).toBe(false);
    expect(computeCanAdvance(entry, new Set(["b"]))).toBe(true);
  });
});

describe("computeOverallPct", () => {
  it("is 0 for an empty track", () => {
    expect(computeOverallPct([])).toBe(0);
  });

  it("rounds the completed fraction", () => {
    const flat = flattenTrackItems(makeTrack());
    // 1 of 4 completed = 25%.
    expect(computeOverallPct(flat)).toBe(25);
  });
});
