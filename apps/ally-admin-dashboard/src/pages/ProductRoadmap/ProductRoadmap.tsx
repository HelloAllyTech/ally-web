import React, { useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useGetRoadmapCoinBudgetQuery,
  useGetRoadmapFacetsQuery,
  useGetRoadmapInterviewNotesQuery,
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapProductGoalsQuery,
  useGetRoadmapReleaseNotesQuery,
} from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import {
  RoadmapOpportunitiesQuery,
  RoadmapOpportunity,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapViewState,
} from "@types";

import { AddOpportunityModal } from "./AddOpportunityModal";
import { InterviewsTab } from "./InterviewsTab";
import { MergeOpportunitiesModal } from "./MergeOpportunitiesModal";
import { MergeSelectionBar } from "./MergeSelectionBar";
import { OpportunitiesBoard } from "./OpportunitiesBoard";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { ProductGoalsManager } from "./ProductGoalsManager";
import { ReleaseNotesTab } from "./ReleaseNotesTab";
import { SavedViewTabs } from "./SavedViewTabs";
import { SplitOpportunityModal } from "./SplitOpportunityModal";
import { useProductRoadmapRealtime } from "./useProductRoadmapRealtime";
import { useSavedViews } from "./useSavedViews";
import { EMPTY_ADVANCED_FILTERS, RoadmapAdvancedFilterValues } from "./utils/filters";
import { normaliseSortField } from "./utils/views";

const PAGE_SIZE = 50;

/** Top-level tabs, deep-linked via ?tab= so a shared link lands where the sender was. */
enum RoadmapTab {
  OPPORTUNITIES = "opportunities",
  INTERVIEWS = "interviews",
  RELEASE_NOTES = "release-notes",
}

/**
 * The Product Roadmap board — a coin-voting prioritisation surface, rebuilt from the standalone
 * `sandeep-roadmap-app`.
 *
 * PERMISSION MODEL (three tiers, not a role gate):
 *   VIEW  — reach the tab and read everything. The route gate.
 *   VOTE  — file an opportunity, allocate coins, comment, keep saved views.
 *   EDIT  — manage: stages, editing/deleting anyone's opportunity, taxonomy, split/merge,
 *           release notes, pinning views.
 * A SUPER_ADMIN holds VIEW + VOTE; only a SUPER_DUPER_ADMIN holds EDIT. Every manage affordance
 * below is hidden behind `canManage` — and the backend rejects it independently, so hiding it is
 * a courtesy rather than the enforcement.
 *
 * URL is the state store for what should survive a refresh or a shared link:
 *   ?tab=<id>          selects the top-level tab
 *   ?opportunity=<id>  opens the detail drawer (replaces the source's /opportunity/[id] page)
 */
