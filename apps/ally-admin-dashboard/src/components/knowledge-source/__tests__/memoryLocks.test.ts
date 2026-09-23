import { describe, expect, it } from "vitest";

import {
  ladderOrder,
  reassignLocksForRemovedState,
  sourcesOpeningAt,
  stateLabel,
} from "../memoryLocks";

const states = [
  { id: "s-3", name: "Trusting", scoreLower: 100 },
  { id: "s-1", name: "Guarded", scoreLower: -100 },
  { id: "s-2", name: "", scoreLower: 50 },
];

const sources = [
  { id: "k1", title: "Job loss" },
  { id: "k2", title: "Drinking", unlocksFromStateId: "s-2" },
  { id: "k3", title: "Rent", unlocksFromStateId: "s-3" },
];

describe("memoryLocks", () => {
  it("orders the ladder by score, not list order", () => {
    expect(ladderOrder(states).map(s => s.id)).toEqual(["s-1", "s-2", "s-3"]);
  });

  it("labels an unnamed state by its ladder position", () => {
    expect(stateLabel(ladderOrder(states)[1], 1)).toBe("State 2");
  });

  it("lists only the memories opening at exactly that state", () => {
    expect(sourcesOpeningAt(sources, "s-2").map(s => s.title)).toEqual(["Drinking"]);
    expect(sourcesOpeningAt(sources, "s-1")).toEqual([]);
  });

  it("moves locks on a removed state to the next state up, never earlier", () => {
    const result = reassignLocksForRemovedState(sources, states, "s-2");
    expect(result.moved).toBe(1);
    expect(result.movedTo?.id).toBe("s-3");
    expect(result.sources.find(s => s.id === "k2")?.unlocksFromStateId).toBe("s-3");
    expect(result.sources.find(s => s.id === "k1")?.unlocksFromStateId).toBeUndefined();
  });

  it("falls back to the state below only when the top state is removed", () => {
    const result = reassignLocksForRemovedState(sources, states, "s-3");
    expect(result.movedTo?.id).toBe("s-2");
    expect(result.sources.find(s => s.id === "k3")?.unlocksFromStateId).toBe("s-2");
  });

  it("clears locks when the only state is removed", () => {
    const only = [{ id: "s-1", name: "Only", scoreLower: 0 }];
    const result = reassignLocksForRemovedState(
      [{ id: "k", title: "x", unlocksFromStateId: "s-1" }],
      only,
      "s-1",
    );
    expect(result.movedTo).toBeNull();
    expect(result.sources[0].unlocksFromStateId).toBeNull();
  });

  it("is a no-op when nothing was locked to the removed state", () => {
    const result = reassignLocksForRemovedState(sources, states, "s-1");
    expect(result.moved).toBe(0);
    expect(result.sources).toBe(sources);
  });
});
