import { describe, expect, it } from "vitest";

import { seedNextState, startingStateId } from "../stateSeeds";
import { SimulationStateFormValue } from "../types";

const state = (
  scoreLower: number | null,
  scoreUpper: number | null,
  id = `s_${Math.random()}`,
): SimulationStateFormValue => ({
  id,
  name: "",
  guidelines: "",
  scoreLower,
  scoreUpper,
  ragEnabled: true,
});

describe("seedNextState", () => {
  it("returns the first state in [0, 50] when the list is empty", () => {
    const seed = seedNextState([]);
    expect(seed.scoreLower).toBe(0);
    expect(seed.scoreUpper).toBe(50);
  });

  it("continues from the previous state's scoreUpper (storage contiguity)", () => {
    // Last state stored {50, 100} (display "Min 51, Max 100"). New
    // state should land at storage {100, 150} → display "Min 101, Max
    // 150".
    const seed = seedNextState([state(0, 50), state(50, 100)]);
    expect(seed.scoreLower).toBe(100);
    expect(seed.scoreUpper).toBe(150);
  });

  it("handles non-default last state (custom widths)", () => {
    // Last state was widened by the user to [200, 350]. New state
    // continues from 350 with the default min-gap width.
    const seed = seedNextState([state(0, 50), state(50, 200), state(200, 350)]);
    expect(seed.scoreLower).toBe(350);
    expect(seed.scoreUpper).toBe(400);
  });

  it("falls back to last.scoreLower + 50 when last.scoreUpper is null", () => {
    // User is mid-typing the last state's Max. We still want addState
    // to produce a typeable card — derive lower from the previous
    // state's lower + MIN_STATE_GAP so the cascade has something to
    // reflow once the missing upper lands.
    const seed = seedNextState([state(0, 50), state(50, null)]);
    expect(seed.scoreLower).toBe(100);
    expect(seed.scoreUpper).toBe(150);
  });

  it("falls back to [0, 50] when last state has no bounds at all", () => {
    // Edge case: pathological state shape. Still produces a card the
    // user can type into.
    const seed = seedNextState([state(null, null)]);
    expect(seed.scoreLower).toBe(0);
    expect(seed.scoreUpper).toBe(50);
  });

  it("ragEnabled defaults to true on new states", () => {
    expect(seedNextState([]).ragEnabled).toBe(true);
    expect(seedNextState([state(0, 50)]).ragEnabled).toBe(true);
  });

  it("assigns a fresh id on each call", () => {
    const a = seedNextState([]);
    const b = seedNextState([]);
    expect(a.id).not.toBe(b.id);
  });
});

describe("startingStateId", () => {
  it("returns undefined for an empty list", () => {
    expect(startingStateId([])).toBeUndefined();
  });

  it("picks the state whose half-open range contains 0", () => {
    const states = [state(0, 50, "a"), state(50, 100, "b"), state(100, 200, "c")];
    expect(startingStateId(states)).toBe("a");
  });

  it("is upper-exclusive: 0 belongs to the state starting at 0, not ending at 0", () => {
    // state "neg" is [-50, 0); state "pos" is [0, 50). Score 0 is in "pos".
    const states = [state(-50, 0, "neg"), state(0, 50, "pos")];
    expect(startingStateId(states)).toBe("pos");
  });

  it("matches a negative-lower starting band", () => {
    const states = [state(-100, 50, "a"), state(50, 150, "b")];
    expect(startingStateId(states)).toBe("a");
  });

  it("clamps to the lowest-bounded state when 0 is below every range", () => {
    // Ranges start at 50 — 0 sits below them, so the runtime clamps to the
    // first (lowest-lower) state. Order-independent.
    const states = [state(100, 200, "high"), state(50, 100, "low")];
    expect(startingStateId(states)).toBe("low");
  });
});
