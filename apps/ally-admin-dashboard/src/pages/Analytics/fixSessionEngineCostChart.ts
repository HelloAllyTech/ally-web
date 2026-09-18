import { FixSessionEngineCost } from "@types";

import { ColorScale, PALETTE } from "./chartScales";

/**
 * Short provider names for the bar labels — not the raw engine value
 * ("claude-code"/"gemini") a reader would have to already know the mapping
 * for. Falls back to the raw string for an engine this map doesn't know yet,
 * same convention as BugHunter/bugFindingLabels.ts's `engineModelLabel` (not
 * imported from there directly: that page's helper also names the model,
 * which this chart's axis has no room for — one bar is one engine).
 */
const ENGINE_LABELS: Record<string, string> = {
  "claude-code": "Claude",
  gemini: "Gemini",
};

/** Fixed two-colour scale, same reasoning as CODING_AGENT_SCALE: there are always exactly two engines, not an open-ended set. */
export const ENGINE_COST_SCALE: ColorScale = {
  [ENGINE_LABELS["claude-code"]]: PALETTE.purple,
  [ENGINE_LABELS.gemini]: PALETTE.blue,
};

export type EngineCostDatum = { group: string; value: number };

/** One bar per engine — average cost across its COMPLETED fix sessions in the window. */
export function buildFixSessionEngineCostBars(byEngine: FixSessionEngineCost[]): EngineCostDatum[] {
  return byEngine
    .map(row => ({
      group: ENGINE_LABELS[row.engine] ?? row.engine,
      value: row.avgCostUsd,
    }))
    .sort((a, b) => b.value - a.value);
}

/** yyyy-mm-dd, what the backend's `from`/`to` (and its own `window.from`/`to`) already use. */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * `{from, to}` for "the last N days, ending today" — this chart's own
 * day-window control, independent of the tab-wide 30d/90d/12m range picker.
 * See FixSessionEngineCost.tsx's own doc for why it needs one: the shared
 * range's smallest option (30 days) would still average clean, correct
 * recent runs together with two real pre-fix cost-reporting bugs from the
 * same window.
 */
export const rangeEndingToday = (days: number): { from: string; to: string } => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
};
