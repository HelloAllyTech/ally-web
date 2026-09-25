import { OrgEngagementResponse, StickinessResponse } from "@types";

import { CONTEXT, ColorScale, PALETTE } from "./chartScales";
import { FunnelStage } from "./FunnelBars";

/**
 * Pure transforms for the stickiness and org-engagement cards.
 *
 * Kept out of the components so the honesty rules they encode — which share is
 * suppressed, what a funnel step's denominator is — are unit-testable without a
 * DOM.
 */

export interface ChartDatum {
  group: string;
  key?: string;
  value: number | null;
}

/**
 * Funnels here emit {@link FunnelStage} rows for the shared `FunnelBars` widget,
 * carrying the SERVER's percentages rather than letting the widget recompute
 * them. That is not a style choice: the server suppresses a share whose
 * denominator falls below the minimum group size, and recomputing on the client
 * would silently undo the suppression.
 */

/** "2024-04-01" → "Apr 2024"; a quarter start → "Q2 2024". */
export const periodLabel = (period: string, grain: "month" | "quarter"): string => {
  const date = new Date(`${period}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  const year = date.getUTCFullYear();
  if (grain === "quarter") {
    return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${year}`;
  }
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${year}`;
};

/** The stickiness funnel: practised once → came back → came back again. */
export const buildStickinessStages = (response: StickinessResponse | undefined): FunnelStage[] =>
  (response?.steps ?? []).map(step => ({
    label: step.label,
    reached: step.learners,
    ofEnteredPct: step.ofTopPct,
    ofPreviousPct: step.ofPreviousPct,
  }));

/**
 * Where the stickiness curve flattens — the deepest rung that still holds at
 * least `threshold`% of the people who practised once.
 *
 * A one-line reading of a ten-step funnel, for the card's takeaway. Null when
 * the shares are suppressed or nobody practised, in which case the card says
 * nothing rather than something confident about four people.
 */
export const stickinessPlateau = (
  response: StickinessResponse | undefined,
  threshold = 25,
): { step: number; pct: number } | null => {
  const steps = response?.steps ?? [];
  let deepest: { step: number; pct: number } | null = null;
  for (const step of steps) {
    if (step.ofTopPct === null || step.ofTopPct < threshold) break;
    deepest = { step: step.step, pct: step.ofTopPct };
  }
  return deepest;
};

/**
 * Orgs active per month, as a count and a share.
 *
 * Both series on one card because either alone misleads: a rising count with a
 * falling share means we are signing orgs faster than we are activating them,
 * which reads as growth on the count and as decline on the share. The share is
 * null before any org existed rather than 0%.
 */
export const buildOrgActivitySeries = (
  response: OrgEngagementResponse | undefined,
): { counts: ChartDatum[]; shares: ChartDatum[] } => {
  const points = response?.activityTrend ?? [];
  return {
    counts: points.flatMap(p => [
      {
        group: "Active orgs",
        key: periodLabel(p.month, "month"),
        value: p.activeOrgs,
      },
      {
        group: "All orgs",
        key: periodLabel(p.month, "month"),
        value: p.totalOrgs,
      },
    ]),
    shares: points.map(p => ({
      group: "Active share",
      key: periodLabel(p.month, "month"),
      value: p.activeSharePct,
    })),
  };
};

/** Active vs all orgs: the subject leads, the population is context. */
export const ORG_ACTIVITY_SCALE: ColorScale = {
  "Active orgs": PALETTE.blue,
  "All orgs": CONTEXT.line,
};

export const ORG_SHARE_SCALE: ColorScale = {
  "Active share": PALETTE.teal,
};
