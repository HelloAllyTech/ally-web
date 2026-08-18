import { FC } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { useBugHuntStream } from "@hooks";
import { BugHuntEvent, BugHuntEventStage, BugHuntRun, BugHuntRunStatus } from "@types";
import { formatDate } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { PipelineRail } from "./PipelineRail";
import { PipelineStage, stageFromEventStage } from "./pipelineStage";

/**
 * Events that never represent forward progress on the rail — see the mapping's
 * own doc in `pipelineStage.ts`. Callers of `stageFromEventStage` are expected
 * to skip these when picking "the latest event"; this is that skip.
 */
const NON_PROGRESSION_STAGES = new Set<BugHuntEventStage>([
  BugHuntEventStage.SETTINGS_CHANGED,
  BugHuntEventStage.ERROR,
  BugHuntEventStage.ESCALATED,
]);

const latestProgressionStage = (events: BugHuntEvent[]): PipelineStage => {
  for (let index = events.length - 1; index >= 0; index--) {
    if (!NON_PROGRESSION_STAGES.has(events[index].stage)) {
      return stageFromEventStage(events[index].stage);
    }
  }
  return "scan";
};

/**
 * Bug Hunter at its desk: the one live-updating surface on this tab, and the
 * only place you can watch it work rather than read what it did.
 *
 * There's no in-process emitter on the backend — the pipeline is an external
 * Claude Code agent reporting over HTTP — so `useBugHuntStream` is itself
 * consuming a server-side poll loop, not a true push; from here it still reads
 * and feels like someone narrating their own work as they go. The motion here
 * — the rail's progress, each new line sliding in, the spinner and caret — is
 * what carries that feeling; the visuals underneath stay ordinary Carbon.
 */
export const LiveRunCard: FC<{ run: BugHuntRun }> = ({ run }) => {
  const { events, isConnected } = useBugHuntStream(run.id);
  const shouldReduceMotion = useReducedMotion();

  const isRunning = run.status === BugHuntRunStatus.RUNNING;
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  // Only the run's own outright error/escalation overrides the rail's colour
  // — anything else in flight is plain "working" amber.
  const railVariant =
    latestEvent?.stage === BugHuntEventStage.ERROR
      ? "error"
      : latestEvent?.stage === BugHuntEventStage.ESCALATED
        ? "waiting"
        : undefined;

  // The blinking caret: proof the card hasn't frozen, even before the first
  // event or between two far-apart ones. Pure CSS blink (Tailwind's built-in
  // `animate-pulse`), switched off under reduced motion.
  const caret = isRunning && (
    <span
      className="inline-block font-mono text-amber-700 animate-pulse motion-reduce:animate-none"
      aria-hidden="true"
    >
      ▍
    </span>
  );

  return (
    <div>
      <h2 className="text-sm font-semibold text-typography-900 mb-3">
        {en.bugHunter.liveRunSectionTitle}
      </h2>

      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AgentAvatar size="sm" presence="working" animate label={en.bugHunter.agentName} />
          <p className="text-sm font-semibold text-amber-800">
            {en.bugHunter.liveRunTitle.replace("{repo}", run.repo)}
          </p>
        </div>

        <div className="mb-3">
          <PipelineRail stage={latestProgressionStage(events)} variant={railVariant} />
        </div>

        {!isConnected && events.length === 0 ? (
          <p className="text-sm text-amber-700 flex items-center gap-1.5">
            {en.bugHunter.liveRunConnecting}
            {caret}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-amber-700 flex items-center gap-1.5">
            {en.bugHunter.liveRunNoEventsYet}
            {caret}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            <AnimatePresence initial={false}>
              {events.map((event, index) => {
                const isLast = index === events.length - 1;
                return (
                  <motion.li
                    key={event.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="text-sm text-typography-800 flex items-baseline gap-2"
                  >
                    <span className="text-typography-500 whitespace-nowrap tabular-nums font-mono text-xs">
                      {formatDate(event.createdAt)}
                    </span>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-amber-700 whitespace-nowrap">
                      {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
                    </span>
                    <span className="truncate">{event.summary}</span>
                    {/* The one line actually being written right now, if the
                        run is still going — not every in-flight line, just
                        the most recent one. */}
                    {isLast && isRunning && <BrailleSpinner className="text-amber-600" />}
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {isRunning && (
              <li aria-hidden="true" className="flex">
                {caret}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
