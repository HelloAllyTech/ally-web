/**
 * Helpers for seeding new state cards in the StatesEditor.
 *
 * Kept separate from the component so they can be unit-tested without
 * dragging in Redux / API / asset imports.
 */

import { MIN_STATE_GAP } from "./cascadeBoundEdit";
import { SimulationStateFormValue } from "./types";

const generateId = (): string =>
  `state_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;

/**
 * Build the seed values for a NEW state being appended to `existing`.
 *
 * The new state's bounds continue the sequence from the last existing
 * state: `scoreLower = last.scoreUpper`, `scoreUpper = scoreLower + MIN_STATE_GAP`.
 * That keeps the storage contiguous (state[i].upper == state[i+1].lower)
 * so the cascade can rely on the invariant on the very next edit.
 *
 * Edge cases:
 *  - Empty list → start at [0, MIN_STATE_GAP].
 *  - Last state's `scoreUpper` is null (user mid-typing) → fall back to
 *    `last.scoreLower + MIN_STATE_GAP` if available, else [0, MIN_STATE_GAP].
 *    Either way the new card lands somewhere typeable; the cascade will
 *    reflow once the user fills the missing field.
 *
 * `isStarting` is true iff the list was empty — the first state in a
 * scenario is always the starting state. Subsequent adds default to
 * non-starting; the user can flip the radio if they want to change it.
 */
export const seedNextState = (existing: SimulationStateFormValue[]): SimulationStateFormValue => {
  const isFirst = existing.length === 0;
  if (isFirst) {
    return {
      id: generateId(),
      name: "",
      guidelines: "",
      isStarting: true,
      scoreLower: 0,
      scoreUpper: MIN_STATE_GAP,
      ragEnabled: true,
    };
  }

  const last = existing[existing.length - 1];
  let lower: number;
  if (typeof last.scoreUpper === "number") {
    lower = last.scoreUpper;
  } else if (typeof last.scoreLower === "number") {
    lower = last.scoreLower + MIN_STATE_GAP;
  } else {
    lower = 0;
  }

  return {
    id: generateId(),
    name: "",
    guidelines: "",
    isStarting: false,
    scoreLower: lower,
    scoreUpper: lower + MIN_STATE_GAP,
    ragEnabled: true,
  };
};
