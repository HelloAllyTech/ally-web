import React from "react";

import { SkeletonText } from "@ally-ui-mono/ui-shared";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapVoteBudget,
  RoadmapFacets,
  RoadmapOpportunitiesQuery,
  RoadmapOpportunitiesResponse,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";

import { OpportunityListCard } from "./OpportunityListCard";
import { RoadmapFilterBar, hasActiveFilters } from "./RoadmapFilterBar";
import { useSetVotes } from "./useSetVotes";
import { RoadmapAdvancedFilterValues } from "./utils/filters";
import { loadMoreState } from "./utils/paging";

interface OpportunitiesListViewProps {
  listArgs: RoadmapOpportunitiesQuery;
  data?: RoadmapOpportunitiesResponse;
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
  goalFilter: string[];
  onGoalFilterChange: (value: string[]) => void;
  /** Owner NAMES, matching RoadmapViewState — options come from GET /facets. */
  ownerFilter: string[];
  onOwnerFilterChange: (value: string[]) => void;
  advanced: RoadmapAdvancedFilterValues;
  onAdvancedChange: (next: RoadmapAdvancedFilterValues) => void;
  canVote: boolean;
  canManage: boolean;
  onOpenOpportunity: (id: string) => void;
  onAddClick: () => void;
  /** Threaded to RoadmapFilterBar. The Queue passes true too, nowadays — see stageLocked. */
  showFilters?: boolean;
  /** Draw the Queue presentation: reduced fields, rank at the top left. */
  isQueue?: boolean;
  /** Left-hand slot on the control row — the Queue's sort picker. */
  leading?: React.ReactNode;
  /**
   * How many rows are currently loaded — the `limit` carried in `listArgs`, since this view grows
   * the limit rather than walking an offset. See onLoadMore.
   */
  loaded: number;
  /** Load the next slice. The parent raises `limit`; this view never fetches on its own. */
  onLoadMore: () => void;
  /** The Table / Board / List switch, rendered inside the shared filter bar. */
  layoutToggle?: React.ReactNode;
}

/**
 * The single-column card feed: one RoadmapOpportunity per row, in whatever order `sortBy`/`order`
 * were last left in — List has no header row of its own to sort from, so it inherits the
 * table's.
 *
 * Shares `listArgs` and its RTK Query subscription with OpportunitiesBoard — same cache entry,
 * same pagination, same useSetVotes optimistic-patch target — so switching Table ⇄ List does
 * not refetch or reset the page. No drag (there is no lane to reorder within) and no merge-select
 * (that is a table-only affordance); the feed is browse-and-open plus voting.
 */
export const OpportunitiesListView: React.FC<OpportunitiesListViewProps> = ({
  listArgs,
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
  goalFilter,
  onGoalFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  advanced,
  onAdvancedChange,
  canVote,
  canManage,
  onOpenOpportunity,
  onAddClick,
  showFilters,
  isQueue,
  leading,
  onLoadMore,
  layoutToggle,
}) => {
  const allocate = useSetVotes({ kind: "list", args: listArgs });
  const rows = data?.items ?? [];
  const total = data?.count ?? 0;
  // Unfiltered max, so the bars keep a stable scale when a filter is applied.
  const maxScore = data?.maxScore ?? 0;
  const { canLoadMore, atCeiling } = loadMoreState(rows.length, total);

  const activeFilters = hasActiveFilters(
    { typeFilter, stageFilter, sourceFilter, goalFilter, ownerFilter, advanced },
    // The Queue's pinned stages are its definition, not a filter: counting them would make its
    // true empty state read "no matches for these filters" forever and suppress the
    // "New opportunity" call that belongs on an empty queue.
    { omitStage: isQueue },
  );

  return (
    <div className="flex flex-col gap-3">
      <RoadmapFilterBar
        showFilters={showFilters}
        stageLocked={isQueue}
        search={search}
        onSearchChange={onSearchChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        stageFilter={stageFilter}
        onStageFilterChange={onStageFilterChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={onSourceFilterChange}
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
        leading={leading}
        trailing={layoutToggle}
      />

      {isLoading ? (
        <SkeletonText paragraph lineCount={8} />
      ) : rows.length === 0 ? (
        // No page-vs-empty distinction to make any more: this view always starts from the top,
        // so "no rows" means no rows, not "you walked past the end".
        <EmptyState
          title="No opportunities yet"
          subtitle={
            activeFilters || search
              ? "No opportunities match these filters."
              : "File the first one to start collecting votes."
          }
          {...(canVote && !activeFilters && !search
            ? { actionLabel: "New opportunity", onAction: onAddClick }
            : {})}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(opportunity => (
            <OpportunityListCard
              key={opportunity.id}
              opportunity={opportunity}
              maxScore={maxScore}
              // Position in the queue. Offset-aware, so page two continues rather than
              // restarting at #1.
              isQueue={isQueue}
              budget={budget}
              canVote={canVote}
              onSetVotes={allocate}
              onOpen={() => onOpenOpportunity(opportunity.id)}
            />
          ))}
        </div>
      )}

      {/*
        Load more, not pagination. The queue is a ranked feed you read down — "Page 3 of 4" makes
        you hold a position in your head, and the rank numbers already tell you where you are.
        Growing the limit rather than walking an offset also keeps ONE query cached, so the vote
        allocator's optimistic patch still targets the entry being rendered.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-typography-secondary text-xs">
          {data ? `Showing ${rows.length} of ${total} opportunities` : null}
          {isFetching && !isLoading ? " · updating…" : null}
          {canManage ? " · you can manage stages and taxonomy" : null}
        </div>

        {canLoadMore && (
          <Button variant={ButtonVariant.SECONDARY} disabled={isFetching} onClick={onLoadMore}>
            {isFetching ? "Loading…" : "Load more"}
          </Button>
        )}

        {/* The server clamps an over-large limit silently, so this says so rather than leaving a
            button that fetches the same rows for ever. */}
        {atCeiling && (
          <span className="text-typography-secondary text-xs">
            Showing the first {rows.length} — narrow the filters to reach the rest.
          </span>
        )}
      </div>
    </div>
  );
};
