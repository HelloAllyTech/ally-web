import { FC } from "react";

import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { useBugHuntStream } from "@hooks";
import { BugHuntRun } from "@types";
import { formatDate } from "@utils";

import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";

/**
 * Bug Hunter at its desk: the one live-updating surface on this tab, and the
 * only place you can watch it work rather than read what it did.
 *
 * There's no in-process emitter on the backend — the pipeline is an external
 * Claude Code agent reporting over HTTP — so `useBugHuntStream` is itself
 * consuming a server-side poll loop, not a true push; from here it still reads
 * and feels like someone narrating their own work as they go.
 */
export const LiveRunCard: FC<{ run: BugHuntRun }> = ({ run }) => {
  const { events, isConnected } = useBugHuntStream(run.id);

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

        {!isConnected && events.length === 0 ? (
          <p className="text-sm text-amber-700">{en.bugHunter.liveRunConnecting}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-amber-700">{en.bugHunter.liveRunNoEventsYet}</p>
        ) : (
          <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            {events.map(event => (
              <li key={event.id} className="text-sm text-typography-800 flex gap-2">
                <span className="text-typography-500 whitespace-nowrap tabular-nums">
                  {formatDate(event.createdAt)}
                </span>
                <span className="font-medium text-amber-700 whitespace-nowrap">
                  {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
                </span>
                <span className="truncate">{event.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
