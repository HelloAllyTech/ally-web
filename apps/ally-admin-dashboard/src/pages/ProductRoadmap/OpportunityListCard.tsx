import React from "react";

import { RoadmapVoteBudget, RoadmapOpportunity } from "@types";

import { monthLabel } from "./utils/monthBoard";
import { priorityBorderColour } from "./utils/priorityColour";
import {
  isConsumerSourced,
  SOURCE_BADGE_STYLE,
  SOURCE_LABEL,
  stageLabel,
  stageStyle,
} from "./utils/stages";
import { VoteButton } from "./VoteButton";

/**
 * The queue card's three chips: what, who, when — a colour each.
 *
 * A hue per category, rather than one neutral for all three, so the row can be read by POSITION
 * AND COLOUR instead of by reading every chip. Scanning 159 cards for "what is Jan 2027" is a
 * different job from reading one card, and the contents alone (a goal, a person, a month) only
 * separate once you have read them.
 *
 * Colour is never the ONLY signal: each chip's text says what it is, and the order is fixed, so
 * nothing here depends on distinguishing the hues.
 *
 * NO RED AND NO GREEN, deliberately. The card's left border is a continuous red-to-green priority
 * ramp (see priorityBorderColour), and a green chip beside a green edge would read as related to
 * it. Green is also `released` in STAGE_STYLE. Blue, purple and sand sit outside both languages.
 */
const CHIP_BASE = "px-1.5 py-0.5";
/** Goal — brand blue: it is the categorisation the whole board is organised around. */
const GOAL_CHIP_STYLE = `${CHIP_BASE} bg-primary-50 text-primary-700`;
/**
 * Owner — purple. Shares its pair with SOURCE_BADGE_STYLE, which is safe here because the source
 * badge is non-queue only (see the meta row below), so the two never appear on one card.
 */
const OWNER_CHIP_STYLE = `${CHIP_BASE} bg-purple-50 text-purple-700`;
/** Planned month — Carbon's yellow-10/80 sand. Warm, and distinct from the two cool chips. */
const MONTH_CHIP_STYLE = `${CHIP_BASE} bg-warning-50 text-warning-700`;

interface OpportunityListCardProps {
  opportunity: RoadmapOpportunity;
  /** Unfiltered max, so the priority bar keeps a stable scale across pages. */
  maxScore: number;
  /**
   * Queue presentation: stripped to rank, description, product goal, total votes and your votes,
   * and the rank shown at the top left.
   *
   * The rank VALUE is not passed — it comes from `opportunity.queueRank`, computed server-side.
   * This flag only says which layout to draw, so the number and the decision to show it cannot
   * disagree.
   */
  isQueue?: boolean;
  budget?: RoadmapVoteBudget;
  canVote: boolean;
  onSetVotes: (opportunityId: string, next: number, previous: number) => void;
  onOpen: () => void;
}

/**
 * One row of the List view's single-column feed.
 *
 * A wider sibling of MonthOpportunityCard: same stage/goal/owner/source badges and priority bar,
 * but not a drag handle — the feed has no lanes to reorder within, so there is no useSortable
 * here — and it carries the Filed/comments/filer line the table shows in its Opportunity column,
 * since a full-width feed row has room the board's narrow lane card does not. No type badge: see
 * the note above where it renders the heading.
 */
