import React from "react";

import { RoadmapVoteBudget, RoadmapOpportunity } from "@types";

import { priorityBorderColour } from "./utils/priorityColour";
import {
  isConsumerSourced,
  SOURCE_BADGE_STYLE,
  SOURCE_LABEL,
  stageLabel,
  stageStyle,
} from "./utils/stages";
import { VoteButton } from "./VoteButton";

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
          className="text-typography-primary shrink-0 text-2xl font-semibold tabular-nums"
          title={`#${rank} in the queue by total votes`}
        >
          #{rank}
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
          A QUEUE card carries five things and no more: rank, description, product goal, total
          votes, your votes. Stage is dropped because the queue is defined as exactly the three
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
          <span className="text-typography-secondary truncate">{opportunity.productGoal}</span>
          {!isQueueCard && !!opportunity.owner && (
            <span className="text-typography-secondary truncate">· {opportunity.owner}</span>
          )}
          {!isQueueCard && isConsumerSourced(opportunity.source) && (
            <span className={`px-1.5 py-0.5 ${SOURCE_BADGE_STYLE}`}>
              {SOURCE_LABEL[opportunity.source]}
            </span>
          )}
          {/* Total votes. Kept as a NUMBER and not left to the edge colour alone: a hue cannot be
              read by someone who cannot distinguish these hues, and cannot be compared precisely
              by anyone. */}
          <span className="text-typography-secondary tabular-nums">
            · {opportunity.priorityScore} votes
          </span>
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
