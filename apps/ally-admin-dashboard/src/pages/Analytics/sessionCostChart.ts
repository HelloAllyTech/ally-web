import {
  RoleplaySessionCostPoint,
  RoleplaySessionCostResponse,
  SessionCostComponentDef,
} from "@types";

import { CATEGORICAL, ColorScale } from "./chartScales";
import { ChartDatum } from "./ladderChart";
import { formatUsd } from "./unitCostChart";

/**
 * Pure transforms for the Priority tab's "Roleplay Cost per Minute" card
 * (AAQ-157).
 *
 * Two caveats must survive from the API to the pixel, so they live here where
 * they are testable without a DOM: periods logged before full session-cost
 * coverage are UNDERSTATED, and delivery calls with no price entry count as $0.
 */

/**
 * Suffix on a partial period's axis label. The asterisk is on the label, not in
 * the colour, because the label is what survives a screenshot and a colour
 * change on a stacked bar would read as a change in the mix.
 */
export const PARTIAL_MARK = " *";

/** Axis key for a period — marked when it began before full logging. */
export const periodKey = (p: Pick<RoleplaySessionCostPoint, "bucket" | "partial">): string =>
  p.partial ? `${p.bucket}${PARTIAL_MARK}` : p.bucket;

/**
 * Colour per component, by its fixed position in the server's list — never by
 * rank, so a component with no spend this period does not repaint the rest.
 */
export const componentScale = (components: readonly SessionCostComponentDef[]): ColorScale =>
  Object.fromEntries(components.map((c, i) => [c.label, CATEGORICAL[i % CATEGORICAL.length]]));

/**
 * The stack: each component's USD per minute, per period.
 *
 * The components partition the delivery cost and share one denominator, so they
 * genuinely sum to the headline and a stack is the honest reading. A null (no
 * minutes that period) is dropped rather than zeroed: a period with no practice
 * has no unit cost, and a zero-height bar would draw it as the cheapest one.
 */
export const buildPerMinuteStack = (
  points: readonly RoleplaySessionCostPoint[],
  components: readonly SessionCostComponentDef[],
): ChartDatum[] =>
  points.flatMap(p =>
    components.flatMap(c => {
      const value = p.perMinuteByComponent[c.key];
      return value === null ? [] : [{ group: c.label, key: periodKey(p), value }];
    }),
  );

/**
 * The caption sentence about coverage. Three states, because "not yet" and
 * "since a date" need different words and a missing date must never read as
 * "always complete".
 */
export const coverageCaption = (
  response: Pick<RoleplaySessionCostResponse, "fullCoverageFrom" | "points"> | undefined,
  plotted: readonly RoleplaySessionCostPoint[],
): string => {
  if (!response) return "";
  if (!plotted.some(p => p.partial)) return "";
  if (!response.fullCoverageFrom) {
    return (
      " Full per-session logging has not started yet, so every period (*) is " +
      "understated: fillers, event detectors, clip audio and the debrief were " +
      "not yet recorded against their session."
    );
  }
  return (
    ` Periods marked * began before full per-session logging started on ` +
    `${response.fullCoverageFrom.slice(0, 10)} and are understated; ` +
    `the calls missing from them cannot be recovered.`
  );
};

/** Caption fragment for unpriced calls — they add $0. Empty when none. */
export const sessionUnpricedNote = (
  response: Pick<RoleplaySessionCostResponse, "overall"> | undefined,
): string => {
  const calls = response?.overall.unpricedCalls ?? 0;
  if (calls === 0) return "";
  return (
    ` ${calls.toLocaleString()} call${calls === 1 ? "" : "s"} had no price entry ` +
    `and count as $0, so the totals are understated.`
  );
};

/** Per-minute cost with its unit, for the KPI tile and tooltips. */
export const formatPerMinute = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${formatUsd(value)}/min`;

/** Table columns for the expanded view, in display order. */
export const tableColumns = (
  periodTitle: string,
  components: readonly SessionCostComponentDef[],
): string[] => [
  periodTitle,
  "Sessions",
  "Minutes",
  "Cost",
  "Per minute",
  "Per session",
  ...components.map(c => `${c.label} /min`),
  "Analysis (excluded)",
  "Logging",
];

/** One table row per period. Numbers stay formatted as the card shows them. */
export const tableRow = (
  p: RoleplaySessionCostPoint,
  components: readonly SessionCostComponentDef[],
  inProgress: boolean,
): (string | number)[] => [
  inProgress ? `${p.bucket} (in progress)` : p.bucket,
  p.sessions,
  Math.round(p.minutes * 10) / 10,
  formatUsd(p.costUsd),
  formatUsd(p.costPerMinuteUsd),
  formatUsd(p.costPerSessionUsd),
  ...components.map(c => formatUsd(p.perMinuteByComponent[c.key])),
  formatUsd(p.excludedCostUsd),
  p.partial ? "Partial" : "Complete",
];
