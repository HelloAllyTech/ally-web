import { TokenConsumptionPoint } from "@types";

import { stableScale } from "./chartScales";

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
export const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

export interface PromptCacheStats {
  promptTokens: number;
  cachedTokens: number;
  /** cachedTokens / promptTokens across LLM-service points; 0 when no prompt tokens recorded. */
  hitRate: number;
}

/**
 * Prompt-cache hit rate across LLM-service points only (STT/TTS rows don't
 * carry cachedTokens). Verifies whether provider prompt caching is actually
 * landing, rather than just being eligible for it.
 */
export const buildPromptCacheStats = (points: TokenConsumptionPoint[]): PromptCacheStats => {
  const llmPoints = points.filter(p => p.service === "llm");
  const promptTokens = llmPoints.reduce((sum, p) => sum + p.promptTokens, 0);
  const cachedTokens = llmPoints.reduce((sum, p) => sum + p.cachedTokens, 0);
  return {
    promptTokens,
    cachedTokens,
    hitRate: promptTokens > 0 ? cachedTokens / promptTokens : 0,
  };
};

/**
 * Colour for the stacked segments (tasks when grouping by model, models when
 * grouping by task) comes from the shared {@link stableScale}, which keys on the
 * NAME rather than on its position in the current result set.
 *
 * The previous implementation assigned colours by sorted index of the groups
 * present, so a service changed colour whenever the group set changed — flipping
 * the breakdown toggle, changing the range, or a new provider appearing. A colour
 * that moves encodes nothing, and the reader has no way to know it moved.
 */
export const buildColorScale = stableScale;

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
