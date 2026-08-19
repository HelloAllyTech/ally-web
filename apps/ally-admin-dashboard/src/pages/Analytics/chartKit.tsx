import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { ScaleTypes } from "@carbon/charts";
import { Maximize } from "@icons";

import {
  Button,
  CarbonDropdown as Dropdown,
  InlineNotification,
  SkeletonPlaceholder,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { AnalyticsBucket } from "@types";

import { GROUPINGS, GROUPING_LABEL } from "./analyticsGrouping";
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
 *  - Any plot whose number of x-axis categories grows with the data goes inside
 *    {@link ScrollableChart}. Carbon fits every category into whatever width it
 *    is given, so a long series does not overflow — it compresses, until the tick
 *    labels overlap into a grey smear and the bars are a pixel wide.
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
  /**
   * Explicit tick values for the value axis. Build with
   * {@link integerTickValues} for any axis counting PEOPLE or events: left to
   * itself, D3 subdivides a 0–3 range into halves, and "1.5 learners certified"
   * is not a quantity that exists.
   */
  valueTicks?: number[];
  /** Extra options merged last for special cases (e.g. axis thresholds). */
  extra?: Record<string, unknown>;
}

/**
 * Whole-number tick values from 0 to `max`, at most `maxTicks` of them.
 *
 * For count axes. A count has no fractional values, so an axis that offers them
 * is inviting the reader to read one — and on the small ranges these charts
 * often have (three certified learners, two orgs), D3's default subdivision
 * produces nothing but fractions. Always spans zero, and always includes `max`
 * so the tallest bar has a labelled tick to sit against.
 */
