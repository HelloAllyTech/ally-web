import {
  OrgEngagementResponse,
  StickinessResponse,
  UsageLadderGrain,
  UsageLadderResponse,
} from "@types";

import { CONTEXT, ColorScale, PALETTE, sequentialScale } from "./chartScales";
import { FunnelStage } from "./FunnelBars";

/**
 * Pure transforms for the usage-ladder, stickiness and org-engagement cards.
 *
 * Kept out of the components so the honesty rules they encode — which series may
 * never be stacked, which share is suppressed, what a funnel step's denominator
 * is — are unit-testable without a DOM.
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
export const periodLabel = (period: string, grain: UsageLadderGrain): string => {
  const date = new Date(`${period}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return period;
  const year = date.getUTCFullYear();
  if (grain === "quarter") {
    return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${year}`;
  }
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${year}`;
};

/**
 * Ordered ramp over the ladder: the higher the rung, the darker the blue.
 *
 * A ramp rather than distinct hues because the rungs ARE ordered — five
 * unrelated colours would make L2 and L4 look like different kinds of thing
 * rather than more and less of one thing.
 */
export const ladderScale = (labels: string[]): ColorScale => sequentialScale(labels);

/**
 * Learners newly reaching each rung, per period — the FLOW ("how many L3s did we
 * produce in Q2").
 *
 * Returned as grouped bars, and the caller must not stack them. The rungs are
 * nested, so a learner who went from zero to twenty hours in one quarter crossed
 * three of them and is counted in three series; stacking would present that as
 * three people. The current (partial) period is dropped — it can only rise, so
 * it would draw as a fall.
 */
export const buildAttainmentSeries = (response: UsageLadderResponse | undefined): ChartDatum[] => {
  if (!response) return [];
  return response.periods
    .filter(p => !p.partial)
    .flatMap(p =>
      response.levels.map((level, i) => ({
        group: level.label,
        key: periodLabel(p.period, response.grain),
        value: p.newlyReached[i] ?? 0,
      })),
    );
};

/**
 * Learners holding each rung, per period — the STOCK.
 *
 * Monotonic by construction (a rung is never lost), so a fall in this series
 * would be a bug rather than a finding. Lines, not bars: the reader is following
 * a level over time, not comparing periods.
 */
export const buildCumulativeLadderSeries = (
  response: UsageLadderResponse | undefined,
): ChartDatum[] => {
  if (!response) return [];
  return response.periods
    .filter(p => !p.partial)
    .flatMap(p =>
      response.levels.map((level, i) => ({
        group: level.label,
        key: periodLabel(p.period, response.grain),
        value: p.cumulative[i] ?? 0,
      })),
    );
};

/** The account-created → L1 → … → L5 funnel, as of now. */
export const buildLadderFunnelStages = (response: UsageLadderResponse | undefined): FunnelStage[] =>
  (response?.funnel ?? []).map(step => ({
    label: step.label,
    reached: step.learners,
    ofEnteredPct: step.ofTopPct,
    ofPreviousPct: step.ofPreviousPct,
  }));

/** The org-created → L1 → … → L4 funnel. */
export const buildOrgFunnelStages = (response: OrgEngagementResponse | undefined): FunnelStage[] =>
  (response?.funnel ?? []).map(step => ({
    label: step.label,
    reached: step.orgs,
    ofEnteredPct: step.ofTopPct,
    ofPreviousPct: step.ofPreviousPct,
  }));

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

/**
 * Caption for the org ladder, stating the property that makes it easy to
 * misread.
 *
 * A total-minutes ladder ranks a 500-seat org above a 5-seat org practising
 * three times as hard per person. That is the intended reading — it answers "how
 * much practice has this account bought us" — but a reader who assumes it means
 * adoption depth will draw the wrong conclusion about a small, engaged customer.
 */
export const ORG_LADDER_CAVEAT =
  "Rungs are TOTAL practice minutes across an org's learners, so a large org " +
  "clears a rung more easily than a small one practising harder. For per-seat " +
  "adoption, see Org health.";

/** Caption for the ladder, keeping it distinct from the certification. */
export const ladderVsCertificationNote = (certificationMinMinutes: number): string =>
  `Usage levels are an internal engagement scale, separate from Ally ` +
  `Certification (${certificationMinMinutes.toLocaleString("en-US")} lifetime ` +
  `minutes). A rung is not a certification.`;

/**
 * Whether a ladder response has anything to plot.
 *
 * A gap-filled axis of zeros is not empty in the "no rows" sense, so an
 * `!points.length` check would keep showing a chart of nothing. This asks
 * whether any learner has reached any rung.
 */
export const hasLadderData = (response: UsageLadderResponse | undefined): boolean =>
  (response?.periods ?? []).some(p => p.cumulative.some(v => v > 0));