export const OpportunityListCard: React.FC<OpportunityListCardProps> = ({
  opportunity,
  maxScore,
  isQueue = false,
  budget,
  canVote,
  onSetVotes,
  onOpen,
}) => {
  const isQueueCard = isQueue;
  // Null outside the queue stages, so a queue card that has just been released mid-render simply
  // shows no number rather than a stale one.
  const rank = opportunity.queueRank;
  const [heading, ...rest] = opportunity.description.split("\n");
  const body = rest.join(" ").trim();

  return (
    <div
      onClick={onOpen}
      className="border-border-light bg-background-primary flex cursor-pointer items-start gap-4 border border-l-4 p-4"
      // Inline, not a Tailwind class: the ramp is continuous, and Tailwind's JIT can only emit
      // classes it can see as literals at build time. `border-l-4` sets the width; only the
      // colour is dynamic.
      style={{ borderLeftColor: priorityBorderColour(opportunity.priorityScore, maxScore) }}
    >
      {/*
        Rank at the top left, against the priority-coloured edge: it is the first thing to read on
        a queue card, and in the meta row it sat fourth in a line of small grey text.

        Computed by ally-be over the whole queue, not from this card's position on screen — so it
        is the same number whether you are looking at all 159 or the three that match a search,
        and it survives sorting the feed by date. A big "#3" means the third thing in the queue,
        which is what it looks like it means.
      */}
      {isQueueCard && rank !== null && (
        <div
          className="text-typography-primary flex shrink-0 flex-col items-center"
          title={`#${rank} in the queue by total votes`}
        >
          <span className="text-2xl font-semibold leading-none tabular-nums">#{rank}</span>
          {/*
            Total votes sits UNDER the rank, not in the meta row, because it is the thing the
            rank is computed from — "#1" and "60 votes" are one fact stated twice, at two levels
            of precision, and reading them together is what makes the ranking legible. In the
            meta row it was a trailing item in a line of small grey text, so comparing two cards
            meant scanning to a different horizontal position on each one; stacked, the numbers
            line up in a column down the feed.

            Kept as a NUMBER and not left to the priority-coloured edge alone: a hue cannot be
            read by someone who cannot distinguish these hues, and cannot be compared precisely
            by anyone.
          */}
          <span className="text-typography-secondary text-xs tabular-nums">
            {opportunity.priorityScore} votes
          </span>
        </div>
      )}

      {/* The card is a ROW now: everything readable in a column on the left, the vote button
          on its own at the top right. It used to sit at the bottom of the column, which put the
          one interactive thing on the card below three blocks of text — furthest from the eye
          and a different distance down on every card, since the descriptions vary in height.
          items-start keeps it pinned to the top rather than stretching or centring. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* No type badge: bugs were split out to their own Bug Hunter-backed tab (see the tab
            list on RoadmapTab.BUGS in ProductRoadmap.tsx), so every row here is an idea and a
            badge that never varies is just noise repeated down the whole feed. */}
        <p className="text-typography-primary text-sm font-medium">{heading}</p>

        {!!body && <p className="text-typography-secondary line-clamp-2 text-sm">{body}</p>}

        {/*
          A QUEUE card carries: rank, description, product goal, owner, planned month, total
          votes and your votes — rank and total votes together in the left column, your votes in
          the control on the right, and this row for goal, owner and month. Stage is dropped because the queue is defined as exactly the three
          working stages, so the badge only ever says one of three things and never changes what
          you would do about the card. Owner, source, filed date, comment count and author are
          dropped for the same reason — the queue is for deciding what is next, and everything
          else is available one click away in the drawer.

          Outside the queue this is a general-purpose list card and keeps the full set.
        */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {!isQueueCard && (
            <span className={`px-1.5 py-0.5 ${stageStyle(opportunity.stage)}`}>
              {stageLabel(opportunity.stage)}
            </span>
          )}
          {/*
            The product goal, as a chip on the queue and as plain text everywhere else.

            On a queue card it is one of three peer facts — goal, owner, month — and leaving it
            unstyled made the row read as "one label, then two chips", implying a hierarchy that
            is not there. Outside the queue this span sits in a "·"-separated meta line with the
            owner, source and vote count, where a single chip among separators would be the odd
            one out instead.
          */}
          {isQueueCard ? (
            <span className={GOAL_CHIP_STYLE}>{opportunity.productGoal}</span>
          ) : (
            <span className="text-typography-secondary truncate">{opportunity.productGoal}</span>
          )}

          {/*
            Owner and planned month, queue-only. The two questions a triage pass asks after "what
            is it" are "whose is it" and "when is it meant to land", and both were a drawer click
            away. The non-queue card already carries owner in its meta line and does not need
            these.

            RENDERED ONLY WHEN SET. No "No owner" / "Unscheduled" placeholder, because on this
            board unowned and unscheduled ARE the common case — a chip on every one of 159 rows
            saying so is noise rather than signal, the same reasoning that keeps the 'staff'
            source badge off every row (Stacks: "Default to Common Case, Hide Alternatives"). The
            absence of a chip is the fact. Those two labels exist in laneLabel for the board's
            catch-all lanes, where a lane must be named even when its contents are defined by
            what they lack.
          */}
          {isQueueCard && !!opportunity.owner && (
            <span className={OWNER_CHIP_STYLE}>{opportunity.owner}</span>
          )}
          {isQueueCard && !!opportunity.plannedMonth && (
            // monthLabel, not the raw "2026-08": it renders "Aug 2026", and it is the same helper
            // the month board's lane headings use, so a card and its lane cannot disagree.
            <span className={MONTH_CHIP_STYLE}>{monthLabel(opportunity.plannedMonth)}</span>
          )}
          {!isQueueCard && !!opportunity.owner && (
            <span className="text-typography-secondary truncate">· {opportunity.owner}</span>
          )}
          {!isQueueCard && isConsumerSourced(opportunity.source) && (
            <span className={`px-1.5 py-0.5 ${SOURCE_BADGE_STYLE}`}>
              {SOURCE_LABEL[opportunity.source]}
            </span>
          )}
          {/* Total votes, for the cards that have no rank to sit under — outside the queue
              there is no rank column, so this stays where it always was. Same reasoning as the
              queue placement: a number, not just the edge colour. */}
          {!isQueueCard && (
            <span className="text-typography-secondary tabular-nums">
              · {opportunity.priorityScore} votes
            </span>
          )}
        </div>

        {!isQueueCard && (
          <div className="text-typography-secondary text-xs">
            Filed {new Date(opportunity.createdAt).toISOString().slice(0, 10)}
            {opportunity.commentCount > 0 && <span> · {opportunity.commentCount} comments</span>}
            {opportunity.creator && (
              <span> · {opportunity.creator.name || opportunity.creator.email}</span>
            )}
          </div>
        )}
      </div>

      {/* stopPropagation on BOTH events, matching the board card: click alone would still let a
          vote button pointerdown reach the row's own click handler first. */}
      {budget && (
        <div
          className="shrink-0"
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <VoteButton
            opportunity={opportunity}
            budget={budget}
            onSetVotes={onSetVotes}
            disabled={!canVote}
            orientation="vertical"
          />
        </div>
      )}
    </div>
  );
};
