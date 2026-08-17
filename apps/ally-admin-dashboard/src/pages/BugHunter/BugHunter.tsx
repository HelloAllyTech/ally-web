import { FC, useState } from "react";

import { useGetBugHunterSettingsQuery, useGetBugHuntRunsQuery } from "@api";
import { BugHunterMode, BugHuntRun, BugHuntRunStatus } from "@types";

import { AboutAgent } from "./AboutAgent";
import { AgentProfileCard } from "./AgentProfileCard";
import { BugFindingsTable } from "./BugFindingsTable";
import { LiveRunCard } from "./LiveRunCard";
import { NotificationInbox } from "./NotificationInbox";
import { RunHistoryTable } from "./RunHistoryTable";

/**
 * Bug Hunter's tab, laid out as a colleague rather than a control panel:
 * who they are and what they're doing → what they're doing right now → what
 * they've said to you → the bugs they're tracking → their shift log.
 *
 * This file is layout only. Every surface below fetches what it needs, and
 * the working-style control lives on the profile card with the rest of the
 * character's details.
 */
export const BugHunter: FC = () => {
  // Both queries are already in flight from the profile card with identical
  // args, so these read the same RTK Query cache entries rather than adding
  // requests. Kept here because layout decisions depend on them.
  const { data: settings } = useGetBugHunterSettingsQuery();
  const { data: runsData } = useGetBugHuntRunsQuery(undefined, { pollingInterval: 10_000 });

  // Clicking a message opens that bug in the findings table's drawer, rather
  // than the inbox carrying a second copy of it.
  const [inboxFindingId, setInboxFindingId] = useState<string | null>(null);

  const runs: BugHuntRun[] = runsData?.items ?? [];
  const liveRun = runs.find(run => run.status === BugHuntRunStatus.RUNNING);
  // Nobody has put Bug Hunter on duty yet, so nothing below the card has
  // anything in it — that is the one moment "About me" is the most useful
  // thing on the page, and it goes directly under the card. Once it's working,
  // reference material belongs at the bottom, out of the way of the work.
  const isOffDuty = settings?.mode === BugHunterMode.OFF;

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <AgentProfileCard />

      {isOffDuty && (
        <div className="mt-8 shrink-0">
          <AboutAgent />
        </div>
      )}

      {liveRun && (
        <div className="mt-8 shrink-0">
          <LiveRunCard run={liveRun} />
        </div>
      )}

      <div className="mt-8 shrink-0">
        <NotificationInbox onOpenFinding={setInboxFindingId} />
      </div>

      <div className="mt-8 shrink-0">
        <BugFindingsTable
          focusFindingId={inboxFindingId}
          onFocusHandled={() => setInboxFindingId(null)}
        />
      </div>

      <div className="mt-8 shrink-0">
        <RunHistoryTable />
      </div>

      {!isOffDuty && (
        <div className="mt-8 flex-1">
          <AboutAgent />
        </div>
      )}
    </div>
  );
};
