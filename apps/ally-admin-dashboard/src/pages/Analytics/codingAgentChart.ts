import { CodingAgent, CodingAgentCostPoint, CodingAgentModelBreakdown } from "@types";

import { ColorScale, PALETTE } from "./chartScales";

/**
 * Fixed labels/colours for the two agents — unlike a model name (an open-ended
 * set that needs {@link buildColorScale}'s stable hashing), there are always
 * exactly these two, so a literal scale is more appropriate: the same
 * reasoning `LATENCY_STAT_SCALE` uses for its fixed p50/avg/p95 trio.
 */
export const CODING_AGENT_GROUPS: Record<CodingAgent, string> = {
  "bug-hunter": "Bug Hunter",
  builder: "Builder",
};

export const CODING_AGENT_SCALE: ColorScale = {
  [CODING_AGENT_GROUPS["bug-hunter"]]: PALETTE.blue,
  [CODING_AGENT_GROUPS.builder]: PALETTE.purple,
};

export type CodingAgentTrendDatum = { group: string; key: string; value: number };

/**
 * Bug Hunter's and Builder's cost trend as two lines, one point per bucket
 * per agent. Points are already gap-filled to real zeros server-side (see
 * `CodingAgentCostAnalyticsService`) — a quiet day is a real $0, not a
 * missing point, unlike the latency trend this file's sibling builds.
 */
export function buildCodingAgentTrend(points: CodingAgentCostPoint[]): CodingAgentTrendDatum[] {
  return points.flatMap(point => [
    {
      group: CODING_AGENT_GROUPS["bug-hunter"],
      key: point.bucket,
      value: point.costUsd["bug-hunter"],
    },
    { group: CODING_AGENT_GROUPS.builder, key: point.bucket, value: point.costUsd.builder },
  ]);
}

export type ModelBreakdownDatum = { group: string; value: number };

/** One agent's whole-window spend by model — already aggregated server-side. */
export function buildModelBreakdown(
  rows: CodingAgentModelBreakdown[],
  agent: CodingAgent,
): ModelBreakdownDatum[] {
  return rows
    .filter(r => r.agent === agent)
    .map(r => ({ group: r.model, value: r.costUsd }))
    .sort((a, b) => b.value - a.value);
}
