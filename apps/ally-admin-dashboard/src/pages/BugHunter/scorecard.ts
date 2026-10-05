import { BugHuntRunWindowSummary } from "@types";

/**
 * What Bug Hunter has actually cost, shipped and got wrong — the numbers a
 * *governor* needs, as opposed to the queue a reviewer works.
 *
 * ## Why this module exists at all
 *
 * The tab was complete for one role and empty for another. Everything on it
 * answered "what should I do next?": the status line, the needs-you queue, the
 * bucket chips, the drawer. Nothing answered "should this thing still be
 * merging its own code?" — which is the question you ask about an agent that
 * runs unattended overnight with a company credit card's worth of tokens and
 * write access to five repositories.
 *
 * Stacks' *Interface patterns for evolving human roles in agent systems* names
 * the split directly: reviewers need exception dashboards and audit visibility,
 * governors need *system-wide observability* and policy configuration. The
 * policy control was already here (the working-style switcher is the autonomy
 * slider from Stacks' *The Autonomy Slider in Agent Design*). The observability
 * was not — spend existed only as a per-row column in the shift log, four
 * significant figures at a time, with no total anywhere on the page.
 *
 * ## The totals come from the server, and that is the point
 *
 * The first version of this card summed `GET /runs` in the browser. That list
 * is capped at the newest 50 rows, and five repos sweeping nightly plus fix
 * sessions fill 50 rows in about a week — so "7 days", "30 days" and "All"
 * each summed the same week and printed the same figure, with an amber
 * footnote apologising for it. A footnote apologising for a denominator is
 * worse than a denominator you can trust, so the totals moved to
 * `GET /runs/summary?days=`, which aggregates every run in the window in
 * Postgres. What stays here is the arithmetic that turns those totals into
 * rates, and the formatting.
 *
 * Deliberately reads **runs only, never findings**. A "of N found, M shipped"
 * funnel was the obvious thing to put here and it would have been dishonest:
 * `found` is tallied across runs while a finding's status comes from the newest
 * hundred findings, so the two halves have different denominators and dividing
 * one by the other produces a rate of nothing. The accuracy panel owns the
 * finding funnel, and owns it alone — one number, one place.
 */

/** The two dated spend windows; `null` on the chip row means all time. */
export const SPEND_WINDOW_DAYS = [7, 30] as const;
export type SpendWindowDays = (typeof SPEND_WINDOW_DAYS)[number];

/**
 * Completed / (completed + failed), ignoring running and skipped runs.
 * `null` when nothing has finished yet, because 0/0 is not "0% reliable".
 */
export const successRate = (window: BugHuntRunWindowSummary): number | null => {
  const finished = window.completed + window.failed;
  return finished === 0 ? null : window.completed / finished;
};

/**
 * `autoMerged / found`. `null` when nothing has been found, and deliberately
 * *not* clamped: if it ever exceeds 1 that is a real backend accounting bug
 * and the UI showing 120% is how anyone would find out.
 */
export const autoMergeRate = (window: BugHuntRunWindowSummary): number | null =>
  window.found === 0 ? null : window.autoMerged / window.found;

/**
 * Runs in the window that reported no token counts, so the token line is a
 * floor. Runs closed before token tracking existed were never backfilled, and
 * skipped runs never report anything.
 */
export const tokensMissing = (window: BugHuntRunWindowSummary): number =>
  Math.max(0, window.runs - window.tokensReported);

/**
 * Money, at a precision that matches the magnitude.
 *
 * A sweep costs cents and a month costs tens of dollars, and one format cannot
 * serve both: `$0.03` printed as `$0` says the run was free, while `$41.9847`
 * is four digits of noise on a figure nobody will reconcile to the cent. So
 * sub-dollar totals keep two decimals and everything else rounds to whole
 * dollars — the shift log keeps its own four-decimal per-run format, which is
 * the one place that precision is the point.
 */
export const formatUsd = (amount: number): string => {
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return "$0";
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount).toLocaleString()}`;
};

/** A rate as whole-percent, or "—" when there is no denominator to divide by. */
export const formatRate = (rate: number | null): string =>
  rate == null ? "—" : `${Math.round(rate * 100)}%`;

/** Token counts, abbreviated — 1.2M reads faster than 1,238,004 and no decision turns on the digits. */
export const formatTokens = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
};
