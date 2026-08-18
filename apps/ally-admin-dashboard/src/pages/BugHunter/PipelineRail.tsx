import { FC } from "react";

import { Branch, CheckCircle, Chemistry, Debug, FailIcon, Flag, Merge, Search } from "@icons";
import { motion, useReducedMotion } from "framer-motion";

import { en } from "@constants";

import { PIPELINE_STAGES, PipelineStage } from "./pipelineStage";

export interface PipelineRailProps {
  /** Where the bug/run currently stands, derived by `stageFromEventStage`/`stageFromFindingStatus`. */
  stage: PipelineStage;
  /**
   * Overrides the current node's colour without moving its position on the
   * rail — a bug can be stuck at the same stage for two different reasons (an
   * outright failure vs. an open question it's waiting on), and the rail
   * should say which without implying it moved backward or forward.
   */
  variant?: "error" | "waiting";
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
 */
export const PipelineRail: FC<PipelineRailProps> = ({ stage, variant }) => {
  const shouldReduceMotion = useReducedMotion();
  const currentIndex = PIPELINE_STAGES.indexOf(stage);
  const progress = currentIndex / (PIPELINE_STAGES.length - 1);
  const pulseKind = variant === "error" ? "error" : variant === "waiting" ? "waiting" : "working";

  return (
    <div
      className="border border-border-light rounded-lg bg-white px-4 py-4"
      role="group"
      aria-label={en.bugHunter.pipelineRailLabel}
    >
      <div className="text-[11px] font-mono uppercase tracking-wide text-typography-500 mb-4">
        {en.bugHunter.pipelineRailLabel}
      </div>

      <div className="relative pt-1">
        {/* Static neutral track, full width. */}
        <div
          className="absolute left-4 right-4 top-[15px] h-0.5 bg-border-light"
          aria-hidden="true"
        />
        {/* Coloured fill whose width animates to the new stage. Track spans
            from the first node's centre to the last's — inset by half a node
            width (1rem) on each side, matching the `left-4`/`right-4` track
            above — so the width is `progress` of (100% - 2rem). */}
        <motion.div
          className="absolute left-4 top-[15px] h-0.5 bg-green-500"
          initial={false}
          animate={{ width: `calc((100% - 2rem) * ${progress})` }}
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
                <span className="relative flex items-center justify-center h-8 w-8">
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
                    className={`relative flex items-center justify-center h-8 w-8 rounded-full ${nodeClassName}`}
                  >
                    {isCurrentError ? (
                      <FailIcon size={16} />
                    ) : isCompleted ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Icon size={16} />
                    )}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide whitespace-nowrap ${
                    isCurrent ? "text-typography-900 font-semibold" : "text-typography-500"
                  }`}
                >
                  {STAGE_LABELS[nodeStage]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
