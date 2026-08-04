import { AnalyticsAgentChart } from "@types";

import {
  ColorScale,
  PALETTE,
  barOpts,
  lineOpts,
  scatterOpts,
  single,
  stackedBarOpts,
} from "./chartKit";

/**
 * Turns the agent's chart specification into Carbon data + options.
 *
 * The agent proposes a form and names columns; this module decides whether the
 * actual values can carry it. That split matters: the model is describing rows it
 * saw as CSV, so it can be right about the shape of the question and still wrong
 * about whether a column is numeric. Everything below is pure and deterministic,
 * so a chart that renders can be reasoned about from the rows alone.
 *
 * Two honesty rules are enforced here rather than left to the prompt (wiki
 * product/data-visualisation.md, principle 13):
 *
 *  - **A non-numeric or missing measure is a gap, never a zero.** On a line chart
 *    the point becomes `null` so the line breaks; an unmarked flat segment at
 *    zero would read as a measured zero, which is the good news it isn't.
 *  - **A chart with nothing plottable is no chart.** Returning `null` lets the
 *    caller fall back to the table rather than render empty axes, which read as
 *    a broken panel rather than as an absence of data.
 */

export type AgentChartKind = "line" | "bar" | "stacked" | "scatter";

/** One Carbon datum. `key`/`group`/`value` for the axis charts, `x`/`y` for
 *  scatter; the unused fields are simply absent. */
interface CarbonDatum {
  group: string;
  key?: string;
  value?: number | null;
  x?: number;
  y?: number;
}

export interface AgentChartModel {
  kind: AgentChartKind;
  data: CarbonDatum[];
  options: Record<string, unknown>;
  /** Rows the chart could not plot (non-numeric measure, or a missing axis
   *  value). Surfaced next to the chart — a plot over 8 of 12 rows that does not
   *  say so is a misread waiting to happen. */
  skippedRows: number;
}

/**
 * Series colours, in a fixed order.
 *
 * Order is fixed so the same series index is the same colour on every answer in
 * a session, and the first series is the focal blue used across the analytics
 * dashboard. The agent cannot know the product's semantic colour meanings, so no
 * attempt is made to match them: what this guarantees is consistency, not
 * meaning.
 */
const SERIES_COLOURS = [
  PALETTE.blue,
  PALETTE.teal,
  PALETTE.purple,
  PALETTE.orange,
  PALETTE.green,
  PALETTE.magenta,
  PALETTE.cyan,
  PALETTE.gold,
  PALETTE.indigo,
  PALETTE.red,
];

/** Most series a chart may carry before it stops being readable. Past this the
 *  legend is longer than the plot and colours start repeating. */
export const MAX_SERIES = SERIES_COLOURS.length;

const seriesScale = (labels: string[]): ColorScale =>
  labels.reduce<ColorScale>((scale, label, i) => {
    scale[label] = SERIES_COLOURS[i % SERIES_COLOURS.length];
    return scale;
  }, {});

/**
 * Coerce a cell to a number, or null.
 *
 * Postgres hands back `numeric` as a string through the driver, so `"12.5"` is a
 * measured value and must not be discarded. `null`, `""` and anything
 * non-numeric are not measurements and become null — not zero.
 */
export const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Axis labels a chart can be rendered without: fall back to the column name,
 *  which is at least true, rather than to "Value". */
const axisLabel = (label: string, column: string): string => label?.trim() || column;

const cellToLabel = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  // Timestamps arrive as full ISO strings; a bucket axis reads better as a date,
  // and Carbon renders the label verbatim.
  const isoDate = /^(\d{4}-\d{2}-\d{2})T00:00:00/.exec(text);
  return isoDate ? isoDate[1] : text;
};

