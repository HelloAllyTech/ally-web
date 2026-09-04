import React from "react";

import { SortAscending, SortDescending } from "@icons";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  SkeletonText,
} from "@ally-ui-mono/ui-shared";
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

import { RoadmapFilterBar, hasActiveFilters } from "./RoadmapFilterBar";
import { useSetVotes } from "./useSetVotes";
import { RoadmapAdvancedFilterValues } from "./utils/filters";
import { RoadmapEffortFilterValue } from "./utils/filterSelection";
import { pageRange } from "./utils/paging";
import {
  isConsumerSourced,
  SOURCE_BADGE_STYLE,
  SOURCE_LABEL,
  STAGE_LABEL,
  STAGE_STYLE,
  typeLabel,
} from "./utils/stages";
import { VoteButton } from "./VoteButton";

interface OpportunitiesBoardProps {
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
  effortFilter: RoadmapEffortFilterValue[];
  onEffortFilterChange: (value: RoadmapEffortFilterValue[]) => void;
  goalFilter: string[];
  onGoalFilterChange: (value: string[]) => void;
  /** Owner NAMES, matching RoadmapViewState — options come from GET /facets. */
  ownerFilter: string[];
  onOwnerFilterChange: (value: string[]) => void;
  advanced: RoadmapAdvancedFilterValues;
  onAdvancedChange: (next: RoadmapAdvancedFilterValues) => void;
  /** Opens the goal-management modal. Manager-only. */
  sortBy: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
  order: "ASC" | "DESC";
  onToggleSort: (field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>) => void;
  canVote: boolean;
  canManage: boolean;
  onOpenOpportunity: (id: string) => void;
  onAddClick: () => void;
  /** False on the Queue view, whose filters are its definition. Threaded to RoadmapFilterBar. */
  showFilters?: boolean;
  /** Offset pagination. `offset` is the same value carried in `listArgs`. */
  offset: number;
  pageSize: number;
  onOffsetChange: (offset: number) => void;
  /** The Table / Month board switch, rendered inside the shared filter bar. */
  layoutToggle?: React.ReactNode;
}

/**
 * The opportunity table.
 *
 * BUILT ON THE Table PRIMITIVES rather than GenericTable or NotionTable, deliberately:
 *  - NotionTable is a spreadsheet-editing model (cells are declared as editableText/switch/…)
 *    with no route for putting an arbitrary stateful widget like VoteButton in a cell.
 *  - GenericTable fits on paper but has zero production consumers in this app, so adopting it
 *    here would mean debugging it and the roadmap at the same time.
 *  - This is the same shape as pages/AILab/RunsTab.tsx, which is the proven pattern.
 *
 * ALL filtering and sorting happens SERVER-SIDE. The standalone app sorted client-side by
 * summing the entire allocations map inside the sort comparator, which was O(n log n × users ×
 * periods) per keystroke and required shipping every user's every vote to every browser — a
 * privacy leak as much as a performance one. It also meant the list could not paginate at all.
 */
