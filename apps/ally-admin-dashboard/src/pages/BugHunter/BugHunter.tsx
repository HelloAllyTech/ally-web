import { FC, useState } from "react";

import { useGetBugFindingsQuery, useGetBugHunterSettingsQuery } from "@api";
import { BugFinding, BugHunterMode } from "@types";

import { AboutAgent } from "./AboutAgent";
import { AgentProfileCard } from "./AgentProfileCard";
import { AgentScorecard } from "./AgentScorecard";
import { BugFindingsTable } from "./BugFindingsTable";
import { useBugHunterUrlState } from "./bugHunterUrlState";
import { KeyboardShortcutSheet } from "./KeyboardShortcutSheet";
import { LiveWorkBoard } from "./LiveWorkBoard";
import { NeedsYouQueue } from "./NeedsYouQueue";
import { NotificationInbox } from "./NotificationInbox";
import { RunHistoryTable } from "./RunHistoryTable";

/**
 * Bug Hunter's tab, laid out as a colleague rather than a control panel — and
 * ordered by whose move it is rather than by who is being introduced.
 *
 * ## The order, and why it is what it is
 *
 * `card → what I need from you → on it right now → messages → bugs →
 * scorecard → shift log`.
 *
 * The first five are ordered by whose move it is. An earlier version led with
 * the profile card and the message bar, which together stood about 525px tall
 * and pushed the first actionable bug below the fold on a 1000×600 viewport: an
 * admin arriving because the card said "4 bugs are waiting on your call" had to
 * scroll past that sentence to reach anything they could act on. The queue
 * fixed that by holding the decision itself, and by rendering nothing at all
 * when nothing is blocked.
 *
 * "On it right now" sits third for the same reason: your blocked work outranks
 * the agent's own, but its work in progress outranks a log of what it has
 * already said. It is also the section that was missing entirely — everything
 * above and below it is a record, and the agent's live work had no page-level
 * surface at all beyond one sentence on the card. See `LiveWorkBoard`'s module
 * doc for what that cost.
 *
 * The last two are ordered by who is asking. Everything above the scorecard
 * serves a *reviewer* working a queue; the scorecard and the shift log serve a
 * *governor* asking whether this thing should still be merging its own code —
 * Stacks' *Interface patterns for evolving human roles in agent systems* is the
 * argument for treating those as two readers rather than one. That question is
 * asked deliberately and roughly monthly, so it goes below the work rather than
 * above it, directly on top of the per-run ledger it aggregates.
 *
 * ## What each surface is for
 *
 * - `AgentProfileCard` — who it is, what it is doing, how much rope it has.
 * - `NeedsYouQueue` — your unfinished work, with the buttons on it. Absent when
 *   there is none, which is what keeps it the one coloured region on the page.
 * - `LiveWorkBoard` — what it is doing this minute, and what finished in the
 *   last few seconds. Absent when nothing is moving, for the same reason the
 *   queue is absent when nothing is blocked.
 * - `NotificationInbox` — everything it has said to you, collapsed to a line.
 * - `BugFindingsTable` — every bug it knows about: filterable, searchable,
 *   selectable, and workable from the keyboard.
 * - `AgentScorecard` — what it has cost and what that bought.
 * - `RunHistoryTable` — its shift log.
 * - `AboutAgent` — reference material, and the most useful thing here on the
 *   one occasion nothing else has any content: before anyone has put it on duty.
 *
 * ## This file owns layout and one piece of state
 *
 * The filters and the open bug used to live here as `useState` and be threaded
 * down as a `focusFindingId`/`onFocusHandled` pair. They live in the query
 * string now (`useBugHunterUrlState`), which deleted that threading: the queue
 * and the inbox "open a drawer" by writing `?bug=<id>`, and the table opens the
 * drawer because it reads it. Nothing has to hand a callback to anything.
 *
 * What is left here is the shortcut sheet's open flag, which is genuinely
 * page-level: `?` should raise it whether the reader's attention is on the
 * table or on the queue.
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

  const { setBug } = useBugHunterUrlState();
  const [showShortcuts, setShowShortcuts] = useState(false);

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
        <NeedsYouQueue findings={findings} onOpen={setBug} />
      </div>

      {/* Present tense, and the agent's own move rather than yours. Renders
          null when nothing is in flight, so like the queue above it this is a
          no-op margin on a quiet night. */}
      <div className="mt-8 shrink-0 empty:mt-0">
        <LiveWorkBoard findings={findings} onOpen={setBug} />
      </div>

      <div className="mt-8 shrink-0">
        <NotificationInbox onOpenFinding={setBug} />
      </div>

      <div className="mt-8 shrink-0">
        <BugFindingsTable onShowShortcuts={() => setShowShortcuts(true)} />
      </div>

      {/* The governor's half of the page. Below the work on purpose — see the
          module doc on why these last two sections are ordered by reader
          rather than by urgency. */}
      <div className="mt-8 shrink-0">
        <AgentScorecard />
      </div>

      <div className="mt-8 shrink-0">
        <RunHistoryTable />
      </div>

      {!isOffDuty && (
        <div className="mt-8 flex-1">
          <AboutAgent />
        </div>
      )}

      {showShortcuts && <KeyboardShortcutSheet onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
