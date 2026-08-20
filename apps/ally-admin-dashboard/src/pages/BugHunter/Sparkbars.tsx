import { FC } from "react";

/**
 * A fourteen-bar day-by-day sparkline, as inline SVG.
 *
 * ## Why not a chart library
 *
 * The admin console already ships Carbon Charts, and this is the wrong job for
 * it. A `SimpleBarChart` brings an axis, a legend, a tooltip layer and a D3
 * transition to draw fourteen numbers at 32px tall — and two of those cost
 * real trouble here: Carbon's tick labels truncate past 14 characters (which
 * is why this tab's dates are hover-only, not printed), and Carbon in jsdom
 * needs a `requestAnimationFrame` shim before it will render in a test at all.
 * Fourteen `<rect>`s need none of that and are readable at a glance, which is
 * the entire brief for a sparkline.
 *
 * ## One series per sparkline, never two
 *
 * Cost and bugs-found are drawn as two separate rows rather than as one chart
 * with two axes. Fourteen bars 32px tall cannot carry a second encoding without
 * the reader having to be told which is which — and a dual axis invites exactly
 * the false correlation ("cost tracks findings") that the shapes might not
 * support. Each row scales to its own maximum and says what its maximum is.
 *
 * ## Accessibility
 *
 * The whole row is one `role="img"` with a summary label, because fourteen
 * focusable bars is a keyboard trap in a page that already has a table to
 * traverse. The per-bar `<title>` gives a mouse user the day's numbers; the
 * summary gives everyone else the shape in words.
 */

export interface SparkbarDatum {
  /** Bar height driver. Negative values are treated as zero. */
  value: number;
  /** Native tooltip for this bar — the caller formats it, since only it knows the units. */
  tooltip: string;
}

export interface SparkbarsProps {
  data: SparkbarDatum[];
  /** Sentence describing the whole row, for a screen reader. */
  ariaLabel: string;
  /** Tailwind fill class for a bar with something in it. */
  barClassName?: string;
  /** Height of the plot area in pixels. */
  height?: number;
}

/** Bar width and gap in the SVG's own user units — the viewBox scales it to whatever width it lands in. */
const BAR_WIDTH = 6;
const BAR_GAP = 2;

/**
 * A day with nothing in it still gets a visible stub rather than no bar at all.
 *
 * A quiet day is a real observation, and rendering it as blank space makes
 * fourteen days look like nine — the same argument `buildSeries` makes for
 * keeping the series dense. The stub is 1 unit tall and grey, so it reads as
 * "nothing happened" rather than as "a very small amount happened".
 */
const EMPTY_BAR_HEIGHT = 1;

export const Sparkbars: FC<SparkbarsProps> = ({
  data,
  ariaLabel,
  barClassName = "fill-primary-500",
  height = 28,
}) => {
  const width = data.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  // Guarded against a zero max: a fortnight of nothing would otherwise divide
  // by zero and render every bar as NaN, which SVG silently drops.
  const max = Math.max(...data.map(datum => Math.max(0, datum.value)), 0);

  return (
    <svg
      viewBox={`0 0 ${Math.max(width, 1)} ${height}`}
      // Stretches to the container's width but keeps its height fixed, so the
      // bars widen on a big screen rather than the whole row growing taller.
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {data.map((datum, index) => {
        const value = Math.max(0, datum.value);
        const isEmpty = max === 0 || value === 0;
        const barHeight = isEmpty
          ? EMPTY_BAR_HEIGHT
          : // Floor of 1 unit so a real-but-tiny day is still visibly a bar.
            Math.max(EMPTY_BAR_HEIGHT, (value / max) * height);

        return (
          <rect
            key={datum.tooltip + index}
            x={index * (BAR_WIDTH + BAR_GAP)}
            y={height - barHeight}
            width={BAR_WIDTH}
            height={barHeight}
            rx={1}
            className={isEmpty ? "fill-neutral-200" : barClassName}
          >
            <title>{datum.tooltip}</title>
          </rect>
        );
      })}
    </svg>
  );
};
