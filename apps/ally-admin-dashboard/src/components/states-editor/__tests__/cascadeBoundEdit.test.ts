import { describe, expect, it } from "vitest";

import { cascadeBoundEdit } from "../cascadeBoundEdit";
import { SimulationStateFormValue } from "../types";

/**
 * Pure-function tests for `cascadeBoundEdit`. The cascade is the engine
 * that keeps the simulation-state score sequence valid as the user edits
 * neighbouring bounds — covered here in isolation so the regressions
 * around forward-cascade / refuse-and-clamp don't have to be caught
 * through full editor-UI tests.
 *
 * Reference invariants:
 *   - states[0].scoreLower is locked at 0 (input is rendered read-only).
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
  isStarting: false,
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

  describe("state 0 lock", () => {
    it("ignores edits to scoreLower of the first state", () => {
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 0, "scoreLower", 25);
      // First state's lower is structurally pinned at 0 — value untouched,
      // no cascade at all.
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 100],
      ]);
    });
  });

  describe("intra-state min-gap on scoreUpper", () => {
    it("clamps upward when the user types a value below lower + MIN_GAP", () => {
      // State 0 currently [0, 50). User types 30 in the upper → that would
      // give a 30-wide range; we clamp the value up to 50 instead.
      const before = [state("a", 0, 50)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 30);
      expect(pairs(after)).toEqual([[0, MIN_STATE_GAP]]);
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

  describe("scoreLower edit (i > 0) — contiguity + clamp both sides", () => {
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
      // Refuse and clamp to state 0's min-gap floor = 0 + 50 = 50.
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 20);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 100],
      ]);
    });

    it("clamps downward to preserve the current state's min gap", () => {
      // Raising boundary from 50 → 80 would leave state 1 only 20 wide
      // (80..100). Clamp to state 1's min-gap ceiling = 100 - 50 = 50.
      const before = [state("a", 0, 50), state("b", 50, 100)];
      const after = cascadeBoundEdit(before, 1, "scoreLower", 80);
      expect(pairs(after)).toEqual([
        [0, 50],
        [50, 100],
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

  describe("single state", () => {
    it("edits scoreUpper without any forward cascade", () => {
      const before = [state("only", 0, 50)];
      const after = cascadeBoundEdit(before, 0, "scoreUpper", 500);
      expect(pairs(after)).toEqual([[0, 500]]);
    });
  });
});
