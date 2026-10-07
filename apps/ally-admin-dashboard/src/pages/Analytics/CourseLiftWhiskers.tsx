import { CONTEXT } from "./chartScales";
import { Ci, changeColor, ciText, signed, whiskerExtent } from "./foundationalSkillsProgressChart";

import type { WhiskerRow } from "./ChangeWhiskers";

export interface LiftReference {
  label: string;
  change: number | null;
  ci: Ci;
  n: number;
}

// Stacked below `sm` (label, whiskers, numbers), as in ChangeWhiskers.
const GRID = "grid grid-cols-1 gap-1 sm:grid-cols-[minmax(9rem,14rem)_1fr_10.5rem] sm:gap-3";

/**
 * {@link ChangeWhiskers} for course lift, with the free-practice reference drawn
 * as a thin grey whisker under every row.
 *
 * One reference serves every course (at today's learner numbers a per-course
 * matched set would be a handful of people), so it is the same grey mark on each
 * row — repeated rather than drawn once, so each course can be read against it
 * without the eye leaving the row. It is context, not subject: grey, thinner,
 * with a smaller dot, and its numbers are stated once in the legend above the
 * rows rather than on every line.
 *
 * `headRow`, when given, is drawn first and set apart — the pooled "all courses,
 * each learner once" comparison the per-course rows sit under.
 */
export const CourseLiftWhiskers = ({
  rows,
  headRow,
  reference,
  emptyLabel = "too few learners",
}: {
  rows: WhiskerRow[];
  headRow?: WhiskerRow | null;
  /** Null when the response carries no reference at all (an older backend). */
  reference: LiftReference | null;
  emptyLabel?: string;
}) => {
  const all = headRow ? [headRow, ...rows] : rows;
  const refShown = reference && reference.change !== null && reference.ci ? reference : null;
  const extent = whiskerExtent([
    ...all,
    ...(refShown ? [{ change: refShown.change, ci: refShown.ci }] : []),
  ]);
  const x = (v: number) => `${((v + extent) / (2 * extent)) * 100}%`;
  const clamp = (v: number) => Math.max(-extent, Math.min(extent, v));

  const whisker = (change: number, ci: Ci, color: string, thin: boolean) =>
    ci && (
      <>
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded ${thin ? "h-px" : "h-0.5"}`}
          style={{
            left: x(clamp(ci[0])),
            width: `calc(${x(clamp(ci[1]))} - ${x(clamp(ci[0]))})`,
            background: color,
          }}
        />
        <span
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            thin ? "h-1.5 w-1.5" : "h-2.5 w-2.5 border-2 border-white"
          }`}
          style={{ left: x(clamp(change)), background: color }}
        />
      </>
    );

  const line = (r: WhiskerRow, head: boolean) => {
    const color = changeColor(r);
    return (
      <div
        key={r.key}
        className={`${GRID} items-center py-1.5 ${
          head ? "border-b-2 border-[#e0e0e0]" : "border-t border-[#f0f0f0]"
        }`}
      >
        <span className="flex flex-col">
          <span className={`text-xs text-typography-900 ${head ? "font-semibold" : ""}`}>
            {r.label}
          </span>
          {r.sublabel && <span className="text-[11px] text-typography-500">{r.sublabel}</span>}
        </span>
        <span className="relative flex h-8 flex-col" aria-hidden>
          <span
            className="absolute top-0 h-full w-px"
            style={{ left: "50%", background: CONTEXT.faint }}
          />
          <span className="relative h-1/2">
            {r.change !== null && whisker(r.change, r.ci, color, false)}
          </span>
          <span className="relative h-1/2">
            {refShown && whisker(refShown.change as number, refShown.ci, CONTEXT.line, true)}
          </span>
        </span>
        <span className="text-xs tabular-nums text-typography-700">
          {r.change === null ? (
            <span className="text-typography-500">
              {emptyLabel} (n = {r.n})
            </span>
          ) : (
            <>
              {signed(r.change)} <span className="text-typography-500">[{ciText(r.ci)}]</span> ·{" "}
              {r.n}
            </>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {reference && (
        <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-typography-500">
          <span aria-hidden className="inline-flex w-6 items-center">
            <span className="h-px w-full" style={{ background: CONTEXT.line }} />
          </span>
          <span>
            Grey: {reference.label}
            {refShown
              ? ` — ${signed(refShown.change)} [${ciText(refShown.ci)}] · n = ${refShown.n}`
              : ` — not drawn, too few learners (n = ${reference.n})`}
          </span>
        </p>
      )}
      <div className={`${GRID} mb-1 text-[11px] text-typography-500`}>
        <span className="hidden sm:block" />
        <span className="flex justify-between tabular-nums">
          <span>{signed(-extent)}</span>
          <span>0</span>
          <span>{signed(extent)}</span>
        </span>
        <span>change [95% CI] · n</span>
      </div>
      {headRow && line(headRow, true)}
      {rows.map(r => line(r, false))}
    </div>
  );
};
