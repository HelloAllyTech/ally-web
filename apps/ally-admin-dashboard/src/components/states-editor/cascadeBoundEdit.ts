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
 * Rules
 * -----
 * - State 0's `scoreLower` and the last state's `scoreUpper` are the open
 *   ends of the scoring range (the runtime resolver clamps any score beyond
 *   them into the first / last state). They remain user-editable — the
 *   value is just the labelled boundary, and state 0's lower may be
 *   negative. State 0's lower has no previous state to push, so it is
 *   clamped only against its own upper's min gap.
 * - Empty input (null) is allowed for any other field and bypasses the
 *   cascade — the user is mid-type. Save-time validation will flag the
 *   missing bound.
 * - Edit to state[i].scoreLower (i > 0) is structurally identical to
 *   editing state[i-1].scoreUpper. The value is clamped against BOTH
 *   states' min-gap floors and applied to both fields. No backward
 *   propagation beyond i-1 — when the user's value would otherwise
 *   shrink state[i-1] below MIN_STATE_GAP we silently clamp upward
 *   (refuse-and-clamp; chosen because backward cascade would let one
 *   edit invalidate the entire chain to the left).
 * - Edit to state[i].scoreUpper sets state[i+1].scoreLower (if any)
 *   and ripples forward: at each downstream state, if its upper drops
 *   below `lower + MIN_STATE_GAP`, we push the upper up just enough.
 *   We never pull a downstream upper DOWN — the user's earlier
 *   manually-set widths are preserved.
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

  if (field === "scoreLower") {
    const cur = next[index];
    let v = rawValue;

    if (index === 0) {
      // State 0 has no previous state — its lower is the open bottom of the
      // range and may be negative. Clamp only against its own upper so the
      // intra-state min gap holds.
      if (typeof cur.scoreUpper === "number") {
        v = Math.min(v, cur.scoreUpper - MIN_STATE_GAP);
      }
      next[index].scoreLower = v;
      return next;
    }

    // Editing a non-first lower also moves the previous state's upper.
    const prev = next[index - 1];

    // Min-gap floor from the previous state (preserve its width).
    if (typeof prev.scoreLower === "number") {
      v = Math.max(v, prev.scoreLower + MIN_STATE_GAP);
    }
    // Min-gap ceiling from the current state (preserve its width).
    if (typeof cur.scoreUpper === "number") {
      v = Math.min(v, cur.scoreUpper - MIN_STATE_GAP);
    }

    next[index - 1].scoreUpper = v;
    next[index].scoreLower = v;
    return next;
  }

  // field === "scoreUpper"
  const cur = next[index];
  let v = rawValue;

  // Intra-state min gap: upper cannot dip below lower + MIN_STATE_GAP.
  if (typeof cur.scoreLower === "number") {
    v = Math.max(v, cur.scoreLower + MIN_STATE_GAP);
  }
  next[index].scoreUpper = v;

  // Forward cascade: each downstream boundary follows v, then each
  // state below the cascade has its upper pushed up if it would
  // otherwise dip below `boundary + MIN_STATE_GAP`. Upper is never
  // pulled DOWN — the user's earlier widths stay intact.
  let boundary = v;
  for (let i = index + 1; i < next.length; i++) {
    next[i].scoreLower = boundary;
    const upper = next[i].scoreUpper;
    if (typeof upper === "number" && upper - boundary < MIN_STATE_GAP) {
      next[i].scoreUpper = boundary + MIN_STATE_GAP;
    }
    if (typeof next[i].scoreUpper === "number") {
      boundary = next[i].scoreUpper as number;
    } else {
      // Downstream upper is null (user mid-type). Stop the chain;
      // when that field lands, its own cascade will reflow what's
      // left.
      break;
    }
  }
  return next;
};