export const OpportunitiesBoard: React.FC<OpportunitiesBoardProps> = ({
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
  effortFilter,
  onEffortFilterChange,
  goalFilter,
  onGoalFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  advanced,
  onAdvancedChange,
  sortBy,
  order,
  onToggleSort,
  canVote,
  canManage,
  onOpenOpportunity,
  onAddClick,
  showFilters,
  offset,
  pageSize,
  onOffsetChange,
  layoutToggle,
}) => {
  const allocate = useSetVotes({ kind: "list", args: listArgs });
  const rows = data?.items ?? [];
  // Unfiltered max, so the bars keep a stable scale when a filter is applied.
  const total = data?.count ?? 0;
  const { rangeStart, rangeEnd, page, totalPages, canPrev, canNext, prevOffset, nextOffset } =
    pageRange(offset, pageSize, total);

  const SortHeader: React.FC<{
    field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className }) => (
    <TableHeader className={className}>
      <button
        type="button"
        onClick={() => onToggleSort(field)}
        className="inline-flex items-center gap-1 hover:text-primary-500"
      >
        {children}
        {sortBy === field &&
          (order === "DESC" ? <SortDescending size={14} /> : <SortAscending size={14} />)}
      </button>
    </TableHeader>
  );

  const activeFilters = hasActiveFilters({
    typeFilter,
    stageFilter,
    sourceFilter,
    effortFilter,
    goalFilter,
    ownerFilter,
    advanced,
  });

  return (
    <div className="flex flex-col gap-3">
      <RoadmapFilterBar
        showFilters={showFilters}
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

      {isLoading ? (
        <SkeletonText paragraph lineCount={8} />
      ) : rows.length === 0 ? (
        // `offset > 0` with no rows means the list shrank under us (a realtime delete, or a
        // merge) — that is a paging problem, not an empty board, so don't invite a new
        // opportunity. The footer keeps Previous enabled as the way out.
        <EmptyState
          title={offset > 0 ? "Nothing on this page" : "No opportunities yet"}
          subtitle={
            offset > 0
              ? "The list is shorter than it was — go back a page."
              : activeFilters || search
                ? "No opportunities match these filters."
                : "File the first one to start collecting votes."
          }
          {...(canVote && !activeFilters && !search && offset === 0
            ? { actionLabel: "New opportunity", onAction: onAddClick }
            : {})}
        />
      ) : (
        // `relative` is load-bearing: Carbon dropdown/tooltip internals are position:absolute
        // and escape a `static` overflow-scroll ancestor, inflating its scrollHeight and
        // producing a phantom second scrollbar.
        <TableContainer className="relative">
          <Table>
            <TableHead>
              <TableRow>
                {/* Code first: it is the row's identifier, and an id column that comes after the
                    data it identifies makes people scan backwards. Not sortable — sorting by code
                    is sorting by filing order, which the Filed column already does honestly. */}
                <TableHeader className="w-24">Code</TableHeader>
                {/* "Total votes" / "Your votes", not "Priority" / "Votes". The old pair named
                    the same quantity two different ways — the priority score IS the sum of every
                    vote cast, so "Priority" hid what the number was and "Votes" beside it
                    read as the same thing again. The sort key stays `priority`: it is the API's
                    field name, not a label. */}
                <SortHeader field="priority" className="w-32">
                  Total votes
                </SortHeader>
                <TableHeader className="w-24">Your votes</TableHeader>
                <SortHeader field="description">Opportunity</SortHeader>
                <TableHeader className="w-32">Stage</TableHeader>
                <TableHeader className="w-32">Owner</TableHeader>
                <SortHeader field="createdAt" className="w-28">
                  Filed
                </SortHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(opportunity => (
                <TableRow
                  key={opportunity.id}
                  onClick={() => onOpenOpportunity(opportunity.id)}
                  className="cursor-pointer"
                >
                  {/* Number only — no bar. The rows are already sorted by priority, so a bar
                      restated the ordering the reader is looking straight at, and it cost a
                      column's width doing it. The board cards keep theirs: there the cards are
                      grouped by something else and the ranking is not otherwise visible.

                      tabular-nums, NOT font-mono: this app is serif-only (IBM Plex Serif, see
                      styles.css) and font-mono broke out of it for the one column people read
                      down. Tabular figures give the alignment monospace was really being used
                      for. */}
                  {/* tabular-nums so the digits line up down the column; the code is
                      fixed-width by construction (OPP-0000) so it reads as one block. */}
                  <TableCell className="text-typography-secondary whitespace-nowrap tabular-nums">
                    {opportunity.code}
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums">{opportunity.priorityScore}</span>
                  </TableCell>

                  {/* stopPropagation, or every click inside the vote button also opens the
                      drawer. */}
                  <TableCell onClick={event => event.stopPropagation()}>
                    {budget ? (
                      <VoteButton
                        opportunity={opportunity}
                        budget={budget}
                        onSetVotes={allocate}
                        disabled={!canVote}
                      />
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <div className="text-typography-primary line-clamp-2">
                      {opportunity.description}
                    </div>
                    {/* The goal reads here rather than in a column of its own. Goal names run long
                        ("Roleplay Actor Build Time"), so a w-40 cell wrapped to two lines and set
                        the height of EVERY row — the widest single cause of how few of 500+
                        opportunities fit on a screen. It is secondary context like the type and the
                        filer, it stays filterable and it is still on every row, so it belongs on
                        this line (Stacks: "Visual Hierarchy: Controlling Perception Order" —
                        visibility proportional to importance). */}
                    {/* Inline text flow, NOT a flex row. As flex items with `gap-2` these five
                        spans wrapped with an 8px row-gap and stood 40px tall — taller than the
                        two-line description above them, on the line that is supposed to be the
                        quieter of the two. Normal wrapping at `leading-snug` is 16px per line. */}
                    <div className="text-typography-secondary mt-1 text-xs leading-snug">
                      <span>{typeLabel(opportunity.type)}</span>
                      {isConsumerSourced(opportunity.source) && (
                        <span className={`ml-1.5 inline-block px-1.5 ${SOURCE_BADGE_STYLE}`}>
                          {SOURCE_LABEL[opportunity.source]}
                        </span>
                      )}
                      {opportunity.productGoal && <span> · {opportunity.productGoal}</span>}
                      {opportunity.commentCount > 0 && (
                        <span> · {opportunity.commentCount} comments</span>
                      )}
                      {opportunity.creator && (
                        <span> · {opportunity.creator.name || opportunity.creator.email}</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs ${
                        STAGE_STYLE[opportunity.stage] ?? STAGE_STYLE.new
                      }`}
                    >
                      {STAGE_LABEL[opportunity.stage] ?? opportunity.stage}
                    </span>
                  </TableCell>

                  <TableCell className="text-typography-secondary text-sm">
                    {opportunity.owner ?? "—"}
                  </TableCell>

                  <TableCell className="text-typography-secondary font-mono text-xs">
                    {new Date(opportunity.createdAt).toISOString().slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination footer, same shape as the other server-paged admin tables (AI Lab Runs,
          Roleplay Session Logs): a row-range count on the left, Previous/Next on the right.
          The controls render whenever there is more than one page — including on an empty page
          past the end, which would otherwise be a dead end. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-typography-secondary text-xs">
          {data ? `Showing ${rangeStart}–${rangeEnd} of ${total} opportunities` : null}
          {isFetching && !isLoading ? " · updating…" : null}
          {canManage ? " · you can manage stages and taxonomy" : null}
        </div>

        {(canPrev || canNext) && (
          <div className="flex items-center gap-3">
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={!canPrev}
              onClick={() => onOffsetChange(prevOffset)}
            >
              Previous
            </Button>
            <span className="text-typography-secondary text-xs tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={!canNext}
              onClick={() => onOffsetChange(nextOffset)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
