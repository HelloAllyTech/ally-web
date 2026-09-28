import { FC, useState } from "react";

import { en } from "@constants";

import { EMPTY_MARK } from "./chartPalette";

/**
 * The two chart forms the operations panel needs, as inline SVG and plain
 * HTML — no chart library, for the reasons `Sparkbars.tsx` records (Carbon's
 * label truncation, its jsdom needs) and one more: every chart here must ship
 * with a table view, and a table is easier to keep honest when the chart is a
 * few hundred lines you can read.
 *
 * ## What every chart here guarantees
 *
 * - A legend whenever there are two or more series, so identity never rests
 *   on colour alone. Three of the palette's slots are below 3:1 on white.
 * - A table view behind one toggle, with every number the marks encode. The
 *   tooltip enhances; it never gates.
 * - Dense days: the caller passes every day in the window and a quiet one
 *   draws as a grey stub, so fourteen days never look like nine.
 * - A 2px surface gap between stacked segments — white doing the separating,
 *   never a stroke.
 * - Thin marks: bars are capped in width so a short window does not become
 *   a row of slabs.
 */

export interface StackSeries {
  key: string;
  label: string;
  color: string;
  /** One value per day, aligned with `days`. */
  values: number[];
}

export interface StackedColumnsProps {
  /** `YYYY-MM-DD`, oldest first. */
  days: string[];
  series: StackSeries[];
  /** Screen-reader sentence for the whole plot. */
  ariaLabel: string;
  /** Native tooltip for a whole day — lists every series, so the pointer never has to land on a segment. */
  tooltipFor: (dayIndex: number) => string;
  /** Formats a value for the axis and the table. */
  formatValue?: (value: number) => string;
  /** Column header for the day's total in the table view. */
  totalLabel?: string;
}

const PLOT_HEIGHT = 120;
const MAX_BAR = 24;
const MIN_BAR = 4;
const GAP = 2;
const EMPTY_HEIGHT = 1;

/** `18 Sep`, from a `YYYY-MM-DD` day taken as UTC — the clock the days were bucketed in. */
export const formatDay = (day: string): string => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

/**
 * A clean axis ceiling at or just above the data's max.
 *
 * Finer than the usual 1-2-5 ladder: a max of 2.3M under a 5M ceiling leaves
 * the top half of the plot empty and every bar reading as small, and the axis
 * carries only two ticks here, so the ceiling does not need to be a round
 * multiple of anything — just a number a reader would say out loud.
 */
const niceCeiling = (max: number): number => {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step =
    [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(candidate => candidate * magnitude >= max) ?? 10;
  return step * magnitude;
};

const defaultFormat = (value: number): string => value.toLocaleString();

const TableToggle: FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={open}
    // `ml-auto` keeps it at the right edge when a single-series chart renders
    // no legend beside it.
    className="ml-auto text-[11px] text-primary-600 underline cursor-pointer"
  >
    {open ? en.bugHunter.operationsHideTable : en.bugHunter.operationsShowTable}
  </button>
);

const Legend: FC<{ series: { label: string; color: string }[] }> = ({ series }) => {
  // One series needs no legend box: the chart's own title already names it.
  if (series.length < 2) return null;
  return (
    <ul
      className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-typography-700"
      aria-label="Legend"
    >
      {series.map(entry => (
        <li key={entry.label} className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          {entry.label}
        </li>
      ))}
    </ul>
  );
};