export const integerTickValues = (max: number, maxTicks = 8): number[] => {
  const top = Math.max(1, Math.ceil(max));
  const step = Math.max(1, Math.ceil(top / maxTicks));
  const values: number[] = [];
  for (let v = 0; v <= top; v += step) values.push(v);
  if (values[values.length - 1] !== top) values.push(top);
  return values;
};

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
const valueAxis = (
  title: string,
  domain?: [number, number],
  stacked = false,
  valueTicks?: number[],
) => ({
  mapsTo: "value",
  scaleType: ScaleTypes.LINEAR,
  title,
  ...(stacked ? { stacked: true } : {}),
  ...(domain ? { domain } : { includeZero: true }),
  ...(valueTicks ? { ticks: { values: valueTicks } } : {}),
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
  valueTicks,
  extra = {},
}: AxisOptsBase) => ({
  height,
  axes: {
    left: labelAxis(leftTitle, "group"),
    bottom: valueAxis(bottomTitle, domain, false, valueTicks),
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
 * Dual-axis combo: bars on the left axis, a line on the right (x = `key`).
 *
 * **A second value axis is normally a lie**, and the rest of this kit does not
 * offer one: two series on two scales can be made to cross wherever the author
 * wants, so the reader sees a relationship that the numbers do not contain. The
 * cumulative-users chart on the Highlights tab is deliberately a SEPARATE tile
 * for exactly this reason.
 *
 * This factory exists for the one case where the objection does not apply: when
 * the right-axis series is the RUNNING TOTAL of the left-axis one. They are then
 * the same quantity at two aggregations, not two quantities being implicitly
 * correlated, and the only thing the second scale does is stop a total that is
 * two orders of magnitude larger from flattening the per-period bars into the
 * axis. Do not reach for it otherwise — if the two series could in principle
 * move independently, they belong in two tiles.
 *
 * Both axis titles are required rather than defaulted: an unlabelled second axis
 * is the specific failure this whole comment is about.
 */
export const comboOpts = ({
  barGroup,
  lineGroup,
  leftTitle,
  rightTitle,
  bottomTitle = "",
  colorScale,
  legend = true,
  height = CHART_HEIGHT,
  valueTicks,
  rightTicks,
  extra = {},
}: Omit<AxisOptsBase, "leftTitle" | "domain"> & {
  /** Series name plotted as bars against the left axis. */
  barGroup: string;
  /** Series name plotted as a line against the right axis. */
  lineGroup: string;
  leftTitle: string;
  rightTitle: string;
  /** Explicit ticks for the RIGHT axis; `valueTicks` covers the left one. */
  rightTicks?: number[];
}) => ({
  height,
  axes: {
    left: {
      ...valueAxis(leftTitle, undefined, false, valueTicks),
      correspondingDatasets: [barGroup],
      // Carbon needs one axis flagged as primary; the bars are the subject.
      main: true,
    },
    right: {
      ...valueAxis(rightTitle, undefined, false, rightTicks),
      correspondingDatasets: [lineGroup],
    },
    bottom: labelAxis(bottomTitle, "key"),
  },
  comboChartTypes: [
    { type: "simple-bar", correspondingDatasets: [barGroup] },
    {
      type: "line",
      // Points on: the line is monthly, and without markers a reader cannot
      // tell a flat stretch from a segment drawn across missing months.
      options: { points: { enabled: true } },
      correspondingDatasets: [lineGroup],
    },
  ],
  curve: "curveLinear",
  color: { scale: colorScale },
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/**
 * Scatter plot with TWO measured axes (x = `x`, y = `y`).
 *
 * The only chart type here whose x-axis is a quantity rather than a time bucket
 * or a category, which is why it cannot borrow the factories above: it exists for
 * the "is there a relationship between these two measures?" question, where the
 * answer is a shape in a plane and neither axis is the subject on its own.
 *
 * Two cautions worth stating where the factory lives, since a scatter is the
 * easiest chart to over-read:
 *  - It shows correlation persuasively enough that readers make the causal leap
 *    unprompted. The caption has to say what the chart does and does not claim.
 *  - Colour must not be assigned per point. One point per entity is exactly the
 *    case where colour-by-identity looks informative and encodes nothing; pass a
 *    single-group scale and let the tooltip and the expanded table name the
 *    points.
 */
export const scatterOpts = ({
  leftTitle = "Value",
  bottomTitle = "Value",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  domain,
  xDomain,
  extra = {},
}: AxisOptsBase & { xDomain?: [number, number] }) => ({
  height,
  axes: {
    left: {
      mapsTo: "y",
      scaleType: ScaleTypes.LINEAR,
      title: leftTitle,
      ...(domain ? { domain } : { includeZero: true }),
    },
    bottom: {
      mapsTo: "x",
      scaleType: ScaleTypes.LINEAR,
      title: bottomTitle,
      ...(xDomain ? { domain: xDomain } : { includeZero: true }),
    },
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
/* Horizontal scrolling                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Minimum horizontal room one x-axis category gets before the plot scrolls
 * instead of compressing.
 *
 * 28px is roughly what a rotated `2026-06-09` tick label needs to stand clear of
 * its neighbours, and enough for a bar to read as a bar. Below that Carbon keeps
 * fitting categories in — it never overflows — so fifty days in a half-width card
 * renders as hairline bars under a solid band of overlapping dates, which is the
 * state this constant exists to prevent.
 */
export const MIN_CATEGORY_WIDTH = 28;

/** Width the value axis (title + tick labels) takes before the plot starts. */
const AXIS_GUTTER = 88;

/** The shape {@link ScrollableChart} needs to count a series' x categories. */
type ChartDatum = { key?: string | number | null; group?: string | number | null };

/**
 * Gives a plot the width its x-axis categories actually need, and scrolls the
 * card sideways when that is more than the card has.
 *
 * Wrap every chart whose category count grows with the data — anything bucketed
 * by time, and any categorical axis over an open-ended set (models, orgs). It is
 * a no-op when the categories fit: the inner `min-width` only exceeds the
 * container once there are enough of them, so a chart with six bars is untouched
 * and no scrollbar appears.
 *
 * Two honest costs, both stated on the surface rather than discovered:
 *  - **The value axis scrolls with the plot.** Carbon draws axis and plot in one
 *    SVG, so there is nothing to pin. Hover gives the exact value, and the
 *    expanded view's table gives all of them.
 *  - **Part of the range is off-screen.** The note below the plot says so; a plot
 *    cut off at the card edge with no caption reads as the whole series.
 *
 * The alternative — thinning ticks to every nth label — keeps everything in view
 * but shrinks the marks themselves, and a chart whose bars are narrower than the
 * gap between them stops being readable at any tick density.
 */
export const ScrollableChart = ({
  data,
  on = "key",
  minCategoryWidth = MIN_CATEGORY_WIDTH,
  children,
}: {
  /** The series being plotted — the same array handed to the chart. */
  data: readonly ChartDatum[];
  /** Which field the x-axis maps to: `key` for time buckets, `group` for
   *  {@link barOpts}-style categorical bars. */
  on?: "key" | "group";
  minCategoryWidth?: number;
  children: ReactNode;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const categories = useMemo(() => new Set(data.map(d => d[on])).size, [data, on]);
  const minWidth = categories * minCategoryWidth + AXIS_GUTTER;

  // Measured rather than derived from the category count: whether the plot
  // actually overflows depends on the card's width, which changes with the
  // viewport and the grid breakpoint, and the note and the tab stop below must
  // only appear when there is genuinely something out of view.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const measure = () => setOverflowing(el.scrollWidth - el.clientWidth > 1);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minWidth]);

  return (
    <>
      <div
        ref={scroller}
        className="analytics-chart-scroll"
        // Focusable only while it overflows: a scroll container is unreachable by
        // keyboard without a tab stop, and a tab stop on a container with nothing
        // to scroll is just an extra press on the way to the next control.
        {...(overflowing
          ? { tabIndex: 0, role: "group", "aria-label": "Chart, scrollable horizontally" }
          : {})}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
      {overflowing && (
        <p className="mt-1 text-[11px] leading-tight text-typography-500">
          Scroll sideways for the rest of the range — the value axis scrolls with the plot.
        </p>
      )}
    </>
  );
};

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
  /**
   * What the number actually measures, in one line — the tile's equivalent of a
   * {@link ChartCard} caption. Rendered on the face of the tile rather than in a
   * tooltip: a definition that only appears on hover never reaches the
   * screenshot that ends up in a board deck.
   */
  description?: string;
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
 * A single KPI stat tile: label, value, sample size, change vs the comparison
 * window with its basis named, and a one-line definition of the metric.
 *
 * The delta carries an arrow as well as a colour so the direction survives
 * greyscale and colour-blindness, and its good/bad sense follows
 * `higherIsBetter` rather than assuming "up is good".
 *
 * The definition sits BELOW the number, not above it: the value is the focal
 * element and prose over the top of it would compete for that. It is still on
 * the face of the tile, because "what is this counting?" is the question a KPI
 * strip most often leaves unanswered.
 */
export const KpiTile = ({
  label,
  description,
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

      {/* Rendered in every state, including loading — it describes the metric,
          not the value, so hiding it until data arrives would only shift the
          layout under the reader. */}
      {description && (
        <p className="mt-2 text-xs leading-snug text-typography-500">{description}</p>
      )}
    </Tile>
  );
};

/* -------------------------------------------------------------------------- */
/* Grouping picker                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The per-chart "group by" control, for {@link ChartCard.controls}.
 *
 * Lives on the chart rather than the page because the grain belongs to the
 * question the chart asks — see the header of ./analyticsGrouping. Rendered as a
 * small dropdown rather than a four-way switcher so it stays inside a card
 * header at the narrowest column width the grid produces.
 */
export const GroupingPicker = ({
  id,
  value,
  onChange,
  options = GROUPINGS,
}: {
  id: string;
  value: AnalyticsBucket;
  onChange: (grouping: AnalyticsBucket) => void;
  /** Restrict the offered grains where a coarser or finer one is meaningless. */
  options?: AnalyticsBucket[];
}) => {
  const items = options.map(g => ({ id: g, label: GROUPING_LABEL[g] }));
  const selected = items.find(i => i.id === value) ?? items[0];

  return (
    <div className="w-28 shrink-0">
      <Dropdown
        id={id}
        size="sm"
        titleText="Group by"
        hideLabel
        label="Group by"
        // The chosen grain is the axis title too, so the control repeats it
        // rather than being the only place it appears.
        items={items}
        selectedItem={selected}
        itemToString={item => item?.label ?? ""}
        onChange={({ selectedItem }) => {
          if (selectedItem) onChange(selectedItem.id);
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Chart card                                                                 */
/* -------------------------------------------------------------------------- */

interface ChartCardProps {
  /** Neutral metric name. The finding goes in `takeaway`, computed from the
   *  data — a live tile whose direction changes cannot carry a fixed claim.
   *
   *  ReactNode rather than string so a title can carry an adornment — the help
   *  tooltip that holds a metric's measurement caveats, for instance. Plain
   *  strings still work and remain the common case. */
  title?: React.ReactNode;
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
  /**
   * Per-chart controls in the header — a {@link GroupingPicker}, typically.
   * Rendered beside the expand button and left in place through loading, error
   * and empty states: a control that vanishes while its own chart is reloading
   * cannot be used to get out of the state it put the chart in.
   */
  controls?: ReactNode;
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
  controls,
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
      {(title || onExpand || controls) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              /* The native `title` attribute only accepts a string; a node
                 title carries its own affordance (a tooltip) and needs none. */
              <h3
                className="text-sm font-medium text-typography-900"
                title={typeof title === "string" ? title : undefined}
              >
                {title}
              </h3>
            )}
            {caption && <p className="text-xs text-typography-500">{caption}</p>}
          </div>
          <div className="flex items-start gap-1 shrink-0">
            {controls}
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
