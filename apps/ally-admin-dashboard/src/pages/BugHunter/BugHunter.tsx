import { FC, useState } from "react";

import { useGetBugFindingsQuery, useGetBugHunterSettingsQuery } from "@api";
import { BugFinding, BugHunterMode } from "@types";

import { AboutAgent } from "./AboutAgent";
import { AgentProfileCard } from "./AgentProfileCard";
import { BugFindingsTable } from "./BugFindingsTable";
import { NeedsYouQueue } from "./NeedsYouQueue";
import { NotificationInbox } from "./NotificationInbox";
import { RunHistoryTable } from "./RunHistoryTable";

import type { BucketFilter } from "./LifecycleBucketChips";

/**
 * Bug Hunter's tab, laid out as a colleague rather than a control panel — and
 * ordered by whose move it is rather than by who is being introduced.
 *
 * ## The order, and why it changed
 *
 * It used to run: profile card → messages → bugs table → shift log. Reasonable
 * on paper, and wrong in practice for one measurable reason: the card was about
 * 450px tall and the messages bar another 75px, so on a 1000×600 viewport the
 * first actual bug sat below the fold. An admin arriving because the card said
 * "4 bugs are waiting on your call" had to scroll past that sentence to reach
 * anything they could act on, then find those four among a hundred date-sorted
 * rows where seventeen different status pills were equally loud.
 *
 * Now: card → **what I need from you** → messages → bugs → shift log. The queue
 * is the only new surface, it renders nothing at all when nothing is blocked,
 * and when it does render it holds the decision itself rather than a pointer to
 * where the decision lives.
 *
 * ## What each surface is for
 *
 * - `AgentProfileCard` — who it is, what it is doing, how much rope it has.
 * - `NeedsYouQueue` — your unfinished work, with the buttons on it. Absent when
 *   there is none, which is what keeps it the one coloured region on the page.
 * - `NotificationInbox` — everything it has said to you, collapsed to a line.
 * - `BugFindingsTable` — every bug it knows about, filterable and searchable.
 * - `RunHistoryTable` — its shift log.
 * - `AboutAgent` — reference material, and the most useful thing here on the
 *   one occasion nothing else has any content: before anyone has put it on duty.
 *
 * This file stays layout plus the two pieces of state that genuinely span
 * surfaces. Everything else each surface fetches for itself, from the same RTK
 * Query cache entries.
 */
export const BugHunter: FC = () => {
  // Already in flight from the profile card with identical args, so both of
  // these read the same RTK Query cache entries rather than adding requests.
  // Kept here because the layout decision below depends on the mode, and the
  // queue needs the findings.
  const { data: settings } = useGetBugHunterSettingsQuery();
  const { data: findingsData } = useGetBugFindingsQuery(
    { status: "all", limit: 100 },
    { pollingInterval: 15_000 },
  );

  // Clicking a message, or a card in the queue, opens that bug in the findings
  // table's drawer — rather than either surface carrying a second copy of it.
  const [focusFindingId, setFocusFindingId] = useState<string | null>(null);

  // The bugs table's lifecycle filter lives here rather than inside the table
  // because it is what the chip row publishes about the page as a whole: the
  // breakdown a reader scans and the filter they set are one control, and the
  // table's own "clear filters" has to be able to reset it.
  const [bucket, setBucket] = useState<BucketFilter>("all");

  const findings: BugFinding[] = findingsData?.items ?? [];

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

      {/* Renders null when nothing is blocked, so this is a no-op margin on a
          quiet day rather than an empty section with a heading over it. */}
      <div className="mt-8 shrink-0 empty:mt-0">
        <NeedsYouQueue findings={findings} onOpen={setFocusFindingId} />
      </div>

      <div className="mt-8 shrink-0">
        <NotificationInbox onOpenFinding={setFocusFindingId} />
      </div>

      <div className="mt-8 shrink-0">
        <BugFindingsTable
          focusFindingId={focusFindingId}
          onFocusHandled={() => setFocusFindingId(null)}
          bucket={bucket}
          onBucketChange={setBucket}
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