export const StackedColumns: FC<StackedColumnsProps> = ({
  days,
  series,
  ariaLabel,
  tooltipFor,
  formatValue = defaultFormat,
  totalLabel = en.bugHunter.operationsColTotal,
}) => {
  const [showTable, setShowTable] = useState(false);

  const totals = days.map((_, index) =>
    series.reduce((sum, entry) => sum + Math.max(0, entry.values[index] ?? 0), 0),
  );
  const max = Math.max(0, ...totals);
  const ceiling = niceCeiling(max);

  // Bars widen to fill a short window and narrow for a long one, but never
  // past MAX_BAR: a 7-day chart of 24px slabs and a 90-day chart of 4px
  // hairlines both read as the same quiet form.
  const bar = Math.max(
    MIN_BAR,
    Math.min(MAX_BAR, Math.floor(360 / Math.max(days.length, 1)) - GAP),
  );
  const width = days.length * (bar + GAP) - GAP;

  const busiest = max > 0 ? totals.indexOf(max) : -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <Legend series={series} />
        <TableToggle open={showTable} onToggle={() => setShowTable(open => !open)} />
      </div>

      <div className="flex gap-2">
        {/* The y-axis, as two text ticks rather than a ruled scale — the tooltip
            and the table carry exact values; these give the eye a ceiling. */}
        <div
          className="flex flex-col justify-between text-[10px] text-typography-500 tabular-nums text-right w-8 shrink-0"
          style={{ height: PLOT_HEIGHT }}
          aria-hidden="true"
        >
          <span>{formatValue(ceiling)}</span>
          <span>0</span>
        </div>
        <div className="flex-1 min-w-0 border-b border-border-light">
          <svg
            viewBox={`0 0 ${Math.max(width, 1)} ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: PLOT_HEIGHT }}
            role="img"
            aria-label={ariaLabel}
          >
            {days.map((day, index) => {
              const x = index * (bar + GAP);
              const total = totals[index];
              if (total === 0) {
                return (
                  <rect
                    key={day}
                    x={x}
                    y={PLOT_HEIGHT - EMPTY_HEIGHT}
                    width={bar}
                    height={EMPTY_HEIGHT}
                    fill={EMPTY_MARK}
                  >
                    <title>{tooltipFor(index)}</title>
                  </rect>
                );
              }
              let cursor = PLOT_HEIGHT;
              const segments = series.map(entry => {
                const value = Math.max(0, entry.values[index] ?? 0);
                if (value === 0) return null;
                const height = (value / ceiling) * PLOT_HEIGHT;
                cursor -= height;
                // The 2px surface gap between segments comes out of the
                // segment's own height, so the stack still reaches its true
                // total at the top.
                const drawnHeight = Math.max(EMPTY_HEIGHT, height - GAP);
                return (
                  <rect
                    key={entry.key}
                    x={x}
                    y={cursor + GAP}
                    width={bar}
                    height={drawnHeight}
                    fill={entry.color}
                    className="transition-opacity hover:opacity-80 motion-reduce:transition-none"
                  />
                );
              });
              return (
                <g key={day}>
                  {segments}
                  {/* One hit target per day, the full column height, so a
                      hover anywhere in the slot reads every series. */}
                  <rect x={x} y={0} width={bar} height={PLOT_HEIGHT} fill="transparent">
                    <title>{tooltipFor(index)}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Three dates, in HTML so they never stretch with the plot. */}
      <div
        className="flex justify-between text-[10px] text-typography-500 pl-10"
        aria-hidden="true"
      >
        <span>{days.length ? formatDay(days[0]) : ""}</span>
        <span>{days.length > 2 ? formatDay(days[Math.floor(days.length / 2)]) : ""}</span>
        <span>{days.length > 1 ? formatDay(days[days.length - 1]) : ""}</span>
      </div>

      {/* The one direct label: the extreme, in words, rather than a number on
          every column. */}
      {busiest >= 0 && (
        <p className="text-[11px] text-typography-600">
          {`${formatDay(days[busiest])}: ${formatValue(max)}`}
        </p>
      )}

      {showTable && (
        <div className="overflow-x-auto border border-border-light rounded-lg bg-white max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-light text-typography-600">
                <th className="text-left font-medium px-3 py-1.5">
                  {en.bugHunter.operationsColDay}
                </th>
                {series.map(entry => (
                  <th key={entry.key} className="text-right font-medium px-3 py-1.5">
                    {entry.label}
                  </th>
                ))}
                <th className="text-right font-medium px-3 py-1.5">{totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, index) => (
                <tr key={day} className="border-b border-border-light last:border-0">
                  <td className="px-3 py-1.5 text-typography-900">{formatDay(day)}</td>
                  {series.map(entry => (
                    <td key={entry.key} className="px-3 py-1.5 text-right tabular-nums">
                      {formatValue(entry.values[index] ?? 0)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                    {formatValue(totals[index])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export interface HorizontalBarRow {
  key: string;
  label: string;
  value: number;
  /** Secondary line under the label — "3 accepted · 1 declined". */
  detail?: string;
}

export interface HorizontalBarsProps {
  rows: HorizontalBarRow[];
  /** One hue for every bar: these are identities, not magnitudes to ramp. */
  color: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
}

/**
 * A few named quantities compared side by side. Plain HTML: a proportional
 * width is all the mark needs, and the value sits at the bar's end as text,
 * so this form is its own table view.
 */
export const HorizontalBars: FC<HorizontalBarsProps> = ({
  rows,
  color,
  ariaLabel,
  formatValue = defaultFormat,
}) => {
  const max = Math.max(0, ...rows.map(row => row.value));
  return (
    <ul className="flex flex-col gap-2" aria-label={ariaLabel}>
      {rows.map(row => {
        const share = max === 0 ? 0 : row.value / max;
        return (
          <li key={row.key} className="grid grid-cols-[12rem_1fr_auto] items-center gap-3 text-xs">
            <div className="min-w-0">
              <p className="text-typography-900 truncate" title={row.label}>
                {row.label}
              </p>
              {/* The detail is the acceptance figure — the half of the reading
                  this panel exists to keep beside the count — so it wraps
                  rather than truncates. */}
              {row.detail && <p className="text-[11px] text-typography-500">{row.detail}</p>}
            </div>
            <div className="h-3 rounded-r-[4px] bg-transparent" aria-hidden="true">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: row.value === 0 ? "2px" : `${Math.max(2, share * 100)}%`,
                  backgroundColor: row.value === 0 ? EMPTY_MARK : color,
                }}
              />
            </div>
            <span className="text-typography-900 tabular-nums">{formatValue(row.value)}</span>
          </li>
        );
      })}
    </ul>
  );
};