export const buildAgentChart = (
  chart: AnalyticsAgentChart | null,
  rows: Record<string, unknown>[],
): AgentChartModel | null => {
  if (!chart || chart.type === "none") return null;
  if (!rows.length || !chart.x || !chart.y) return null;
  // The server already validates the spec against the result columns; this is
  // the client's own check, because rendering a chart over a column that is not
  // there produces an empty plot rather than an error.
  if (!(chart.x in rows[0]) || !(chart.y in rows[0])) return null;
  const groupColumn = chart.group && chart.group in rows[0] ? chart.group : "";

  const leftTitle = axisLabel(chart.yLabel, chart.y);
  const bottomTitle = axisLabel(chart.xLabel, chart.x);

  if (chart.type === "scatter") {
    const points: CarbonDatum[] = [];
    let skipped = 0;
    for (const row of rows) {
      const x = toNumberOrNull(row[chart.x]);
      const y = toNumberOrNull(row[chart.y]);
      // A scatter needs both coordinates; a point with one is not a point.
      if (x === null || y === null) {
        skipped += 1;
        continue;
      }
      points.push({ group: leftTitle, x, y });
    }
    if (!points.length) return null;
    return {
      kind: "scatter",
      data: points,
      options: scatterOpts({
        leftTitle,
        bottomTitle,
        colorScale: single(leftTitle),
      }),
      skippedRows: skipped,
    };
  }

  // A categorical bar with no series: the x column becomes the bar's category,
  // which is what `barOpts` maps its axis to.
  if (chart.type === "bar" && !groupColumn) {
    const bars: CarbonDatum[] = [];
    let skipped = 0;
    for (const row of rows) {
      const value = toNumberOrNull(row[chart.y]);
      // A bar encodes magnitude by length, so there is no honest bar for an
      // unmeasured value — the category is left out and counted.
      if (value === null) {
        skipped += 1;
        continue;
      }
      bars.push({ group: cellToLabel(row[chart.x]), value });
    }
    if (!bars.length) return null;
    return {
      kind: "bar",
      data: bars,
      options: barOpts({
        leftTitle,
        bottomTitle,
        colorScale: seriesScale(bars.map(bar => bar.group)),
      }),
      skippedRows: skipped,
    };
  }

  // Line, stacked bar, and a bar that turned out to have series: all are
  // key/group/value. A grouped bar is rendered stacked rather than side-by-side
  // — with an unknown number of series, side-by-side bars get thinner until they
  // are unreadable, while a stack stays legible and still answers "is the mix
  // shifting?".
  const singleSeriesLabel = leftTitle;
  const points: CarbonDatum[] = [];
  const seriesSeen: string[] = [];
  let skipped = 0;

  for (const row of rows) {
    const series = groupColumn ? cellToLabel(row[groupColumn]) : singleSeriesLabel;
    if (!seriesSeen.includes(series)) {
      if (seriesSeen.length >= MAX_SERIES) {
        // Dropped rather than recoloured: repeating a colour makes two series
        // look like one, which is worse than an acknowledged omission.
        skipped += 1;
        continue;
      }
      seriesSeen.push(series);
    }
    const value = toNumberOrNull(row[chart.y]);
    if (chart.type === "line") {
      // Null is kept on a line: Carbon draws a break, which is the honest render
      // of a period that was not measured.
      points.push({ group: series, key: cellToLabel(row[chart.x]), value });
      if (value === null) skipped += 1;
    } else {
      if (value === null) {
        skipped += 1;
        continue;
      }
      points.push({ group: series, key: cellToLabel(row[chart.x]), value });
    }
  }

  const plottable = points.filter(point => point.value !== null);
  if (!plottable.length) return null;

  const colorScale = seriesSeen.length > 1 ? seriesScale(seriesSeen) : single(singleSeriesLabel);
  const legend = seriesSeen.length > 1;

  if (chart.type === "line") {
    return {
      kind: "line",
      data: points,
      options: lineOpts({ leftTitle, bottomTitle, colorScale, legend }),
      skippedRows: skipped,
    };
  }

  return {
    kind: "stacked",
    data: points,
    options: stackedBarOpts({ leftTitle, bottomTitle, colorScale, legend }),
    skippedRows: skipped,
  };
};
