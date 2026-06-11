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
 * There is no `isStarting` flag — the starting state is emergent (the
 * state whose range contains 0). The first seeded state spans
 * [0, MIN_STATE_GAP), so it naturally opens the simulation until the
 * author edits the bounds.
 */
export const seedNextState = (existing: SimulationStateFormValue[]): SimulationStateFormValue => {
  const isFirst = existing.length === 0;
  if (isFirst) {
    return {
      id: generateId(),
      name: "",
      guidelines: "",
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
    scoreLower: lower,
    scoreUpper: lower + MIN_STATE_GAP,
    ragEnabled: true,
  };
};

/**
 * Resolve which state opens the simulation: the one whose half-open range
 * `[scoreLower, scoreUpper)` contains 0 (the session's starting score). If
 * 0 sits below every range, the runtime clamps to the first state — so we
 * mirror that here and return the first state's id. Returns undefined for
 * an empty list. Pure + dependency-free so it can be unit-tested and reused
 * by the editor without pulling in component imports.
 *
 * Mirrors `_resolve_simulation_state_by_score` (ally-ai-learn) at score 0.
 */
export const startingStateId = (states: SimulationStateFormValue[]): string | undefined => {
  if (states.length === 0) return undefined;
  const containsZero = states.find(
    s =>
      typeof s.scoreLower === "number" &&
      typeof s.scoreUpper === "number" &&
      s.scoreLower <= 0 &&
      0 < s.scoreUpper,
  );
  // Fall back to the lowest-bounded state (clamp target) when no range
  // contains 0 — matches the runtime's below-range clamp to the first state.
  if (containsZero) return containsZero.id;
  const sorted = [...states].sort((a, b) => (a.scoreLower ?? 0) - (b.scoreLower ?? 0));
  return sorted[0].id;
};
