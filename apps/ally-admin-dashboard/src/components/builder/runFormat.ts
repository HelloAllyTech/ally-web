/**
 * Pure formatting for a build run's own numbers — duration and spend — kept
 * out of the components that render them so both are unit-testable without a
 * DOM and shareable between {@link RunHistoryRail} and anything else that
 * needs to say how long a run took.
 */

/**
 * "3m 12s" / "1h 4m" — wall-clock duration from dispatch to completion.
 * Returns null for a run with no `completedAt` (still running) or for
 * malformed timestamps, so the caller decides what to say instead — a run in
 * progress and a run with bad data should not read the same.
 */
export const formatRunDuration = (
  dispatchedAt: string,
  completedAt: string | null,
): string | null => {
  if (!completedAt) return null;
  const start = new Date(dispatchedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;

  const totalSeconds = Math.round((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/** "$1.23" — null for a zero, missing or unparsable spend, same as {@link Builder}'s own formatCost. */
export const formatCostUsd = (value: string | number | null | undefined): string | null => {
  const num = typeof value === "string" ? Number(value) : value;
  if (num === null || num === undefined || !Number.isFinite(num) || num === 0) return null;
  return `$${num.toFixed(2)}`;
};

/**
 * The gap between two consecutive feed events, as a duration string — or
 * null when it's under `minMs` and not worth mentioning. A short gap between
 * an agent's message and its next tool call is normal pacing; a long one (a
 * slow test suite, a big diff) is time the reader would otherwise read as
 * "nothing happened" rather than as a wait.
 */
export const formatEventGap = (fromIso: string, toIso: string, minMs = 15_000): string | null => {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  if (to - from < minMs) return null;
  return formatRunDuration(fromIso, toIso);
};

/**
 * Did this run do anything at all?
 *
 * A session's strip gives every run an identical card, so a run that burned
 * 34 minutes and $10.18 and one that died in 1m03s having written nothing
 * look the same. Six of those in a row read as "this is hopelessly broken"
 * when most were a config error fixed in the next minute — and the one that
 * actually cost money gets no more attention than the rest.
 *
 * Stacks, "Dynamic visibility scaling tied to information urgency": visibility
 * should be proportional to importance and should CHANGE with state rather
 * than stay constant. So the ones that spent nothing and ended almost
 * immediately are rendered quietly.
 *
 * Deliberately conservative. Only an ENDED run can be judged this way — a live
 * run has spent nothing yet and is the most interesting thing on the page —
 * and anything that reached a minute, or cost a cent, keeps its full weight.
 * A wrong call here hides something a person needed, so it errs towards
 * showing.
 */
export const runDidNothing = (run: {
  status: string;
  costUsd: string | null;
  dispatchedAt: string;
  completedAt: string | null;
}): boolean => {
  if (!run.completedAt) return false;
  if (run.status !== "FAILED" && run.status !== "CANCELLED") return false;

  const spent = Number(run.costUsd ?? 0);
  if (Number.isFinite(spent) && spent >= 0.01) return false;

  const start = new Date(run.dispatchedAt).getTime();
  const end = new Date(run.completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return end - start < 90_000;
};

/** Total spend across a session's runs, for the strip's heading. */
export const totalCostUsd = (runs: { costUsd: string | null }[]): number =>
  runs.reduce((sum, run) => {
    const value = Number(run.costUsd ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
