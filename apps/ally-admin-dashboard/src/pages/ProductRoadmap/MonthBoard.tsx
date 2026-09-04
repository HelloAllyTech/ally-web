import React from "react";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { SkeletonText } from "@ally-ui-mono/ui-shared";
import { useMoveRoadmapOpportunityMutation } from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapBoardGroupBy,
  RoadmapBoardQuery,
  RoadmapBoardResponse,
  RoadmapVoteBudget,
  RoadmapFacets,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { MonthLane } from "./MonthLane";
import { RoadmapFilterBar, hasActiveFilters } from "./RoadmapFilterBar";
import { useSetVotes } from "./useSetVotes";
import { RoadmapAdvancedFilterValues } from "./utils/filters";
import { RoadmapEffortFilterValue } from "./utils/filterSelection";
import {
  LaneSnapshot,
  laneSupportsReordering,
  monthLabel,
  resolveDrop,
  shiftMonthKey,
  laneSupportsMoving,
} from "./utils/monthBoard";

/** How far the prev/next arrows move the window. Mirrors ROADMAP_BOARD_DEFAULTS in ally-be. */
const WINDOW_STEP_MONTHS = 3;

interface MonthBoardProps {
  /** What the lanes are. Month keeps the window stepper and hand-ordering; the others drop both. */
  groupBy: RoadmapBoardGroupBy;
  /** MUST be the same memoised object passed to useGetRoadmapBoardQuery — see useSetVotes. */
  boardArgs: RoadmapBoardQuery;
  /** Threaded to RoadmapFilterBar. True on the Queue's board, where stage IS the view. */
  stageLocked?: boolean;
  data?: RoadmapBoardResponse;
  isLoading: boolean;
  isFetching: boolean;
  budget?: RoadmapVoteBudget;
  goals: RoadmapTaxonomyItem[];
  facets?: RoadmapFacets;
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: RoadmapOpportunityType[];
  onTypeFilterChange: (value: RoadmapOpportunityType[]) => void;
  stageFilter: RoadmapOpportunityStage[];
  onStageFilterChange: (value: RoadmapOpportunityStage[]) => void;
  sourceFilter: RoadmapOpportunitySource[];
  onSourceFilterChange: (value: RoadmapOpportunitySource[]) => void;
  effortFilter: RoadmapEffortFilterValue[];
  onEffortFilterChange: (value: RoadmapEffortFilterValue[]) => void;
  goalFilter: string[];
  onGoalFilterChange: (value: string[]) => void;
  ownerFilter: string[];
  onOwnerFilterChange: (value: string[]) => void;
  advanced: RoadmapAdvancedFilterValues;
  onAdvancedChange: (next: RoadmapAdvancedFilterValues) => void;
  canVote: boolean;
  canManage: boolean;
  onOpenOpportunity: (id: string) => void;
  onAddClick: () => void;
  /** False on the Queue view, whose filters are its definition. Threaded to RoadmapFilterBar. */
  showFilters?: boolean;
  /** The month window. Held by the page so a saved view and the URL can carry it. */
  window: { from: string; to: string };
  onWindowChange: (next: { from: string; to: string }) => void;
  layoutToggle?: React.ReactNode;
}

/**
 * The month board: opportunities and bugs in the month they are planned for.
 *
 * WHY THIS IS NOT THE TABLE WITH GROUPING TURNED ON. The table paginates by offset, which a lane
 * layout cannot use — filling the first 50 rows of an offset window would stuff the earliest month
 * and leave every later one looking empty. So the board bounds by MONTH instead: a small window
 * you step through, where each lane is complete and reports its own total.
 *
 * A CARD'S LANE IS ITS PLANNED MONTH, UNTIL IT SHIPS. After that its lane is the month it actually
 * shipped in, `plannedMonth` still remembers what was intended, and the card can no longer be
 * dragged. That is the point of the whole surface: planned for March, shipped in May, and the slip
 * stays visible instead of being quietly rewritten.
 *
 * ONLY THE DESTINATION LANE IS WRITTEN on a drop — see resolveDrop for why the source lane's gaps
 * are harmless.
 */
