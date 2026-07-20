import { ReactNode } from "react";

import { ScaleTypes } from "@carbon/charts";

import { Button, InlineNotification, SkeletonPlaceholder, Tile } from "@ally-ui-mono/ui-shared";

/**
 * Analytics chart kit for the Organization Metrics dashboard — adapted from
 * the ally-admin-dashboard analytics kit (`pages/Analytics/chartKit.tsx`) so
 * both dashboards share one Carbon look. Wrap every chart in {@link ChartCard}
 * (consistent title/caption + loading/error/empty handling) and build options
 * with the factories below so new metrics/charts added to this page share the
 * same axes/legend/toolbar defaults and palette.
 */

export const CHART_HEIGHT = "300px";

/** Central Carbon-palette hexes. Reuse these instead of inline hex literals. */
export const PALETTE = {
  blue: "#264D8E",
  cyan: "#33b1ff",
  teal: "#08bdba",
  green: "#42be65",
  purple: "#8a3ffc",
  indigo: "#6929c4",
  magenta: "#9f1853",
  red: "#fa4d56",
  orange: "#ff832b",
  gold: "#d2a106",
  gray: "#8d8d8d",
};

type ColorScale = Record<string, string>;

interface AxisOptsBase {
  leftTitle?: string;
  bottomTitle?: string;
  colorScale?: ColorScale;
  legend?: boolean;
  height?: string;
  /** Extra options merged last for special cases (e.g. axis thresholds). */
  extra?: Record<string, unknown>;
}

const withColor = (scale?: ColorScale) => (scale ? { color: { scale } } : {});

/** Time-series line chart (x = `key`, y = `value`). */
export const lineOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = true,
  height = CHART_HEIGHT,
  extra = {},
}: AxisOptsBase = {}) => ({
  height,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: leftTitle },
    bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: bottomTitle },
  },
  curve: "curveMonotoneX",
  ...withColor(colorScale),
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/** Categorical bar chart (x = `group`, y = `value`). */
export const barOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  extra = {},
}: AxisOptsBase = {}) => ({
  height,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: leftTitle },
    bottom: { mapsTo: "group", scaleType: ScaleTypes.LABELS, title: bottomTitle },
  },
  ...withColor(colorScale),
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/** Time-series bar chart (x = `key`, y = `value`) — one bar per bucket. */
export const timeBarOpts = ({
  leftTitle = "Value",
  bottomTitle = "",
  colorScale,
  legend = false,
  height = CHART_HEIGHT,
  extra = {},
}: AxisOptsBase = {}) => ({
  height,
  axes: {
    left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: leftTitle },
    bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: bottomTitle },
  },
  ...withColor(colorScale),
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
  extra = {},
}: AxisOptsBase = {}) => ({
  height,
  axes: {
    left: {
      mapsTo: "value",
      scaleType: ScaleTypes.LINEAR,
      stacked: true,
      title: leftTitle,
    },
    bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: bottomTitle },
  },
  ...withColor(colorScale),
  legend: { enabled: legend },
  toolbar: { enabled: false },
  ...extra,
});

/** Donut chart (group = `group`, value = `value`). */
export const donutOpts = ({
  centerLabel = "",
  height = CHART_HEIGHT,
  extra = {},
}: { centerLabel?: string; height?: string; extra?: Record<string, unknown> } = {}) => ({
  height,
  resizable: true,
  donut: { center: { label: centerLabel } },
  toolbar: { enabled: false },
  ...extra,
});

interface ChartCardProps {
  /** Header title (rendered as text above the chart). */
  title?: string;
  /** Sub-text under the title. */
  caption?: string;
  loading?: boolean;
  error?: boolean;
  /** True when there's no data to show — renders a dashed placeholder. */
  empty?: boolean;
  onRetry?: () => void;
  errorTitle?: string;
  errorSubtitle?: string;
  retryLabel?: string;
  emptyText?: string;
  /** Span 2 columns in a grid (for wide charts). */
  wide?: boolean;
  height?: string;
  children: ReactNode;
}

/**
 * One wrapper for every analytics chart: optional title/caption header, plus
 * uniform loading (skeleton), error (notification + retry), and empty states.
 */
export const ChartCard = ({
  title,
  caption,
  loading = false,
  error = false,
  empty = false,
  onRetry,
  errorTitle = "Couldn't load this chart",
  errorSubtitle = "There was a problem fetching the data.",
  retryLabel = "Retry",
  emptyText = "No data for this range",
  wide = false,
  height = CHART_HEIGHT,
  children,
}: ChartCardProps) => (
  <Tile className={wide ? "xl:col-span-2" : undefined}>
    {title && <p className="text-sm font-medium text-typography-900">{title}</p>}
    {caption && <p className="text-xs text-typography-500 mb-2">{caption}</p>}
    {title && !caption && <div className="mb-2" />}
    {loading ? (
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
            {retryLabel}
          </Button>
        )}
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
    )}
  </Tile>
);
