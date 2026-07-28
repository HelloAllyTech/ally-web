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
}

interface FunnelBarsProps {
  stages: FunnelStage[];
  /** Noun for the counted thing, e.g. "sessions", "enrollments". */
  unit?: string;
}

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
        const ofEntered = pct(stage.reached, entered);
        const ofPrev = prev ? pct(stage.reached, prev.reached) : null;
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
                  width: `${ofEntered ?? 0}%`,
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
                ? `100%${unit ? ` of ${unit}` : ""}`
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
