import { CertificationMonth, CertificationResponse } from "@types";

import { ColorScale, CONTEXT, PALETTE } from "./chartScales";

/**
 * Series names for the certification hero card.
 *
 * Both halves of the combo carry an explicit name because the legend is the only
 * thing telling the reader which series belongs to which axis. "Newly certified"
 * is the subject; "Total certified" is its running total.
 */
export const CERTIFICATION_GROUPS = {
  newlyCertified: "Newly certified",
  totalCertified: "Total certified",
} as const;

/**
 * The focal colour goes to the monthly bars, the context grey to the cumulative
 * line (chartScales §8.2: grey is for context, never the subject).
 *
 * This inverts what a reader might expect — the cumulative total is the bigger
 * number — but the bars are where the news is. The cumulative line only ever
 * rises, so it can never tell you that something changed; the month-to-month
 * bars can, and they should lead.
 */
export const CERTIFICATION_SCALE: ColorScale = {
  [CERTIFICATION_GROUPS.newlyCertified]: PALETTE.blue,
  [CERTIFICATION_GROUPS.totalCertified]: CONTEXT.line,
};

/** Colour for the L1 pipeline bars — one hue, saturation rising with progress. */
export const PIPELINE_RAMP = ["#d0e2ff", "#a6c8ff", "#78a9ff", "#4589ff", "#0f62fe"];

export interface CertificationPoint {
  group: string;
  key: string;
  value: number;
}

/** `2026-08-01` -> `Aug 2026`. Month keys are always first-of-month, UTC. */
export const monthLabel = (month: string): string => {
  const d = new Date(`${month}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
};

/**
 * Months that belong on the PLOT: every complete month, never the current one.
 *
 * The current month is still accruing crossings, so its bar can only grow. Drawn
 * beside a finished month it reads as a collapse in attainment that has not
 * happened. It stays in the expanded table, flagged, which is where a
 * provisional number belongs.
 */
export const plottableCertificationMonths = (data?: CertificationResponse): CertificationMonth[] =>
  (data?.months ?? []).filter(m => !m.partial);

/**
 * The combo series: monthly bars and the cumulative line in ONE array.
 *
 * Carbon's ComboChart takes a single flat dataset and splits it by `group`, so
 * both series are built here together — which also guarantees they cover exactly
 * the same months. Two separately-filtered arrays are how a line ends up
 * extending one bar past its bars.
 */
export const buildCertificationSeries = (months: CertificationMonth[]): CertificationPoint[] => [
  ...months.map(m => ({
    group: CERTIFICATION_GROUPS.newlyCertified,
    key: monthLabel(m.month),
    value: m.newlyCertified,
  })),
  ...months.map(m => ({
    group: CERTIFICATION_GROUPS.totalCertified,
    key: monthLabel(m.month),
    value: m.cumulativeCertified,
  })),
];

/** Pipeline bars, lowest band first — a categorical chart, so x is `group`. */
export const buildPipelineBars = (
  data?: CertificationResponse,
): { group: string; value: number }[] =>
  (data?.pipeline ?? []).map(b => ({ group: b.label, value: b.learners }));

/** Same-hue ramp over the pipeline bands: darker = closer to the threshold. */
export const buildPipelineScale = (data?: CertificationResponse): ColorScale =>
  Object.fromEntries(
    (data?.pipeline ?? []).map((b, i) => [
      b.label,
      PIPELINE_RAMP[Math.min(i, PIPELINE_RAMP.length - 1)],
    ]),
  );

/** Uncertified learners across every pipeline band — the pipeline chart's n. */
export const pipelineTotal = (data?: CertificationResponse): number =>
  (data?.pipeline ?? []).reduce((sum, b) => sum + b.learners, 0);

/**
 * The finding on the card, computed from the data rather than fixed in the
 * markup: a live tile whose direction changes cannot carry a written claim.
 *
 * Three cases, in the order a reader cares about them:
 *  - nobody certified yet — say how close the nearest learner is, because that
 *    is the only fact the chart holds and a bare zero looks like a broken query;
 *  - certified but none this month — the level is being held, not gained;
 *  - the normal case — the headline count and the latest complete month's gain.
 */
export const certificationTakeaway = (data?: CertificationResponse): string | undefined => {
  if (!data) return undefined;

  const level = data.level.label;
  const threshold = data.level.minMinutes.toLocaleString("en-US");

  if (data.certified === 0) {
    if (data.nearestMinutes <= 0) {
      return `Nobody has practised toward ${level} yet — it takes ${threshold} minutes of roleplay.`;
    }
    const percent = Math.floor((data.nearestMinutes / data.level.minMinutes) * 100);
    return (
      `Nobody has reached ${level} yet. The furthest-along learner is at ` +
      `${data.nearestMinutes.toLocaleString("en-US")} of ${threshold} minutes (${percent}%).`
    );
  }

  const plotted = plottableCertificationMonths(data);
  const latest = plotted[plotted.length - 1];
  const certified = data.certified.toLocaleString("en-US");

  if (!latest || latest.newlyCertified === 0) {
    return `${certified} ${data.certified === 1 ? "learner holds" : "learners hold"} ${level}. None newly certified in the last complete month.`;
  }

  return (
    `${certified} ${data.certified === 1 ? "learner holds" : "learners hold"} ${level} — ` +
    `${latest.newlyCertified.toLocaleString("en-US")} newly certified in ${monthLabel(latest.month)}.`
  );
};

/**
 * The counts behind the chart, for the expanded view and the export.
 *
 * Includes the current month, flagged: the plot leaves it off because it cannot
 * be compared with the months beside it, but a table row is read one at a time
 * and a provisional number with a label on it is more useful than a missing one.
 */
export const buildCertificationTable = (
  data?: CertificationResponse,
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: ["Month", "Newly certified", "Total certified"],
  rows: (data?.months ?? []).map(m => [
    m.partial ? `${monthLabel(m.month)} (in progress)` : monthLabel(m.month),
    m.newlyCertified,
    m.cumulativeCertified,
  ]),
});

/** The pipeline's counts, for the expanded view and the export. */
export const buildPipelineTable = (
  data?: CertificationResponse,
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: ["Minutes practised", "% of the way to the level", "Learners"],
  rows: (data?.pipeline ?? []).map(b => [
    b.label,
    `${Math.round(b.minFraction * 100)}–${Math.round((b.maxMinutes / (data?.level.minMinutes || 1)) * 100)}%`,
    b.learners,
  ]),
});
