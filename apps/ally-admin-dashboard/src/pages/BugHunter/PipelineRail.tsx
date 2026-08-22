import { FC, useEffect, useRef, useState } from "react";

import { Branch, CheckCircle, Chemistry, Debug, FailIcon, Flag, Merge, Search } from "@icons";
import { motion, useReducedMotion } from "framer-motion";

import { en } from "@constants";

import { CARBON_MOTION, stillness } from "./carbonMotion";
import { PIPELINE_STAGES, PipelineStage } from "./pipelineStage";

export interface PipelineRailProps {
  /** Where the finding currently stands, derived by `stageFromFindingStatus`. */
  stage: PipelineStage;
  /**
   * Overrides the current node's colour without moving its position on the
   * rail — a bug can be stuck at the same stage for two different reasons (an
   * outright failure vs. an open question it's waiting on), and the rail
   * should say which without implying it moved backward or forward.
   */
  variant?: "error" | "waiting";
  /**
   * Strips the rail down to its nodes for use inside a row: no bordered box,
   * no header, no per-node text labels, smaller circles. `LiveWorkBoard` shows
   * one of these per in-flight bug, where six visible stage names per row would
   * be six times as much text as the row's own title — and where the row
   * already carries a sentence saying what Bug Hunter is doing, so the words
   * would be a second copy of it. The stage names stay reachable as each node's
   * hover title and the whole rail names its own position to a screen reader.
   */
  dense?: boolean;
  /**
   * Adds a pulse travelling from the current node toward the next one — the
   * rail's "and it is moving" signal, as distinct from the pulse ring, which
   * only says "it is here".
   *
   * Opt-in because the two readings are different claims. `LiveWorkBoard` sets
   * it for bugs in the in-flight set, where Bug Hunter is genuinely working
   * toward the next stage. A bug parked at `NEW` also has a current node, and a
   * pulse crawling toward "fix" would be claiming a fix was underway.
   */
  flowing?: boolean;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  scan: en.bugHunter.pipelineStageScan,
  verify: en.bugHunter.pipelineStageVerify,
  fix: en.bugHunter.pipelineStageFix,
  review: en.bugHunter.pipelineStageReview,
  merged: en.bugHunter.pipelineStageMerged,
  ship: en.bugHunter.pipelineStageShip,
};

const STAGE_ICONS: Record<PipelineStage, typeof Search> = {
  scan: Search,
  verify: Chemistry,
  fix: Debug,
  review: Branch,
  merged: Merge,
  ship: Flag,
};

/** Node-circle treatment per state — future/current/completed, plus the current node's error/waiting overrides. */
const NODE_STYLES = {
  future: "border-2 border-neutral-300 bg-white text-typography-400",
  completed: "border-2 border-green-500 bg-green-500 text-white",
  current: "border-2 border-amber-400 bg-amber-50 text-amber-700",
  currentError: "border-2 border-destructive-500 bg-destructive-50 text-destructive-600",
  currentWaiting: "border-2 border-orange-400 bg-orange-50 text-orange-600",
} as const;

/**
 * Geometry per size. The track has to start and end at the *centre* of the
 * first and last nodes rather than at the rail's edges, so its horizontal
 * inset is half a node on each side and the coloured fill's width is
 * `progress` of what is left — which is why these three values are one object
 * per size rather than three loose literals.
 */
const GEOMETRY = {
  regular: {
    node: "h-8 w-8",
    icon: 16,
    /** Half a node (1rem), matching `trackInset`'s Tailwind classes. */
    trackShrink: "2rem",
    halfNode: "1rem",
    trackInset: "left-4 right-4",
    fillInset: "left-4",
    trackTop: "top-[15px]",
    /** Puts a 6px pulse's centre on the track's centre (16px down). */
    pulseTop: "top-[13px]",
    wrapper: "relative pt-1",
  },
  dense: {
    node: "h-5 w-5",
    icon: 12,
    /** Half a node (0.625rem) each side. */
    trackShrink: "1.25rem",
    halfNode: "0.625rem",
    trackInset: "left-2.5 right-2.5",
    fillInset: "left-2.5",
    trackTop: "top-[9px]",
    /** Track centre is 10px down here. */
    pulseTop: "top-[7px]",
    wrapper: "relative",
  },
} as const;

/** Gaps between the six nodes — what one step of the travelling pulse spans. */
const SEGMENTS = PIPELINE_STAGES.length - 1;

