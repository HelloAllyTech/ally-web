import { TokenConsumptionPoint } from "@types";

// Currency formatters. Kept co-located with the Token chart (mirrors how
// latencyChart.ts keeps its ms→s helper local) rather than in shared utils —
// this is the only consumer today. Promote to @utils if a second one appears.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Compact axis ticks: $0, $12, $1.2K, $3.4M — keeps the stacked left axis legible.
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatUsd = (n: number) => usd.format(n);
export const formatUsdCompact = (n: number) => usdCompact.format(n);

// The stacked-bar segments (tasks when grouping by model, models when grouping
// by task) are data-driven, so a static colour map won't do. Use a fixed
// Carbon categorical palette and assign by SORTED-DISTINCT group value, so a
// given task/model keeps the same colour across renders and across both toggle
// states. Wraps with modulo when there are more groups than colours.
export const TOKEN_PALETTE = [
  "#264D8E", // blue (brand)
  "#8a3ffc", // purple
  "#08bdba", // teal
  "#42be65", // green
  "#33b1ff", // cyan
  "#ff7eb6", // magenta
  "#fa4d56", // red
  "#d2a106", // gold
  "#6929c4", // deep purple
  "#1192e8", // light blue
  "#005d5d", // dark teal
  "#9f1853", // berry
];

/** Map each distinct group to a stable palette colour (sorted → deterministic). */
export const buildColorScale = (groups: string[]): Record<string, string> => {
  const distinct = Array.from(new Set(groups)).sort();
  return distinct.reduce<Record<string, string>>((scale, group, i) => {
    scale[group] = TOKEN_PALETTE[i % TOKEN_PALETTE.length];
    return scale;
  }, {});
};

export type TokenDim = "service" | "model" | "task";
export type TokenDatum = { group: string; key: string; value: number };

// The stacked segment (group) shown for each x-axis dimension:
//  - by service → segment by provider (LLM vs STT vs TTS, split by provider)
//  - by model   → segment by task
//  - by task    → segment by service
const GROUP_BY_DIM: Record<TokenDim, keyof TokenConsumptionPoint> = {
  service: "provider",
  model: "task",
  task: "service",
};

/**
 * Pivot (service × model × task) cost points into Carbon stacked-bar data.
 * x-axis (key) = the chosen `dim`; stacked segment (group) per GROUP_BY_DIM.
 * Values (estimatedCostUsd) are summed per (key, group).
 */
export const buildTokenCostData = (
  points: TokenConsumptionPoint[],
  dim: TokenDim,
): TokenDatum[] => {
  const groupField = GROUP_BY_DIM[dim];
  const acc = new Map<string, TokenDatum>();
  for (const p of points) {
    const key = String(p[dim]);
    const group = String(p[groupField]);
    const id = `${key}__${group}`;
    const existing = acc.get(id);
    if (existing) existing.value += p.estimatedCostUsd;
    else acc.set(id, { group, key, value: p.estimatedCostUsd });
  }
  return Array.from(acc.values());
};
