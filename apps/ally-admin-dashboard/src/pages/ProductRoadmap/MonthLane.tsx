import React from "react";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { RoadmapCoinBudget, RoadmapMonthLane } from "@types";

import { MonthOpportunityCard } from "./MonthOpportunityCard";
import { isDraggable, laneDomId, monthLabel } from "./utils/monthBoard";

interface MonthLaneProps {
  lane: RoadmapMonthLane;
  /** Highlights the lane for the month we are currently in. */
  isCurrentMonth: boolean;
  maxScore: number;
  budget?: RoadmapCoinBudget;
  canVote: boolean;
  canManage: boolean;
  onCommitCoins: (opportunityId: string, next: number, previous: number) => void;
  onOpenOpportunity: (id: string) => void;
}

/**
 * One month column.
 *
 * The column is a droppable in its OWN right, not just a SortableContext. Dropping onto a lane's
 * empty space reports the lane as `over` rather than a card — without the droppable, an empty
 * month could never be a drop target, which is precisely the lane you most want to drag into when
 * you start planning a month.
 *
 * EMPTY LANES ARE RENDERED, NOT COLLAPSED. A month with nothing in it is information: collapsing
 * it would put March next to June and hide that nothing is planned between them.
 */
export const MonthLane: React.FC<MonthLaneProps> = ({
  lane,
  isCurrentMonth,
  maxScore,
  budget,
  canVote,
  canManage,
  onCommitCoins,
  onOpenOpportunity,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: laneDomId(lane.month) });
  const hidden = lane.total - lane.items.length;

  return (
    <section className="flex w-72 shrink-0 flex-col">
      <header
        className={`flex items-baseline justify-between gap-2 border-b px-1 pb-2 ${
          isCurrentMonth ? "border-primary-500" : "border-border-light"
        }`}
      >
        <h3
          className={`text-sm ${
            isCurrentMonth ? "text-primary-600" : "text-typography-primary"
          }`}
        >
          {monthLabel(lane.month)}
          {isCurrentMonth && (
            <span className="text-typography-secondary ml-1 text-xs">· this month</span>
          )}
        </h3>
        <span className="text-typography-secondary font-mono text-xs tabular-nums">
          {lane.total}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-col gap-2 p-1 ${
          isOver ? "bg-primary-50" : "bg-transparent"
        }`}
      >
        <SortableContext
          items={lane.items.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {lane.items.map(opportunity => (
            <MonthOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              maxScore={maxScore}
              budget={budget}
              canVote={canVote}
              // Manage rights AND an unpinned month. A shipped card is locked to the month it
              // shipped in and says so in a tooltip, rather than being dragged into a 422.
              canDrag={canManage && isDraggable(opportunity)}
              onCommitCoins={onCommitCoins}
              onOpen={() => onOpenOpportunity(opportunity.id)}
            />
          ))}
        </SortableContext>

        {lane.items.length === 0 && (
          <p className="text-typography-secondary px-2 py-6 text-center text-xs">
            {canManage ? "Drag something here to plan it" : "Nothing planned"}
          </p>
        )}

        {/* A truncated lane says so. Silently stopping at laneLimit would make the column's count
            disagree with what it shows, and the count is the number people plan against. */}
        {hidden > 0 && (
          <p className="text-typography-secondary px-2 py-1 text-center text-xs">
            +{hidden} more not shown
          </p>
        )}
      </div>
    </section>
  );
};