export const ProductRoadmap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions, user } = useUser();

  const canVote = !!permissions?.includes(Permissions.VOTE_PRODUCT_ROADMAP);
  const canManage = !!permissions?.includes(Permissions.EDIT_PRODUCT_ROADMAP);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RoadmapOpportunityType[]>([]);
  const [stageFilter, setStageFilter] = useState<RoadmapOpportunityStage[]>([]);
  const [goalFilter, setGoalFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  /** Creator + the three range filters, grouped so one setter drives the whole panel. */
  const [advanced, setAdvanced] = useState<RoadmapAdvancedFilterValues>({
    ...EMPTY_ADVANCED_FILTERS,
  });
  const [sortBy, setSortBy] =
    useState<NonNullable<RoadmapOpportunitiesQuery["sortBy"]>>("priority");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<RoadmapOpportunity | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  /** Merge selection. Page-local on purpose: it should reset on navigation. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** Offset pagination, PAGE_SIZE rows at a time. See resetPaging for the invalidation rule. */
  const [offset, setOffset] = useState(0);

  /**
   * Every search / filter / sort change returns to the first page.
   *
   * An offset only means something against the result set it was taken from: keeping offset 150
   * while switching to a filter that matches 12 rows renders an empty table that looks like a
   * broken filter. Wrapping the setters rather than resetting in an effect keeps it to ONE
   * render, so we never fire a throwaway request at the stale offset first.
   *
   * The merge selection goes with it — the bar counts ids the board is about to stop showing,
   * and MergeOpportunitiesModal only ever sees rows on the current page.
   */
  const resetPaging = () => {
    setOffset(0);
    setSelectedIds(new Set());
  };

  const withPagingReset =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value);
      resetPaging();
    };

  /**
   * ONE memoised query-arg object, used by BOTH the list subscription and useAllocateCoins.
   * They must be referentially the same value or the optimistic cache patch silently targets a
   * non-existent entry — see the docblock on useAllocateCoins.
   */
  const listArgs = useMemo<RoadmapOpportunitiesQuery>(
    () => ({
      search: search.trim() || undefined,
      type: typeFilter.length ? typeFilter : undefined,
      stage: stageFilter.length ? stageFilter : undefined,
      productGoal: goalFilter.length ? goalFilter : undefined,
      owner: ownerFilter.length ? ownerFilter : undefined,
      createdBy: advanced.createdBy.length ? advanced.createdBy : undefined,
      // Empty string means "no bound" — sending it would fail @IsISO8601 / @IsInt.
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      releasedFrom: advanced.releasedFrom || undefined,
      releasedTo: advanced.releasedTo || undefined,
      priorityMin: advanced.priorityMin === "" ? undefined : Number(advanced.priorityMin),
      priorityMax: advanced.priorityMax === "" ? undefined : Number(advanced.priorityMax),
      sortBy,
      order,
      limit: PAGE_SIZE,
      offset,
    }),
    [search, typeFilter, stageFilter, goalFilter, ownerFilter, advanced, sortBy, order, offset],
  );

  const { data, isLoading, isFetching } = useGetRoadmapOpportunitiesQuery(listArgs);
  const { data: budget } = useGetRoadmapCoinBudgetQuery();
  const { data: goals } = useGetRoadmapProductGoalsQuery();
  const { data: facets } = useGetRoadmapFacetsQuery();
  // Counts only — the tab bodies own their own data. Cheap, and the tab strip needs them.
  const { data: interviews } = useGetRoadmapInterviewNotesQuery({ limit: 1 });
  const { data: releaseNotes } = useGetRoadmapReleaseNotesQuery({ limit: 1 });

  const openOpportunityId = searchParams.get("opportunity");
  const activeViewId = searchParams.get("view");

  const setActiveViewId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("view", id);
    else next.delete("view");
    setSearchParams(next, { replace: true });
  };

  /** The board's filter/sort state in saved-view shape. Goals are NAMES, per RoadmapViewState. */
  const currentViewState = useMemo<RoadmapViewState>(
    () => ({
      searchQuery: search.trim() || undefined,
      typeFilter,
      stageFilter,
      goalFilter,
      ownerFilter,
      // Same key names the standalone app used, so a view saved here and a view migrated from
      // Supabase are the same shape — see RoadmapViewState.
      creatorFilter: advanced.createdBy.map(String),
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      releasedFrom: advanced.releasedFrom || undefined,
      releasedTo: advanced.releasedTo || undefined,
      priorityMin: advanced.priorityMin || undefined,
      priorityMax: advanced.priorityMax || undefined,
      sort: { field: sortBy, dir: order === "DESC" ? "desc" : "asc" },
    }),
    [search, typeFilter, stageFilter, goalFilter, ownerFilter, advanced, sortBy, order],
  );

  const applyViewState = (state: RoadmapViewState) => {
    setSearch(state.searchQuery ?? "");
    setTypeFilter((state.typeFilter ?? []) as RoadmapOpportunityType[]);
    setStageFilter((state.stageFilter ?? []) as RoadmapOpportunityStage[]);
    setGoalFilter(state.goalFilter ?? []);
    setOwnerFilter(state.ownerFilter ?? []);
    // These four keys were previously DROPPED on apply: the board had no controls for them, so a
    // view carrying a date or priority bound applied only partially and looked like it had worked.
    setAdvanced({
      createdBy: (state.creatorFilter ?? []).map(Number).filter(id => Number.isFinite(id)),
      dateFrom: state.dateFrom ?? "",
      dateTo: state.dateTo ?? "",
      releasedFrom: state.releasedFrom ?? "",
      releasedTo: state.releasedTo ?? "",
      priorityMin: state.priorityMin ?? "",
      priorityMax: state.priorityMax ?? "",
    });
    // Migrated views carry the standalone app's field names — see normaliseSortField.
    setSortBy(
      normaliseSortField(state.sort?.field) as NonNullable<RoadmapOpportunitiesQuery["sortBy"]>,
    );
    setOrder(state.sort?.dir === "asc" ? "ASC" : "DESC");
    // A saved view is a whole new result set; page 3 of the previous one does not survive it.
    resetPaging();
  };

  // Live updates. Gated on VIEW so the socket stays closed rather than connecting and being
  // rejected by the gateway's permission middleware.
  useProductRoadmapRealtime({
    currentUserId: user?.id,
    openOpportunityId,
    enabled: !!permissions?.includes(Permissions.VIEW_PRODUCT_ROADMAP),
  });

  const savedViews = useSavedViews({
    current: currentViewState,
    onApply: applyViewState,
    activeViewId,
    setActiveViewId,
    canVote,
    canManage,
    currentUserId: user?.id,
  });

  const toggleSelected = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedOpportunities = (data?.items ?? []).filter(o => selectedIds.has(o.id));

  const requestedTab = searchParams.get("tab") as RoadmapTab | null;
  const activeTab =
    requestedTab && Object.values(RoadmapTab).includes(requestedTab)
      ? requestedTab
      : RoadmapTab.OPPORTUNITIES;

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    // A drawer belongs to the board; leaving it open across a tab switch is confusing.
    next.delete("opportunity");
    setSearchParams(next, { replace: true });
  };

  const openOpportunity = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("opportunity", id);
    else next.delete("opportunity");
    setSearchParams(next, { replace: true });
  };

  const toggleSort = (field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>) => {
    if (field === sortBy) {
      setOrder(prev => (prev === "DESC" ? "ASC" : "DESC"));
    } else {
      setSortBy(field);
      // A newly-chosen column starts descending: for scores and dates that is what people mean.
      setOrder("DESC");
    }
    // Re-sorting reshuffles which rows land on which page, so page 3 is meaningless afterwards.
    resetPaging();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-typography-primary text-2xl font-primary">Product Roadmap</h1>
          <p className="text-typography-secondary text-sm mt-1">
            Spend your monthly coins on what matters most. Coins go to new opportunities only, and
            unspent coins lapse at the start of each month.
          </p>
        </div>
        {budget && (
          <div className="border border-border-light px-4 py-3 text-right shrink-0">
            <div className="text-typography-secondary text-xs uppercase tracking-wide">
              Your coins · {budget.periodKey}
            </div>
            <div className="font-mono tabular-nums text-2xl text-typography-primary">
              {budget.remaining}
              <span className="text-typography-secondary text-base"> / {budget.coinsPerMonth}</span>
            </div>
            <div className="text-typography-secondary text-xs">{budget.used} allocated</div>
          </div>
        )}
      </header>

      <Tabs
        items={[
          {
            id: RoadmapTab.OPPORTUNITIES,
            label: "Opportunities",
            count: data?.count ?? 0,
          },
          {
            id: RoadmapTab.INTERVIEWS,
            label: "User Interviews",
            count: interviews?.count ?? 0,
          },
          {
            id: RoadmapTab.RELEASE_NOTES,
            label: "Release Notes",
            count: releaseNotes?.count ?? 0,
          },
        ]}
        activeId={activeTab}
        onChange={setTab}
      />

      {activeTab === RoadmapTab.INTERVIEWS && (
        <InterviewsTab canVote={canVote} canManage={canManage} currentUserId={user?.id} />
      )}

      {activeTab === RoadmapTab.RELEASE_NOTES && <ReleaseNotesTab canManage={canManage} />}

      {/* Saved-view sub-tabs sit between the top-level strip and the board, so the hierarchy
          reads top-down: section → view → rows. */}
      {activeTab === RoadmapTab.OPPORTUNITIES && (
        <SavedViewTabs
          views={savedViews.views}
          activeViewId={activeViewId}
          isDirty={savedViews.isDirty}
          isOwner={savedViews.isOwner}
          canReorder={savedViews.canReorder}
          canPin={savedViews.canPin}
          canSave={canVote}
          onSelect={savedViews.selectView}
          onSaveCurrentAs={savedViews.saveCurrentAs}
          onRename={savedViews.renameView}
          onTogglePinned={savedViews.togglePinned}
          onDelete={savedViews.removeView}
          onReorder={savedViews.reorderViews}
        />
      )}

      {activeTab === RoadmapTab.OPPORTUNITIES && (
        <OpportunitiesBoard
          listArgs={listArgs}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          budget={budget}
          goals={goals ?? []}
          facets={facets}
          search={search}
          onSearchChange={withPagingReset(setSearch)}
          typeFilter={typeFilter}
          onTypeFilterChange={withPagingReset(setTypeFilter)}
          stageFilter={stageFilter}
          onStageFilterChange={withPagingReset(setStageFilter)}
          goalFilter={goalFilter}
          onGoalFilterChange={withPagingReset(setGoalFilter)}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={withPagingReset(setOwnerFilter)}
          advanced={advanced}
          onAdvancedChange={withPagingReset(setAdvanced)}
          onManageGoals={() => setIsGoalsOpen(true)}
          sortBy={sortBy}
          order={order}
          onToggleSort={toggleSort}
          canVote={canVote}
          canManage={canManage}
          onOpenOpportunity={openOpportunity}
          onAddClick={() => setIsAddOpen(true)}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onSplit={setSplitTarget}
          offset={offset}
          pageSize={PAGE_SIZE}
          onOffsetChange={next => {
            setOffset(next);
            // Selection cannot span pages: the merge bar would count rows the board no longer
            // shows, and the modal reads its rows from the current page.
            setSelectedIds(new Set());
          }}
        />
      )}

      {activeTab === RoadmapTab.OPPORTUNITIES && canManage && (
        <MergeSelectionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onMerge={() => setIsMergeOpen(true)}
        />
      )}

      {isGoalsOpen && (
        <ProductGoalsManager
          goals={goals ?? []}
          isLoading={!goals}
          onClose={() => setIsGoalsOpen(false)}
        />
      )}

      {splitTarget && (
        <SplitOpportunityModal opportunity={splitTarget} onClose={() => setSplitTarget(null)} />
      )}

      {isMergeOpen && selectedOpportunities.length >= 2 && (
        <MergeOpportunitiesModal
          selected={selectedOpportunities}
          onClose={() => setIsMergeOpen(false)}
          onMerged={() => setSelectedIds(new Set())}
        />
      )}

      {isAddOpen && (
        <AddOpportunityModal
          goals={goals ?? []}
          onClose={() => setIsAddOpen(false)}
          onOpenExisting={id => {
            setIsAddOpen(false);
            openOpportunity(id);
          }}
        />
      )}

      {openOpportunityId && (
        <OpportunityDrawer
          opportunityId={openOpportunityId}
          goals={goals ?? []}
          canVote={canVote}
          canManage={canManage}
          onClose={() => openOpportunity(null)}
        />
      )}
    </div>
  );
};
