import { FC } from "react";

import { Branch, CheckCircle, Chemistry, Debug, FailIcon, Flag, Merge, Search } from "@icons";
import { motion, useReducedMotion } from "framer-motion";

import { en } from "@constants";

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
    trackInset: "left-4 right-4",
    fillInset: "left-4",
    trackTop: "top-[15px]",
    wrapper: "relative pt-1",
  },
  dense: {
    node: "h-5 w-5",
    icon: 12,
    /** Half a node (0.625rem) each side. */
    trackShrink: "1.25rem",
    trackInset: "left-2.5 right-2.5",
    fillInset: "left-2.5",
    trackTop: "top-[9px]",
    wrapper: "relative",
  },
} as const;

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
 * That last sentence is why `dense` exists. This rail was reachable from
 * exactly one place — the drawer, for one bug, if you opened it — so the
 * feature's clearest statement of forward motion was also its best-hidden
 * one. `dense` is the same rail sized to sit in a list row, which is what lets
 * `LiveWorkBoard` show every in-flight bug's position at once on the page
 * itself. It is a second size, deliberately not a second component: the six
 * stages, their order, their colours and the pulse are defined here once.
 */
export const PipelineRail: FC<PipelineRailProps> = ({ stage, variant, dense = false }) => {
  const shouldReduceMotion = useReducedMotion();
  const currentIndex = PIPELINE_STAGES.indexOf(stage);
  const progress = currentIndex / (PIPELINE_STAGES.length - 1);
  const pulseKind = variant === "error" ? "error" : variant === "waiting" ? "waiting" : "working";
  const geometry = dense ? GEOMETRY.dense : GEOMETRY.regular;

  // Dense has no visible stage labels, so it has to say where it is some other
  // way — the group's own name carries the current stage and its position,
  // which is the sentence the labels would otherwise have spelled out.
  const groupLabel = dense
    ? en.bugHunter.pipelineRailDenseLabel
        .replace("{stage}", STAGE_LABELS[stage])
        .replace("{step}", String(currentIndex + 1))
        .replace("{total}", String(PIPELINE_STAGES.length))
    : en.bugHunter.pipelineRailLabel;

  return (
    <div
      className={dense ? "" : "border border-border-light rounded-lg bg-white px-4 py-4"}
      role="group"
      aria-label={groupLabel}
    >
      {!dense && (
        <div className="text-[11px] font-mono uppercase tracking-wide text-typography-500 mb-4">
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
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeInOut" }}
        />

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
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative flex items-center justify-center ${geometry.node} rounded-full ${nodeClassName}`}
                  >
                    {isCurrentError ? (
                      <FailIcon size={geometry.icon} />
                    ) : isCompleted ? (
                      <CheckCircle size={geometry.icon} />
                    ) : (
                      <Icon size={geometry.icon} />
                    )}
                  </span>
                </span>
                {!dense && (
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wide whitespace-nowrap ${
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
