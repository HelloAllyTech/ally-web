import { describe, expect, it } from "vitest";

import { cascadeBoundEdit, removeStateAndStitch } from "../cascadeBoundEdit";
import { SimulationStateFormValue } from "../types";

/**
 * Pure-function tests for `cascadeBoundEdit`. The cascade is the engine
 * that keeps the simulation-state score sequence valid as the user edits
 * neighbouring bounds — covered here in isolation so the regressions
 * around forward-cascade / refuse-and-clamp don't have to be caught
 * through full editor-UI tests.
 *
 * Reference invariants:
 *   - states[0].scoreLower is the open lower end and may be negative.
 *   - Min and Max are a LINKED pair: raising a lower past the gap pushes the
 *     upper up (and cascades forward); lowering state 0's upper pulls its
 *     open lower down. Shared boundaries are never pulled left (no backward
 *     cascade) — those edits clamp instead.
 *   - For each i: scoreUpper - scoreLower >= MIN_STATE_GAP (50).
 *   - For each i < N-1: states[i].scoreUpper == states[i+1].scoreLower.
 */

const MIN_STATE_GAP = 50;

const state = (
  id: string,
  scoreLower: number | null,
  scoreUpper: number | null,
): SimulationStateFormValue => ({
  id,
  name: id,
  guidelines: "",
  scoreLower,
  scoreUpper,
  ragEnabled: true,
});

// Convenience: pick the (lower, upper) pairs from the result for compact
// assertion lines — leaves the test readable in side-by-side diffs.
const pairs = (states: SimulationStateFormValue[]): Array<[number | null, number | null]> =>
  states.map(s => [s.scoreLower, s.scoreUpper]);

describe("cascadeBoundEdit", () => {
  describe("null pass-through (user is mid-type)", () => {
    it("writes null without cascading when input is cleared", () => {
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", null);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, null],
      ]);
    });
  });

  describe("state 0 open lower end (editable, may be negative)", () => {
    it("lets the first state's lower go negative without touching others", () => {
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 0, "scoreLower", -100);
      // No previous state to push; only state 0's own lower moves.
      expect(pairs(after)).toEqual([
        [-100, 50],
        [50, 100],
      ]);
    });

    it("accepts a mid-negative first-state lower", () => {
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 0, "scoreLower", -25);
      expect(pairs(after)).toEqual([
        [-25, 50],
        [50, 100],
      ]);
    });

    it("pushes its own upper up (and cascades) when raising the lower past the gap", () => {
      // Raising state 0's lower to 30 would leave only 20 of headroom under
      // upper=50. Instead of refusing, push state 0's upper to 30+50=80 and
      // ripple forward: state 1 follows to [80, 130].
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 0, "scoreLower", 30);
      expect(pairs(after)).toEqual([
        [30, 80],
        [80, 130],
      ]);
    });
  });

  describe("intra-state min-gap on scoreUpper", () => {
    it("pulls state 0's open lower down when upper drops below the gap", () => {
      // State 0 [0, 50). User types 30 in the upper → 30-wide range. State 0's
      // lower is the open end, so pull it down to 30-50=-20 to keep the gap.
      const before = [state("a", 0, 50)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 30);
      expect(pairs(after)).toEqual([[-20, 30]]);
    });

    it("clamps the upper up for a non-first state (shared lower, no backward pull)", () => {
      // State 1's lower (50) is shared with state 0's upper, so we can't pull
      // it left. Typing 70 in state 1's upper clamps up to 50+50=100.
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 70);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 100],
      ]);
    });

    it("accepts a value at or above lower + MIN_GAP unchanged", () => {
      const before = [state("a", 0, 50)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 120);
      expect(pairs(after)).toEqual([[0, 120]]);
    });
  });

  describe("forward cascade on scoreUpper edit", () => {
    it("pulls state[i+1].scoreLower up to the new boundary", () => {
      // Three contiguous states. Raise state 1's upper from 100 → 130.
      // State 2's lower must follow to 130; its upper (150) is still
      // valid (150 - 130 = 20 < 50) — so push state 2's upper to 180.
      const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 150)];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 130);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 130],
        [130, 180],
      ]);
    });

    it("leaves downstream uppers ALONE when they already satisfy min-gap", () => {
      // Same shape, but state 2 has plenty of headroom (upper=300).
      // Raise state 1's upper from 100 → 130. State 2's lower follows
      // to 130; its upper 300 is still >= 130+50, so untouched.
      const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 300)];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 130);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 130],
        [130, 300],
      ]);
    });

    it("ripples through MULTIPLE downstream states when each one is tight", () => {
      // Every downstream state is exactly MIN_GAP wide — a single bump
      // at state 1 propagates all the way to state 4.
      const before = [
        state("a", 0, 50),
        state("b", 50, 100),
        state("c", 100, 150),
        state("d", 150, 200),
        state("e", 200, 250),
      ];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 130);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 130],
        [130, 180],
        [180, 230],
        [230, 280],
      ]);
    });

    it("does NOT pull a downstream upper DOWN even when the user shrank the range", () => {
      // State 1 starts wide ([50, 200]); user drops its upper to 130.
      // State 2's lower must follow to 130 (contiguity), but state 2's
      // upper (250) is still >= 130+50 so we leave it alone — the
      // user's earlier widths are preserved.
      const before = [state("a", 0, 50), state("b", 50, 200), state("c", 200, 250)];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 130);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 130],
        [130, 250],
      ]);
    });

    it("stops the cascade when a downstream upper is null", () => {
      // State 2's upper hasn't been typed yet; cascade applies the new
      // boundary to its lower and exits — when the user types upper
      // later, its own cascade will continue.
      const before = [
        state("a", 0, 50),
        state("b", 50, 100),
        state("c", 100, null),
        state("d", 150, 200),
      ];
      const after = cascadeBoundEdit(before, 1, "scoreUpper", 130);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 130],
        [130, null],
        [150, 200], // untouched — cascade broke at the null
      ]);
    });
  });

  describe("scoreLower edit (i > 0) — shared boundary, push-not-refuse", () => {
    it("moves both state[i-1].upper and state[i].lower together", () => {
      // Boundary starts at 50. Move it to 70 — state 0 widens to
      // [0,70] (70 wide, valid) and state 1 narrows to [70,200] (130
      // wide, valid). Both ends respect MIN_STATE_GAP.
      const before = [state("a", 0, 50), state("b", 50, 200)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 70);
      expect(pairs(after)).toEqual([
        [0, 70],
        [70, 200],
      ]);
    });

    it("clamps upward to preserve the previous state's min gap", () => {
      // Lowering boundary from 50 → 20 would leave state 0 only 20 wide.
      // Refuse and clamp to state 0's min-gap floor = 0 + 50 = 50 (we never
      // pull the left neighbour / cascade backward).
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 20);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 100],
      ]);
    });

    it("pushes the current state's upper up when raising the boundary past its gap", () => {
      // Raising boundary from 50 → 80 would leave state 1 only 20 wide
      // (80..100). Instead of refusing, push state 1's upper to 80+50=130
      // so the Min/Max stay linked.
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 80);
      expect(pairs(after)).toEqual([
        [0, 80],
        [80, 130],
      ]);
    });

    it("allows a valid mid-range move", () => {
      // State 0 [0, 100), state 1 [100, 200) — plenty of room. Shift
      // boundary to 130: both sides remain >= MIN_GAP wide.
      const before = [state("a", 0, 100), state("b", 100, 200)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 130);
      expect(pairs(after)).toEqual([
        [0, 130],
        [130, 200],
      ]);
    });
  });

  describe("single state — Min/Max move as a linked pair", () => {
    it("edits scoreUpper without any forward cascade", () => {
      const before = [state("only", 0, 50)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 500);
      expect(pairs(after)).toEqual([[0, 500]]);
    });

    it("raising Min past the gap pushes Max up", () => {
      const before = [state("only", -1, 49)];
      const after = cascadeBoundEdit(before, 0, "scoreLower", 60);
      expect(pairs(after)).toEqual([[60, 110]]);
    });

    it("lowering Max below the gap pulls Min down", () => {
      const before = [state("only", -1, 49)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 10);
      expect(pairs(after)).toEqual([[-40, 10]]);
    });
  });
});