export const MonthBoard: React.FC<MonthBoardProps> = props => {
  const {
    boardArgs,
    stageLocked,
    data,
    isLoading,
    isFetching,
    budget,
    goals,
    facets,
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    stageFilter,
    onStageFilterChange,
    sourceFilter,
    onSourceFilterChange,
    effortFilter,
    onEffortFilterChange,
    goalFilter,
    onGoalFilterChange,
    ownerFilter,
    onOwnerFilterChange,
    advanced,
    onAdvancedChange,
    canVote,
    canManage,
    groupBy,
    onOpenOpportunity,
    onAddClick,
    showFilters,
    window: monthWindow,
    onWindowChange,
    layoutToggle,
  } = props;

  const [moveOpportunity] = useMoveRoadmapOpportunityMutation();
  const allocate = useSetVotes({ kind: "board", args: boardArgs });

  // Press-and-drag: a click under the threshold opens the drawer, a press-and-move reorders. Same
  // constraint as the saved-view tabs and the sidebar, for the same reason.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const lanes = data?.lanes ?? [];
  const activeFilters = hasActiveFilters({
    typeFilter,
    stageFilter,
    sourceFilter,
    effortFilter,
    goalFilter,
    ownerFilter,
    advanced,
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !data) return;
    // Filed-by lanes are read-only — MonthLane already refuses the drag, and this catches any
    // path that still produces a drop, so the server's guaranteed 422 is never requested.
    if (!laneSupportsMoving(groupBy)) return;

    const snapshots: LaneSnapshot[] = lanes.map(lane => ({
      key: lane.key,
      ids: lane.items.map(o => o.id),
    }));
    const drop = resolveDrop(snapshots, String(active.id), String(over.id));
    // null means a no-op — dropped where it started, or on something unresolvable. Firing a write
    // anyway would broadcast to every other board for nothing.
    if (!drop) return;
    // A within-lane drag on a board that has no hand-ordering is also a no-op: only the month
    // board stores a position, so reordering "Prioritised" would send a write that changes
    // nothing and then snap the card back on the next fetch.
    if (drop.withinLane && !laneSupportsReordering(groupBy)) return;

    try {
      await moveOpportunity({
        opportunityId: String(active.id),
        groupBy,
        lane: drop.key,
        // Month only — the other groupings have nothing to reorder, and sending an order they
        // would ignore invites the client to believe it was applied.
        orderedIds: laneSupportsReordering(groupBy) ? drop.orderedIds : undefined,
        boardArgs,
      }).unwrap();
    } catch (error) {
      // The optimistic patch has already been undone by the mutation's own error path; this only
      // surfaces WHY. The 422 for a shipped card names the month it shipped in.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not move that card. Refresh to see where it is now.";
      toast.error(message);
    }
  };

  const stepWindow = (delta: number) =>
    onWindowChange({
      from: shiftMonthKey(monthWindow.from, delta),
      to: shiftMonthKey(monthWindow.to, delta),
    });

  // The arrows go dead at the ends of the real data rather than scrolling into empty years. Bounds
  // are unfiltered, so they don't move as you type in the search box.
  const canGoEarlier = !data?.bounds.earliest || monthWindow.from > data.bounds.earliest;
  const canGoLater = !data?.bounds.latest || monthWindow.to < data.bounds.latest;

  return (
    <div className="flex flex-col gap-3">
      <RoadmapFilterBar
        showFilters={showFilters}
        stageLocked={stageLocked}
        search={search}
        onSearchChange={onSearchChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        stageFilter={stageFilter}
        onStageFilterChange={onStageFilterChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={onSourceFilterChange}
        effortFilter={effortFilter}
        onEffortFilterChange={onEffortFilterChange}
        goalFilter={goalFilter}
        onGoalFilterChange={onGoalFilterChange}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={onOwnerFilterChange}
        advanced={advanced}
        onAdvancedChange={onAdvancedChange}
        goals={goals}
        facets={facets}
        canVote={canVote}
        canManage={canManage}
        trailing={layoutToggle}
      />

      <div className="flex items-center justify-between gap-2">
        {/*
          The window stepper is MONTH-ONLY. A stage or owner board has no window — the server
          ignores from/to there and returns every lane — so leaving the arrows up would offer a
          control that silently does nothing, which reads as broken rather than as inapplicable.
          The window itself is kept in state, so switching to Month returns to where you were.
        */}
        {groupBy === RoadmapBoardGroupBy.MONTH ? (
          <div className="flex items-center gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={() => stepWindow(-WINDOW_STEP_MONTHS)}
              disabled={!canGoEarlier}
            >
              ← Earlier
            </Button>
            <span className="text-typography-secondary text-sm">
              {monthLabel(monthWindow.from)} – {monthLabel(monthWindow.to)}
            </span>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={() => stepWindow(WINDOW_STEP_MONTHS)}
              disabled={!canGoLater}
            >
              Later →
            </Button>
          </div>
        ) : (
          <span />
        )}
        {isFetching && <span className="text-typography-secondary text-xs">updating…</span>}
      </div>

      {data?.truncated && (
        <p className="text-typography-secondary text-xs">
          This board is showing a capped number of cards. Narrow the filters or the month range to
          see every one.
        </p>
      )}

      {isLoading ? (
        <SkeletonText paragraph lineCount={8} />
      ) : lanes.every(lane => lane.total === 0) ? (
        <EmptyState
          title={activeFilters || search ? "Nothing in these months" : "No opportunities yet"}
          subtitle={
            activeFilters || search
              ? "No opportunities match these filters in this month range."
              : "File the first one to start collecting votes."
          }
          {...(canVote && !activeFilters && !search
            ? { actionLabel: "New opportunity", onAction: onAddClick }
            : {})}
        />
      ) : (
        // ONE DndContext across every lane — that is what makes a card draggable BETWEEN months.
        // A context per lane would confine each drag to its own column.
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* `relative` is load-bearing here for the same reason as the table's TableContainer:
              Carbon tooltip internals are position:absolute and escape a `static` overflow-scroll
              ancestor, inflating its scrollHeight into a phantom second scrollbar. */}
          <div className="relative flex gap-3 overflow-x-auto pb-2">
            {/* Unscheduled sits FIRST and is always rendered: it is the lane people drag out of,
                and on a board nobody has planned yet it holds everything. */}
            {lanes.map(lane => (
              <MonthLane
                key={lane.key ?? "__none__"}
                groupBy={groupBy}
                lane={lane}
                // "this month" only means something on a month board.
                isCurrentMonth={
                  groupBy === RoadmapBoardGroupBy.MONTH && lane.key === data?.periodKey
                }
                maxScore={Math.max(1, data?.maxScore ?? 1)}
                budget={budget}
                creators={facets?.creators}
                canVote={canVote}
                canManage={canManage}
                onSetVotes={allocate}
                onOpenOpportunity={onOpenOpportunity}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};
