import { ReactNode } from "react";

import { ScaleTypes } from "@carbon/charts";
import { Maximize } from "@icons";

import { Button, InlineNotification, SkeletonPlaceholder, Tile } from "@ally-ui-mono/ui-shared";

import { CONTEXT, ColorScale, PALETTE, formatDelta } from "./chartScales";

/**
 * Shared analytics chart kit — the single source of truth for how charts in the
 * analytics dashboard look and behave. Use {@link ChartCard} to wrap every chart
 * (title/caption/source + loading/error/empty/thin-data handling) and the option
 * factories below so every chart shares the same axes/legend/toolbar defaults.
 * Add new chart types here rather than hand-rolling option objects.
 *
 * The factories deliberately make the honest choice the easy one:
 *  - `colorScale` is REQUIRED. Omitting it used to fall through to Carbon's
 *    default palette, where a colour's meaning shifts with the data; 14 charts
 *    did exactly that. Single-measure charts pass `single(label)`.
 *  - Time series must use {@link timeBarOpts} / {@link lineOpts} (x = `key`);
 *    only genuinely categorical comparisons use {@link barOpts} (x = `group`).
 *    Mapping a per-bucket series through `barOpts` collapses every bucket onto
 *    one x-category — that was a live bug on two tabs.
 *  - Lines default to `curveLinear`. Monotone smoothing invents values between
 *    measured points and glides across gaps in a sparse series with no visual
 *    hint that data is missing.
 */

export const CHART_HEIGHT = "300px";

/** Height for the expanded (dense-tier) view in {@link ChartDetailModal}. */
export const CHART_HEIGHT_EXPANDED = "460px";

/**
 * Minimum sample size before a derived score is shown as a confident number.
 * Below this, surfaces render "not enough data" instead — a mean over a handful
 * of LLM-judged sessions is noise wearing a decimal point.
 *
 * Documented in the wiki (product/data-visualisation.md, principle 4). Change it
 * there and here together.
 */
export const MIN_N_FOR_SCORE = 20;

export { PALETTE } from "./chartScales";
export type { ColorScale } from "./chartScales";

interface AxisOptsBase {
  leftTitle?: string;
  bottomTitle?: string;
  /**
   * Required — see the file header. Use `single(label)` for one-measure charts
   * and a semantic scale from ./chartScales for anything with real categories.
   */
  colorScale: ColorScale;
  legend?: boolean;
  height?: string;
  /** Explicit [min, max] for the value axis. Use for bounded scales (a 1–5
   *  rating, a 0–100 score) so the plot shows where the value sits on the scale
   *  the reader knows, instead of against an arbitrary data-driven ceiling. */
  domain?: [number, number];
  /** Extra options merged last for special cases (e.g. axis thresholds). */
  extra?: Record<string, unknown>;
}

/** One-measure colour scale: the chart's single series in the focal accent. */
export const single = (label: string, color: string = PALETTE.blue): ColorScale => ({
  [label]: color,
});

/** Grey a series that is context rather than subject (§8.2). */
export const context = (label: string): ColorScale => ({ [label]: CONTEXT.line });

/**
 * The value axis.
 *
 * `includeZero` is forced on whenever there is no explicit `domain`, because
 * these axes carry counts, rates and durations — all of which have a meaningful
 * zero. Left to fit the data, Carbon starts the axis just below the minimum, so a
 * series of 1s and 2s sits halfway up the plot and reads as far from zero as a
 * series of 100s and 200s would.
 *
 * An explicit `domain` wins, which is how the bounded score/rating charts get
 * their full rubric range and how the detail modal offers a zoomed view.
 */
const valueAxis = (title: string, domain?: [number, number], stacked = false) => ({
  mapsTo: "value",
  scaleType: ScaleTypes.LINEAR,
  title,
  ...(stacked ? { stacked: true } : {}),
  ...(domain ? { domain } : { includeZero: true }),
});

const labelAxis = (title: string, mapsTo: string) => ({
  mapsTo,
  scaleType: ScaleTypes.LABELS,
  title,
});

/**
 * Time-series line chart (x = `key`, y = `value`).
 *
 * `curve` defaults to linear: these are measured points, and a null value is a
 * real gap that the reader must be able to see.
 */
