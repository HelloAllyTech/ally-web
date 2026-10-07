import { CONTEXT } from "./chartScales";
import { Ci, changeColor, ciText, signed, whiskerExtent } from "./foundationalSkillsProgressChart";

export interface WhiskerRow {
  key: string;
  label: string;
  /** Small grey line under the label (e.g. tier, or why it is not measurable). */
  sublabel?: string;
  change: number | null;
  ci: Ci;
  n: number;
  detectable: boolean;
}

/**
 * Paired change ± 95% interval per row, on a shared symmetric axis with a zero
 * line — the honest form of "change per skill".
 *
 * A bar chart of mean changes invites reading every bar as a move; a whisker
 * that crosses zero says "can't tell" at a glance. Colour carries meaning only
 * when the interval excludes zero (green up, red down); everything else is
 * grey, and the number beside each row says the same in text so nothing rests
 * on colour. Plain HTML so the labels can be full skill names, not 14-character
 * axis ticks.
 */
export const ChangeWhiskers = ({
  rows,
  emptyLabel = "too few learners",
  decimals = 2,
  unit = "",
}: {
  rows: WhiskerRow[];
  emptyLabel?: string;
  /** Decimals for values and axis ends (0 for percentage points). */
  decimals?: number;
  /** Suffix after the change, e.g. " pts". */
  unit?: string;
}) => {
  const extent = whiskerExtent(rows);
  const x = (v: number) => `${((v + extent) / (2 * extent)) * 100}%`;
  // Below `sm` the three columns stack — label, whisker, numbers — because
  // label and numbers alone are wider than a phone. Every whisker then spans
  // the full width, so they still share one axis.
  return (
    <div className="flex flex-col">
      <div className="mb-1 grid grid-cols-1 gap-1 text-[11px] text-typography-500 sm:grid-cols-[minmax(9rem,14rem)_1fr_10.5rem] sm:gap-3">
        <span className="hidden sm:block" />
        <span className="flex justify-between tabular-nums">
          <span>{signed(-extent, decimals)}</span>
          <span>0</span>
          <span>{signed(extent, decimals)}</span>
        </span>
        <span>change [95% CI] · n</span>
      </div>
      {rows.map(r => {
        const color = changeColor(r);
        return (
          <div
            key={r.key}
            className="grid grid-cols-1 items-center gap-1 border-t border-[#f0f0f0] py-1.5 sm:grid-cols-[minmax(9rem,14rem)_1fr_10.5rem] sm:gap-3"
          >
            <span className="flex flex-col">
              <span className="text-xs text-typography-900">{r.label}</span>
              {r.sublabel && <span className="text-[11px] text-typography-500">{r.sublabel}</span>}
            </span>
            <span className="relative h-5" aria-hidden>
              <span
                className="absolute top-0 h-full w-px"
                style={{ left: "50%", background: CONTEXT.faint }}
              />
              {r.ci && r.change !== null && (
                <>
                  <span
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded"
                    style={{
                      left: x(Math.max(-extent, r.ci[0])),
                      width: `calc(${x(Math.min(extent, r.ci[1]))} - ${x(Math.max(-extent, r.ci[0]))})`,
                      background: color,
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                    style={{ left: x(r.change), background: color }}
                  />
                </>
              )}
            </span>
            <span className="text-xs tabular-nums text-typography-700">
              {r.change === null ? (
                <span className="text-typography-500">
                  {emptyLabel} (n = {r.n})
                </span>
              ) : (
                <>
                  {signed(r.change, decimals)}
                  {unit} <span className="text-typography-500">[{ciText(r.ci, decimals)}]</span> ·{" "}
                  {r.n}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};
