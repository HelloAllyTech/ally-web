/**
 * What the debrief panel should show, resolved from the same handful of
 * signals the summary polling exposes. Pulled out as a pure function (rather
 * than inlined in DebriefTab's JSX) because the branching order matters and
 * is easy to get subtly wrong — see the graceful-failure audit item this
 * fixes (contradictory "still working" / "couldn't write your debrief"
 * states shown for the same underlying timeout).
 */
export type DebriefViewState =
  /** Nothing has landed yet and the poll hasn't given up — evaluation is async. */
  | "generating"
  /** The supervisor note is here — the common, happy path. */
  | "note"
  /** The backend recorded an actual error for this evaluation. */
  | "failed"
  /** Feedback was generated (so nothing failed) but there is no supervisor
   * note — this session predates the debrief-note feature (or has it
   * switched off), not a generation failure. */
  | "notAvailable"
  /** The poll window ran out with no note, no feedback at all, and no
   * reported error. Most likely a long session whose summary is still being
   * written — not a failure, just slower than the poll window. */
  | "timedOut";

export interface DebriefViewStateInput {
  /** The supervisor note markdown, if written. */
  note?: string;
  /** Whether ANY feedback (positives/improvements, etc.) has been generated,
   * independent of whether it includes a supervisor note. */
  hasFeedback: boolean;
  /** A backend-reported error for this evaluation, if any. */
  errorMessage?: string;
  /** Whether the poll gave up waiting. */
  retryMaxReached: boolean;
}

export function getDebriefViewState({
  note,
  hasFeedback,
  errorMessage,
  retryMaxReached,
}: DebriefViewStateInput): DebriefViewState {
  if (note) return "note";
  // An error can arrive before the poll window closes (the backend can fail
  // fast) — check it ahead of retryMaxReached rather than only after.
  if (errorMessage) return "failed";
  // Feedback without a note is a resolved, terminal state on its own: no
  // amount of further polling will produce a note for a session that predates
  // the feature, so don't wait for retryMaxReached to say so.
  if (hasFeedback) return "notAvailable";
  if (retryMaxReached) return "timedOut";
  return "generating";
}
