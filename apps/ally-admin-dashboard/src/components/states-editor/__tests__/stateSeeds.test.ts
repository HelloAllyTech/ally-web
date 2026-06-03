import { describe, expect, it } from "vitest";

import { seedNextState } from "../stateSeeds";
import { SimulationStateFormValue } from "../types";

const state = (scoreLower: number | null, scoreUpper: number | null): SimulationStateFormValue => ({
  id: `s_${Math.random()}`,
  name: "",
  guidelines: "",
  isStarting: false,
  scoreLower,
  scoreUpper,
  ragEnabled: true,
});

describe("seedNextState", () => {
  it("returns the first state in [0, 50] when the list is empty", () => {
    const seed = seedNextState([]);
    expect(seed.scoreLower).toBe(0);
    expect(seed.scoreUpper).toBe(50);
    expect(seed.isStarting).toBe(true);
  });

  it("continues from the previous state's scoreUpper (storage contiguity)", () => {
    // Last state stored {50, 100} (display "Min 51, Max 100"). New
    // state should land at storage {100, 150} → display "Min 101, Max
    // 150".
    const seed = seedNextState([state(0, 50), state(50, 100)]);
    expect(seed.scoreLower).toBe(100);
    expect(seed.scoreUpper).toBe(150);
    expect(seed.isStarting).toBe(false);
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

  it("first state of a new list is the starting state by default", () => {
    expect(seedNextState([]).isStarting).toBe(true);
  });

  it("subsequent states are NOT the starting state by default", () => {
    expect(seedNextState([state(0, 50)]).isStarting).toBe(false);
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
