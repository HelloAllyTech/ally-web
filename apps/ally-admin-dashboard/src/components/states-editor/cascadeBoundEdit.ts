/**
 * Pure-function cascade engine for the StatesEditor.
 *
 * Lives in its own file (not inside StatesEditor.tsx) so unit tests can
 * import it without dragging in the Redux store / API client / asset
 * imports that the component file pulls. Behavior is described inline
 * at `cascadeBoundEdit`.
 */

import { SimulationStateFormValue } from "./types";

export const MIN_STATE_GAP = 50;

/**
 * Cascade an edit to a state's score bound through the rest of the
 * sequence so that the contiguity (state[i].upper == state[i+1].lower)
 * and intra-state min-gap (upper - lower >= MIN_STATE_GAP) invariants
 * remain satisfied without surfacing red validation errors to the user.
 *
 * A state's Min and Max behave as a LINKED pair: moving one drags the
 * other along to keep the gap, rather than refusing the edit.
 *
 * Rules
 * -----
 * - State 0's `scoreLower` and the last state's `scoreUpper` are the open
 *   ends of the scoring range (the runtime resolver clamps any score beyond
 *   them into the first / last state). They remain user-editable — the
 *   value is just the labelled boundary, and state 0's lower may be
 *   negative.
 * - Empty input (null) bypasses the cascade — the user is mid-type.
 *   Save-time validation will flag the missing bound.
 * - Raising a `scoreLower` past `upper - MIN_STATE_GAP` PUSHES this state's
 *   `scoreUpper` up to `lower + MIN_STATE_GAP` and ripples forward, instead
 *   of clamping the lower back down.
 * - Lowering a `scoreUpper` below `lower + MIN_STATE_GAP` PULLS the lower
 *   down to `upper - MIN_STATE_GAP` — but only for state 0, whose lower is
 *   the open end with no left neighbour. For inner / last states the lower
 *   is a shared boundary, so we clamp the upper up instead (pulling it left
 *   would shrink the previous state and cascade backward through the chain).
 * - Lowering a shared `scoreLower` (i > 0) is still clamped at
 *   `prev.scoreLower + MIN_STATE_GAP` so it never shrinks the left
 *   neighbour below the min gap (no backward cascade).
 * - Forward cascade never pulls a downstream upper DOWN — the user's
 *   earlier manually-set widths are preserved.
 */
export const cascadeBoundEdit = (
  states: SimulationStateFormValue[],
  index: number,
  field: "scoreLower" | "scoreUpper",
  rawValue: number | null,
): SimulationStateFormValue[] => {
  // Null pass-through: user cleared the field to retype. Save-time
  // validation will flag the missing bound until a digit lands.
  if (rawValue === null) {
    return states.map((s, i) => (i === index ? { ...s, [field]: null } : s));
  }

  const next = states.map(s => ({ ...s }));

  // Forward cascade from `from`: each downstream boundary follows the
  // running upper, and a downstream state whose width would drop below
  // MIN_STATE_GAP has its upper pushed up just enough. Never pulls an
  // upper DOWN. Stops at the first null upper (user mid-type downstream).
  const cascadeForwardFrom = (from: number) => {
    let boundary = next[from].scoreUpper;
    if (typeof boundary !== "number") return;
    for (let j = from + 1; j < next.length; j++) {
      next[j].scoreLower = boundary;
      const upper = next[j].scoreUpper;
      if (typeof upper === "number" && upper - boundary < MIN_STATE_GAP) {
        next[j].scoreUpper = boundary + MIN_STATE_GAP;
      }
      if (typeof next[j].scoreUpper === "number") {
        boundary = next[j].scoreUpper as number;
      } else {
        break;
      }
    }
  };

  if (field === "scoreLower") {
    const cur = next[index];
    let v = rawValue;

    // Shared boundary (i > 0): never move it left past the previous state's
    // min-gap floor — that would shrink the left neighbour and force a
    // backward cascade. The first state's lower is open, so it moves freely.
    if (index > 0) {
      const prev = next[index - 1];
      if (typeof prev.scoreLower === "number") {
        v = Math.max(v, prev.scoreLower + MIN_STATE_GAP);
      }
      next[index - 1].scoreUpper = v;
    }
    next[index].scoreLower = v;

    // Keep this state at least MIN_STATE_GAP wide by pushing its upper up
    // (then cascading forward) rather than clamping the lower back down.
    if (typeof cur.scoreUpper === "number" && cur.scoreUpper - v < MIN_STATE_GAP) {
      next[index].scoreUpper = v + MIN_STATE_GAP;
      cascadeForwardFrom(index);
    }
    return next;
  }

  // field === "scoreUpper"
  const cur = next[index];
  let v = rawValue;

  if (typeof cur.scoreLower === "number" && v - cur.scoreLower < MIN_STATE_GAP) {
    if (index === 0) {
      // State 0's lower is the open end — pull it down to keep the gap
      // instead of refusing the edit.
      next[index].scoreLower = v - MIN_STATE_GAP;
    } else {
      // Shared lower boundary — don't pull the left neighbour; clamp the
      // upper up to the min gap instead.
      v = cur.scoreLower + MIN_STATE_GAP;
    }
  }
  next[index].scoreUpper = v;
  cascadeForwardFrom(index);
  return next;
};

/**
 * Remove the state with `id` and re-stitch the sequence so the contiguity
 * invariant (state[i].upper == state[i+1].lower) survives the deletion.
 *
 * Without this, a plain `filter` leaves a gap when a MIDDLE state is removed
 * (e.g. removing [50,100) from [0,50)[50,100)[100,200) leaves [0,50)[100,200)
 * — a hole from 50 to 100), which the score resolver can't map and which
 * save-time validation then rejects.
 *
 * Rules
 * -----
 * - Removing the first or last state needs no stitch: the remaining states
 *   are already contiguous among themselves, and the new end simply becomes
 *   the open bound.
 * - Removing a middle state closes the gap by extending the PREVIOUS state's
 *   `scoreUpper` up to the next state's `scoreLower` (the previous state
 *   absorbs the removed band). Its width only grows, so the min-gap invariant
 *   still holds.
 * - If either boundary is null (user mid-type), the stitch is skipped and the
 *   card is just dropped — save-time validation will flag the gap.
 */
export const removeStateAndStitch = (
  states: SimulationStateFormValue[],
  id: string,
): SimulationStateFormValue[] => {
  const index = states.findIndex(s => s.id === id);
  if (index === -1) return states;

  const next = states.filter(s => s.id !== id);

  // End removals (and emptying the list) need no stitch.
  if (index === 0 || index === states.length - 1 || next.length === 0) {
    return next;
  }

  // Middle removal: `filter` keeps order, so the previous state is still at
  // index-1 and the state that followed the removed one is now at `index`.
  const prev = next[index - 1];
  const following = next[index];
  if (typeof prev.scoreUpper === "number" && typeof following.scoreLower === "number") {
    next[index - 1] = { ...prev, scoreUpper: following.scoreLower };
  }
  return next;
};