const PULSE_RING_COLOR: Record<"working" | "error" | "waiting", string> = {
  working: "bg-amber-400",
  error: "bg-destructive-400",
  waiting: "bg-orange-400",
};

/**
 * The six-stage bug pipeline (scan -> verify -> fix -> review -> merged ->
 * ship) as a horizontal rail of nodes on a connecting line, in ordinary
 * Carbon light — no dark skin, just Tailwind's semantic palette and the
 * existing Carbon icon set.
 *
 * Completed stages fill green with a tick, the current stage pulses amber (or
 * red/orange under `variant`), and everything ahead stays a neutral outline.
 * The connecting line's fill animates its width when the stage advances —
 * the one motion in this feature that most says "this moved forward since
 * you last looked" (see the module doc in `pipelineStage.ts` for the mapping
 * this renders).
 *
 * ## The motion, and where its numbers come from
 *
 * Three things move, and they are three different claims:
 *
 * - **The fill sweeps** when the stage changes — "this moved forward since you
 *   last looked". Longest distance anything here travels, so Carbon's
 *   `slow-01`.
 * - **A node pops** if, and only if, the stage actually advanced — never on
 *   mount, or a page load would spend that meaning on nothing. The pop covers
 *   every node whose state changed, so a fix session that merges straight
 *   through review pops the whole run of them.
 * - **The current node's ring breathes, and under `flowing` a pulse travels
 *   toward the next node** — "it is here" and "it is working toward there".
 *   The second is opt-in precisely because it is the stronger claim.
 *
 * Durations and curves come from `carbonMotion.ts`, which derives them from
 * `@carbon/motion` rather than picking numbers: this rail used to animate at
 * `0.5s / easeInOut`, which is not a Carbon duration paired with not a Carbon
 * curve. Everything is off entirely under `prefers-reduced-motion`, not
 * slowed — the rail still says where the bug is, it just stops saying it twice.
 *
 * That last sentence about hidden motion is why `dense` exists. This rail was reachable from
 * exactly one place — the drawer, for one bug, if you opened it — so the
 * feature's clearest statement of forward motion was also its best-hidden
 * one. `dense` is the same rail sized to sit in a list row, which is what lets
 * `LiveWorkBoard` show every in-flight bug's position at once on the page
 * itself. It is a second size, deliberately not a second component: the six
 * stages, their order, their colours and the pulse are defined here once.
 */
/**
 * Which nodes to pop, and on which advance.
 *
 * Returns null until the stage actually changes, so a rail appearing on screen
 * does not pop all six nodes at once — the pop means "this moved since you
 * last looked", and firing it on mount would spend that meaning on a page load.
 * The token increments per advance so a second advance re-keys the same nodes
 * and animates again; the range covers every node whose state changed, which on
 * a multi-stage jump (a fix session that merges straight through review) is more
 * than one.
 */
const useStageAdvance = (currentIndex: number) => {
  const previousIndexRef = useRef<number | null>(null);
  const tokenRef = useRef(0);
  const [advance, setAdvance] = useState<{ from: number; to: number; token: number } | null>(null);

  useEffect(() => {
    const previous = previousIndexRef.current;
    previousIndexRef.current = currentIndex;
    if (previous === null || previous === currentIndex) return;
    tokenRef.current += 1;
    setAdvance({
      from: Math.min(previous, currentIndex),
      to: Math.max(previous, currentIndex),
      token: tokenRef.current,
    });
  }, [currentIndex]);

  return advance;
};

