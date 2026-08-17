import React from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { RoadmapCoinBudget, RoadmapOpportunity, RoadmapOpportunityType } from "@types";

import { CoinAllocator } from "./CoinAllocator";
import { stageLabel, stageStyle, typeLabel } from "./utils/stages";

interface MonthOpportunityCardProps {
  opportunity: RoadmapOpportunity;
  /** Unfiltered max, so the priority bar keeps a stable scale across filters and lanes. */
  maxScore: number;
  budget?: RoadmapCoinBudget;
  canVote: boolean;
  /** False for a viewer without manage rights, and for a card whose month is pinned. */
  canDrag: boolean;
  onCommitCoins: (opportunityId: string, next: number, previous: number) => void;
  onOpen: () => void;
}

/**
 * One card on the month board.
 *
 * The first line of `description` is the heading — there is no separate title field, by design
 * (see RoadmapOpportunity.description), so the card shows line one prominently and clamps the
 * rest rather than inventing a title.
 *
 * DRAG VS CLICK: the whole card is the drag handle, with an 8px activation distance, so a click
 * opens the drawer and a press-and-move reorders. Same constraint and same reason as the saved-view
 * tabs and the sidebar. A separate grip handle was rejected — at this card size it would be the
 * biggest thing on it.
 */
export const MonthOpportunityCard: React.FC<MonthOpportunityCardProps> = ({
  opportunity,
  maxScore,
  budget,
  canVote,
  canDrag,
  onCommitCoins,
  onOpen,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
    disabled: !canDrag,
  });

  const [heading, ...rest] = opportunity.description.split("\n");
  const body = rest.join(" ").trim();
  const scorePercent = Math.round((opportunity.priorityScore / Math.max(1, maxScore)) * 100);

  const card = (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`border-border-light bg-background-primary flex flex-col gap-2 border p-3 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-typography-primary line-clamp-2 text-sm">{heading}</p>
        <span
          className={`shrink-0 px-1.5 py-0.5 text-xs ${
            opportunity.type === RoadmapOpportunityType.BUG
              ? "bg-red-50 text-red-700"
              : "bg-background-secondary text-typography-secondary"
          }`}
        >
          {typeLabel(opportunity.type)}
        </span>
      </div>

      {!!body && <p className="text-typography-secondary line-clamp-2 text-xs">{body}</p>}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`px-1.5 py-0.5 ${stageStyle(opportunity.stage)}`}>
          {stageLabel(opportunity.stage)}
        </span>
        <span className="text-typography-secondary truncate">{opportunity.productGoal}</span>
        {!!opportunity.owner && (
          <span className="text-typography-secondary truncate">· {opportunity.owner}</span>
        )}
      </div>

      {/* Priority bar, same unfiltered scale as the table's, so switching layout doesn't rescale
          every bar and make the same two cards look differently ranked. */}
      <div className="flex items-center gap-2">
        <div className="bg-background-secondary h-1.5 flex-1">
          <div className="bg-primary-500 h-full" style={{ width: `${scorePercent}%` }} />
        </div>
        <span className="text-typography-secondary font-mono text-xs tabular-nums">
          {opportunity.priorityScore}
        </span>
      </div>

      {/* stopPropagation on the wrapper, on BOTH events: click alone is not enough, because
          dnd-kit's PointerSensor activates on pointerdown — without it, holding the `+` button
          starts dragging the card instead of adding coins. */}
      {budget && (
        <div
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <CoinAllocator
            opportunity={opportunity}
            budget={budget}
            onCommit={onCommitCoins}
            disabled={!canVote}
          />
        </div>
      )}
    </div>
  );

  // A pinned card explains itself rather than failing on drop. The backend would answer 422; a
  // tooltip on something that visibly cannot be picked up is a better place to learn that.
  if (opportunity.monthPinned) {
    return (
      <Tooltip
        label={`Shipped in ${opportunity.effectiveMonth ?? "this month"}, so it stays here. Change its stage to plan it into a different month.`}
        align="bottom"
      >
        {card}
      </Tooltip>
    );
  }

  return card;
};
