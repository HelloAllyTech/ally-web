import type { BuilderPipelinePhase } from "@types";

/**
 * Formatting for the pipeline view.
 *
 * Pure and separate from the page for one reason: every value here can be null,
 * and null has to survive all the way to the cell. A run dispatched before the
 * runner reported timings has a cost record with no clock, so "—" and "0s" mean
 * completely different things — one is "not measured", the other is "instant" —
 * and the difference is invisible once it has been rendered. Tested rather than
 * eyeballed.
 */

/** "18m 42s", "3.2s", "1h 23m", or "—" when there is nothing to show. */
export const formatDurationMs = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  // Rounded to whole seconds FIRST, then split. Splitting before rounding gives
  // "1m 60s" for anything from 119.5s up.
  const whole = Math.round(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

/** "$1.23", or "—". Mirrors formatScoreboardCost, which takes dollars not ms. */
export const formatPipelineCost = (usd: number | null | undefined): string => {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) return "—";
  return `$${usd.toFixed(2)}`;
};

/** "67%", or "—" when a gate has no results — which is not the same as 0%. */
export const formatPassRate = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
};

/** Turn counts are medians, so they can be fractional. "148", "12.5", "—". */
export const formatCount = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

/**
 * The split between waiting on the model and running its tool calls.
 *
 * This is the number the whole view exists for: on the first real build the
 * coder spent 13 minutes on the model and 20 inside tool calls, nearly all of
 * it full test suites the gate then ran a second time. Returns null rather than
 * a fabricated 50/50 when either side is unmeasured, or when API time exceeds
 * wall clock (which parallel subagents can genuinely produce, and which would
 * otherwise render as a bar past 100%).
 */
export const timeSplit = (
  phase: Pick<BuilderPipelinePhase, "medianWallMs" | "medianApiMs">,
): { apiPercent: number; toolPercent: number } | null => {
  const wall = phase.medianWallMs;
  const api = phase.medianApiMs;
  if (wall === null || api === null) return null;
  if (!Number.isFinite(wall) || !Number.isFinite(api)) return null;
  if (wall <= 0 || api < 0 || api > wall) return null;

  const apiPercent = Math.round((api / wall) * 100);
  return { apiPercent, toolPercent: 100 - apiPercent };
};

/**
 * Most expensive phase first — that is the order somebody looking for what to
 * fix wants to read. A phase with no recorded cost sorts last rather than
 * counting as $0.
 */
export const sortPhasesByCostDesc = (phases: BuilderPipelinePhase[]): BuilderPipelinePhase[] =>
  [...phases].sort((a, b) => {
    const left = a.totalCostUsd;
    const right = b.totalCostUsd;
    if (left === null && right === null) return a.phase.localeCompare(b.phase);
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  });