export const PipelineRail: FC<PipelineRailProps> = ({
  stage,
  variant,
  dense = false,
  flowing = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const currentIndex = PIPELINE_STAGES.indexOf(stage);
  const progress = currentIndex / SEGMENTS;
  const pulseKind = variant === "error" ? "error" : variant === "waiting" ? "waiting" : "working";
  const geometry = dense ? GEOMETRY.dense : GEOMETRY.regular;
  const advance = useStageAdvance(currentIndex);

  // Dense has no visible stage labels, so it has to say where it is some other
  // way — the group's own name carries the current stage and its position,
  // which is the sentence the labels would otherwise have spelled out.
  const groupLabel = dense
    ? en.bugHunter.pipelineRailDenseLabel
        .replace("{stage}", STAGE_LABELS[stage])
        .replace("{step}", String(currentIndex + 1))
        .replace("{total}", String(PIPELINE_STAGES.length))
    : en.bugHunter.pipelineRailLabel;

  // Only travels a gap that exists, and only when the bug is actually being
  // worked rather than stopped on a question or a failure.
  const showsFlow = flowing && !shouldReduceMotion && !variant && currentIndex < SEGMENTS;

  return (
    <div
      className={dense ? "" : "border border-border-light rounded-lg bg-white px-4 py-4"}
      role="group"
      aria-label={groupLabel}
    >
      {!dense && (
        <div className="text-[11px] uppercase tracking-wide text-typography-500 mb-4">
          {en.bugHunter.pipelineRailLabel}
        </div>
      )}

      <div className={geometry.wrapper}>
        {/* Static neutral track, full width. */}
        <div
          className={`absolute ${geometry.trackInset} ${geometry.trackTop} h-0.5 bg-border-light`}
          aria-hidden="true"
        />
        {/* Coloured fill whose width animates to the new stage. Track spans
            from the first node's centre to the last's — inset by half a node
            width on each side, matching the track above — so the width is
            `progress` of (100% - one node width). */}
        <motion.div
          className={`absolute ${geometry.fillInset} ${geometry.trackTop} h-0.5 bg-green-500`}
          initial={false}
          animate={{ width: `calc((100% - ${geometry.trackShrink}) * ${progress})` }}
          transition={shouldReduceMotion ? stillness : CARBON_MOTION.railFill}
        />

        {/* The travelling pulse, over the one gap between where the bug is and
            where it is going next. Positioned as its own segment box so the dot
            inside can animate 0% -> 100% of it: percentage keyframes interpolate
            cleanly where an animated `calc()` does not. */}
        {showsFlow && (
          <div
            className={`absolute ${geometry.pulseTop} h-1.5 pointer-events-none`}
            data-testid="pipeline-rail-flow"
            style={{
              left: `calc(${geometry.halfNode} + (100% - ${geometry.trackShrink}) * ${
                currentIndex / SEGMENTS
              })`,
              width: `calc((100% - ${geometry.trackShrink}) / ${SEGMENTS})`,
            }}
            aria-hidden="true"
          >
            <motion.span
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-500"
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
              transition={CARBON_MOTION.ambient}
            />
          </div>
        )}

        <div className="relative flex justify-between">
          {PIPELINE_STAGES.map((nodeStage, index) => {
            const Icon = STAGE_ICONS[nodeStage];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isCurrentError = isCurrent && variant === "error";
            const isCurrentWaiting = isCurrent && variant === "waiting";

            const nodeClassName = isCompleted
              ? NODE_STYLES.completed
              : isCurrentError
                ? NODE_STYLES.currentError
                : isCurrentWaiting
                  ? NODE_STYLES.currentWaiting
                  : isCurrent
                    ? NODE_STYLES.current
                    : NODE_STYLES.future;

            // Re-keying is what replays the pop: a changed key remounts the
            // circle, so its `initial` runs again.
            const popped =
              advance !== null &&
              !shouldReduceMotion &&
              index >= advance.from &&
              index <= advance.to;

            return (
              <div key={nodeStage} className="flex flex-col items-center gap-1.5">
                <span
                  className={`relative flex items-center justify-center ${geometry.node}`}
                  // Only in dense, where it replaces the visible label. In the
                  // regular rail the name is already printed underneath and a
                  // tooltip repeating it is noise.
                  title={dense ? STAGE_LABELS[nodeStage] : undefined}
                >
                  {isCurrent && !shouldReduceMotion && (
                    <motion.span
                      className={`absolute inline-flex h-full w-full rounded-full ${PULSE_RING_COLOR[pulseKind]}`}
                      initial={{ opacity: 0.5, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.8 }}
                      transition={CARBON_MOTION.ambient}
                      aria-hidden="true"
                    />
                  )}
                  <motion.span
                    key={popped ? `${nodeStage}-${advance.token}` : nodeStage}
                    className={`relative flex items-center justify-center ${geometry.node} rounded-full ${nodeClassName}`}
                    // `false` means "start where you are" — no pop on mount,
                    // and none at all under reduced motion.
                    initial={popped ? { scale: 0.82 } : false}
                    animate={{ scale: 1 }}
                    transition={CARBON_MOTION.advance}
                  >
                    {isCurrentError ? (
                      <FailIcon size={geometry.icon} />
                    ) : isCompleted ? (
                      <CheckCircle size={geometry.icon} />
                    ) : (
                      <Icon size={geometry.icon} />
                    )}
                  </motion.span>
                </span>
                {!dense && (
                  <span
                    className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${
                      isCurrent ? "text-typography-900 font-semibold" : "text-typography-500"
                    }`}
                  >
                    {STAGE_LABELS[nodeStage]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