describe("removeStateAndStitch", () => {
  it("re-stitches the gap when a MIDDLE state is removed", () => {
    // [0,50)[50,100)[100,200) — remove the middle one. The previous state
    // absorbs the band: its upper extends to the following state's lower.
    const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 200)];
    const after = removeStateAndStitch(before, "b");
    expect(after.map(s => s.id)).toEqual(["a", "c"]);
    expect(pairs(after)).toEqual([
      [0, 100], // 'a' grew to swallow the removed [50,100) band
      [100, 200],
    ]);
  });

  it("keeps ranges contiguous after a middle removal (no gap, no overlap)", () => {
    const before = [
      state("a", 0, 50),
      state("b", 50, 120),
      state("c", 120, 180),
      state("d", 180, 250),
    ];
    const after = removeStateAndStitch(before, "c");
    // 'b' absorbs [120,180); the sequence stays fully contiguous.
    for (let i = 0; i < after.length - 1; i++) {
      expect(after[i].scoreUpper).toBe(after[i + 1].scoreLower);
    }
    expect(pairs(after)).toEqual([
      [0, 50],
      [50, 180],
      [180, 250],
    ]);
  });

  it("removing the FIRST state needs no stitch (next becomes the open lower end)", () => {
    const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 200)];
    const after = removeStateAndStitch(before, "a");
    expect(pairs(after)).toEqual([
      [50, 100],
      [100, 200],
    ]);
  });

  it("removing the LAST state needs no stitch (prev becomes the open upper end)", () => {
    const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 200)];
    const after = removeStateAndStitch(before, "c");
    expect(pairs(after)).toEqual([
      [0, 50],
      [50, 100],
    ]);
  });

  it("removing the only state yields an empty list", () => {
    expect(removeStateAndStitch([state("a", 0, 50)], "a")).toEqual([]);
  });

  it("returns the list unchanged when the id is not found", () => {
    const before = [state("a", 0, 50), state("b", 50, 100)];
    expect(removeStateAndStitch(before, "missing")).toEqual(before);
  });

  it("skips the stitch when a boundary is null (user mid-type) — save validation flags it", () => {
    // Following state's lower is null, so there's nothing to stitch to;
    // the card is just dropped.
    const before = [state("a", 0, 50), state("b", 50, 100), state("c", null, 200)];
    const after = removeStateAndStitch(before, "b");
    expect(pairs(after)).toEqual([
      [0, 50], // unchanged — no numeric boundary to stitch to
      [null, 200],
    ]);
  });

  it("does not mutate the input array", () => {
    const before = [state("a", 0, 50), state("b", 50, 100), state("c", 100, 200)];
    const snapshot = pairs(before);
    removeStateAndStitch(before, "b");
    expect(pairs(before)).toEqual(snapshot);
  });
});
