import { CONTEXT, PALETTE } from "./chartScales";

/**
 * A drop-off funnel as horizontal bars.
 *
 * Replaces two hand-rolled copies of the same widget (learning-track funnel,
 * scribe pipeline funnel) that had drifted apart on label width, printed raw
 * unformatted counts into a fixed box that clipped past four digits, and showed
 * no conversion at all — so the reader could see that the bars got shorter but
 * not by how much, which is the only question a funnel exists to answer.
 *
 * Horizontal because funnel stages have long names, and bars because the stages
 * are ordered categories, not a continuous progression.
 */

export interface FunnelStage {
  label: string;
  reached: number;
  /** Marks the terminal success stage, which gets the accent colour. */
  terminal?: boolean;
  /**
   * Share of the funnel's first stage, 0-100 — SERVER-SUPPLIED.
   *
   * Provide this (with {@link ofPreviousPct}) for any funnel whose percentages
   * the server may have suppressed under the minimum-group-size rule. An
   * explicit `null` means "this share may not be stated" and renders as an
   * em dash; leaving both undefined falls back to computing them from the
   * counts, which is correct only for funnels over populations that cannot
   * identify anybody — orgs, sessions, enrollments.
   *
   * Recomputing a suppressed share on the client would quietly undo the
   * suppression: "67% of previous" over three learners names one of them.
   */
  ofEnteredPct?: number | null;
  /** Conversion from the stage above, 0-100. See {@link ofEnteredPct}. */
  ofPreviousPct?: number | null;
}

interface FunnelBarsProps {
  stages: FunnelStage[];
  /** Noun for the counted thing, e.g. "sessions", "enrollments". */
  unit?: string;
}

/**
 * True when a stage carries server-supplied shares — including explicit nulls,
 * which is the whole point: `null` is a decision to suppress, not missing data,
 * so it must not fall through to the client-side calculation.
 */
const hasServerShares = (stage: FunnelStage): boolean =>
  stage.ofEnteredPct !== undefined || stage.ofPreviousPct !== undefined;

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

export const FunnelBars = ({ stages, unit = "" }: FunnelBarsProps) => {
  if (!stages.length) return null;

  // Normalise against the FIRST stage, not the largest: a funnel's whole point
  // is "of everyone who entered, how many got here", and cohort semantics
  // guarantee the first stage is the widest.
  const entered = stages[0].reached;

  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1] : null;
        const serverShares = hasServerShares(stage);
        const ofEntered = serverShares ? (stage.ofEnteredPct ?? null) : pct(stage.reached, entered);
        const ofPrev = serverShares
          ? (stage.ofPreviousPct ?? null)
          : prev
            ? pct(stage.reached, prev.reached)
            : null;

        // Bar length comes from the COUNTS either way. The counts are on screen
        // regardless, so their ratio is already visible; what the suppression
        // rule withholds is the stated percentage.
        const barPct = pct(stage.reached, entered) ?? 0;
        const fill = stage.terminal ? PALETTE.teal : PALETTE.blue;

        return (
          <div key={stage.label} className="flex items-center gap-3 text-xs">
            <div className="w-32 shrink-0 truncate text-typography-700" title={stage.label}>
              {stage.label}
            </div>

            <div className="relative h-5 flex-1 rounded" style={{ backgroundColor: "#f0f0f0" }}>
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{
                  width: `${barPct}%`,
                  backgroundColor: fill,
                }}
              />
            </div>

            <div className="w-20 shrink-0 text-right font-medium text-typography-900">
              {stage.reached.toLocaleString()}
            </div>

            {/* Step-to-step conversion is the number a reader acts on — where
                the drop happened, not just that the bar is shorter. The first
                stage has nothing to convert from, so it states the base. */}
            <div className="w-28 shrink-0 text-right" style={{ color: CONTEXT.strong }}>
              {i === 0
                ? ofEntered === null
                  ? "—"
                  : `100%${unit ? ` of ${unit}` : ""}`
                : ofPrev === null
                  ? "—"
                  : `${ofPrev}% of previous`}
            </div>
          </div>
        );
      })}
    </div>
  );
};