export const lineOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = true,
  height = CHART_HEIGHT,
  domain,
  curve = "curveLinear",
  extra = {},
}: AxisOptsBase & { curve?: string }) => ({
  height,
  axes: {
    left: valueAxis(leftTitle, domain),
    bottom: labelAxis(bottomTitle, "key"),
  },
  curve,
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/**
 * Categorical bar chart (x = `group`, y = `value`) — one bar per category, for
 * comparisons across things that have no order in time. For a per-bucket series
 * use {@link timeBarOpts}.
 */
export const barOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  domain,
  extra = {},
}: AxisOptsBase) => ({
  height,
  axes: {
    left: valueAxis(leftTitle, domain),
    bottom: labelAxis(bottomTitle, "group"),
  },
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/**
 * Time-bucketed bar chart (x = `key`, y = `value`) — one bar per period.
 *
 * This exists because `barOpts` maps the x-axis to `group`, so a series built as
 * `{group: "<constant>", key: <bucket>}` renders every bucket stacked on a
 * single x-category labelled with the constant. Any chart whose x-axis is time
 * belongs here.
 */
export const timeBarOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  domain,
  extra = {},
}: AxisOptsBase) => ({
  height,
  axes: {
    left: valueAxis(leftTitle, domain),
    bottom: labelAxis(bottomTitle, "key"),
  },
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/**
 * Horizontal bar chart (y = `group` labels, x = `value`).
 *
 * Use whenever category labels are long or free-text — org names, language
 * names, model ids, multi-word error categories. In a 300px-tall vertical chart
 * Carbon rotates and truncates those labels, so the reader cannot tell which bar
 * is which.
 */
export const hBarOpts = ({
  leftTitle = "",
  bottomTitle = "Value",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  domain,
  extra = {},
}: AxisOptsBase) => ({
  height,
  axes: {
    left: labelAxis(leftTitle, "group"),
    bottom: valueAxis(bottomTitle, domain),
  },
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/** Stacked bar chart over time (x = `key`, stacked y = `value`). */
export const stackedBarOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = true,
  height = CHART_HEIGHT,
  domain,
  extra = {},
}: AxisOptsBase) => ({
  height,
  axes: {
    left: valueAxis(leftTitle, domain, true),
    bottom: labelAxis(bottomTitle, "key"),
  },
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/**
 * Donut chart (group = `group`, value = `value`).
 *
 * Keep to ~4 slices — people estimate wedge area badly, and past a handful of
 * slices a sorted horizontal bar chart is strictly easier to read. Group the
 * tail into "Other" rather than adding slices.
 */
export const donutOpts = ({
  centerLabel = "",
  colorScale,
  height = CHART_HEIGHT,
  extra = {},
}: {
  centerLabel?: string;
  colorScale: ColorScale;
  height?: string;
  extra?: Record<string, unknown>;
}) => ({
  height,
  resizable: true,
  donut: { center: { label: centerLabel } },
  color: { scale: colorScale },
  toolbar: { enabled: false },
  ...extra,
});

/* -------------------------------------------------------------------------- */
/* Sample-size + provenance helpers                                           */
/* -------------------------------------------------------------------------- */

/** "n = 1,234 sessions" — the denominator, spelled out, on the surface. */
export const formatN = (n: number | null | undefined, unit = ""): string | undefined => {
  if (n === null || n === undefined) return undefined;
  return `n = ${n.toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

/** True when a derived score has too little data behind it to state plainly. */
export const isThinSample = (n: number | null | undefined, minN = MIN_N_FOR_SCORE): boolean =>
  n !== null && n !== undefined && n < minN;

/**
 * Caption fragment naming the full scale a bounded chart is plotted against.
 *
 * Stating the scale is what makes a flat-looking line honest: the reader can see
 * that "barely moves" is a fact about the metric and not a squashed axis, and can
 * tell where on the scale the value actually sits.
 */
export const boundedDomainNote = ([min, max]: [number, number]): string =>
  `Plotted on the full ${min}–${max} scale.`;

/**
 * Build the provenance line every tile carries: what the number is derived from,
 * over what window, from how many observations, as of when.
 *
 * Tiles get screenshotted into decks and read weeks later; a tile without
 * provenance becomes an unanswerable question. This is also what makes an export
 * carry its context.
 */
export const buildSource = ({
  derivation,
  window,
  n,
  nUnit,
  asOf,
  extra,
}: {
  derivation: string;
  window?: string;
  n?: number | null;
  nUnit?: string;
  asOf?: string;
  extra?: string;
}): string =>
  [derivation, window, formatN(n, nUnit), extra, asOf ? `as of ${asOf}` : undefined]
    .filter(Boolean)
    .join(" · ");

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Minimal trend line for a KPI tile. Nulls break the path, so a gap in the
 * series reads as a gap rather than a straight line through missing data.
 *
 * No axes, no labels — this answers "which way is it going", and the tile's
 * value answers "where is it now". Exact values live in the chart below.
 */
export const Sparkline = ({
  values,
  color = PALETTE.blue,
  width = 88,
  height = 24,
  label,
}: {
  values: (number | null)[];
  color?: string;
  width?: number;
  height?: number;
  label?: string;
}) => {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return null;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const y = (v: number) => height - 1 - ((v - min) / span) * (height - 2);

  // Split into contiguous runs so nulls leave visible gaps.
  const runs: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) runs.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (current.length > 1) runs.push(current.join(" "));

  const lastIdx = values.reduce((acc, v, i) => (v !== null ? i : acc), -1);
  const lastVal = lastIdx >= 0 ? values[lastIdx] : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? "Trend"}
      className="overflow-visible"
    >
      {runs.map(points => (
        <polyline
          key={points}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      {lastVal !== null && (
        <circle cx={(lastIdx * step).toFixed(1)} cy={y(lastVal).toFixed(1)} r="2" fill={color} />
      )}
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* KPI tile                                                                   */
/* -------------------------------------------------------------------------- */

interface KpiTileProps {
  label: string;
  /** Pre-formatted by the caller (locale strings, "%" suffixes, em-dash). */
  value: string;
  /** Sample size behind the value. Rendered as "n = …" under the number. */
  n?: number | null;
  nUnit?: string;
  /** Below this, the tile shows "not enough data" instead of the value. */
  minN?: number;
  /** Change vs the comparison window. Needs `comparisonLabel` to mean anything. */
  delta?: number | null;
  /** e.g. "vs previous 30 days" — a delta without its basis is meaningless. */
  comparisonLabel?: string;
  /** False for metrics where a rise is bad (error rates, latency, cost). */
  higherIsBetter?: boolean;
  deltaSuffix?: string;
  deltaDecimals?: number;
  /** Trend behind the headline number. */
  spark?: (number | null)[];
  loading?: boolean;
}

/**
 * A single KPI stat tile: label, value, sample size, and change vs the
 * comparison window with its basis named.
 *
 * The delta carries an arrow as well as a colour so the direction survives
 * greyscale and colour-blindness, and its good/bad sense follows
 * `higherIsBetter` rather than assuming "up is good".
 */
export const KpiTile = ({
  label,
  value,
  n,
  nUnit,
  minN,
  delta,
  comparisonLabel,
  higherIsBetter = true,
  deltaSuffix = "",
  deltaDecimals = 1,
  spark,
  loading = false,
}: KpiTileProps) => {
  const thin = minN !== undefined && isThinSample(n, minN);
  const d = thin
    ? null
    : formatDelta(delta, { higherIsBetter, suffix: deltaSuffix, decimals: deltaDecimals });

  return (
    <Tile className="analytics-kpi">
      <p className="text-sm text-typography-600 mb-2">{label}</p>

      {loading ? (
        <SkeletonPlaceholder className="analytics-kpi-skeleton" />
      ) : thin ? (
        <>
          <p className="text-lg font-medium text-typography-500">Not enough data</p>
          <p className="text-xs text-typography-500 mt-1">
            {formatN(n, nUnit)} · need {minN}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <p className="text-3xl font-medium text-typography-900">{value}</p>
            {spark && spark.length > 1 && <Sparkline values={spark} label={`${label} trend`} />}
          </div>
          <div className="mt-1 min-h-4">
            {d && (
              <span className="text-xs font-medium" style={{ color: d.color }}>
                {d.arrow} {d.label}
                {comparisonLabel && (
                  <span className="text-typography-500 font-normal"> {comparisonLabel}</span>
                )}
              </span>
            )}
            {!d && n !== null && n !== undefined && (
              <span className="text-xs text-typography-500">{formatN(n, nUnit)}</span>
            )}
          </div>
        </>
      )}
    </Tile>
  );
};

/* -------------------------------------------------------------------------- */
/* Chart card                                                                 */
/* -------------------------------------------------------------------------- */

interface ChartCardProps {
  /** Neutral metric name. The finding goes in `takeaway`, computed from the
   *  data — a live tile whose direction changes cannot carry a fixed claim. */
  title?: string;
  /** Sub-text under the title: what the number means, caveats, denominators. */
  caption?: string;
  /**
   * Provenance line: derivation · window · n · as-of. Build it with
   * {@link buildSource}. Every tile should carry one — tiles get exported and
   * screenshotted, and one without provenance is unanswerable later.
   */
  source?: string;
  /** Computed finding, e.g. "↓ 8% vs previous 30 days". */
  takeaway?: ReactNode;
  loading?: boolean;
  error?: boolean;
  /** True when there's no data to show — renders a dashed placeholder. */
  empty?: boolean;
  /** Sample size behind the chart; with `minN`, drives the thin-data state. */
  n?: number | null;
  nUnit?: string;
  minN?: number;
  onRetry?: () => void;
  /** Opens the dense-tier view (bigger chart, zoomed axis, table, export). */
  onExpand?: () => void;
  errorTitle?: string;
  errorSubtitle?: string;
  emptyText?: string;
  /** Span 2 columns in a grid (for wide charts). */
  wide?: boolean;
  /**
   * Render without the outer {@link Tile} (a plain `<div>` instead) — for
   * multi-panel layouts that already live inside one shared Tile.
   */
  bare?: boolean;
  height?: string;
  children: ReactNode;
}

/**
 * One wrapper for every analytics chart: title/caption/takeaway header, the
 * visual field, a provenance footer, and uniform loading, error, empty and
 * thin-data states.
 *
 * Visual weighting follows roughly 12/8/75/5 (title/subtitle/plot/source) — the
 * plot dominates and everything else serves it.
 */
export const ChartCard = ({
  title,
  caption,
  source,
  takeaway,
  loading = false,
  error = false,
  empty = false,
  n,
  nUnit,
  minN,
  onRetry,
  onExpand,
  errorTitle = "Couldn't load this chart",
  errorSubtitle = "There was a problem fetching the data.",
  emptyText = "No data for this range",
  wide = false,
  bare = false,
  height = CHART_HEIGHT,
  children,
}: ChartCardProps) => {
  const thin = minN !== undefined && isThinSample(n, minN);

  const visualField = loading ? (
    <SkeletonPlaceholder className="analytics-chart-skeleton" />
  ) : error ? (
    <div className="flex flex-col items-start gap-4">
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={errorTitle}
        subtitle={errorSubtitle}
      />
      {onRetry && (
        <Button kind="tertiary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  ) : thin ? (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-[#e0e0e0] text-center"
      style={{ height }}
    >
      <p className="text-sm font-medium text-typography-600">Not enough data to show a trend</p>
      <p className="text-xs text-typography-500">
        {formatN(n, nUnit)} · need at least {minN}
      </p>
    </div>
  ) : empty ? (
    <div
      className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500"
      style={{ height }}
    >
      {emptyText}
    </div>
  ) : (
    children
  );

  const body = (
    <>
      {(title || onExpand) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-medium text-typography-900 truncate" title={title}>
                {title}
              </h3>
            )}
            {caption && <p className="text-xs text-typography-500">{caption}</p>}
          </div>
          {onExpand && (
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription={title ? `Expand ${title}` : "Expand chart"}
              tooltipPosition="left"
              renderIcon={Maximize}
              onClick={onExpand}
            />
          )}
        </div>
      )}
      {takeaway && <div className="text-xs font-medium mt-1">{takeaway}</div>}
      <div className="mb-2" />
      {visualField}
      {source && <p className="mt-2 text-[11px] leading-tight text-typography-500">{source}</p>}
    </>
  );

  if (bare) return <div>{body}</div>;
  return <Tile className={wide ? "xl:col-span-2" : undefined}>{body}</Tile>;
};
