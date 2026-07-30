import React, { useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import {
  useGetRoadmapCoinBudgetQuery,
  useGetRoadmapFacetsQuery,
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapProductGoalsQuery,
} from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { RoadmapOpportunitiesQuery, RoadmapOpportunityStage, RoadmapOpportunityType } from "@types";

import { AddOpportunityModal } from "./AddOpportunityModal";
import { OpportunitiesBoard } from "./OpportunitiesBoard";
import { OpportunityDrawer } from "./OpportunityDrawer";

const PAGE_SIZE = 50;

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
 *   ?opportunity=<id>  opens the detail drawer (replaces the source's /opportunity/[id] page)
 */
export const ProductRoadmap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions } = useUser();

  const canVote = !!permissions?.includes(Permissions.VOTE_PRODUCT_ROADMAP);
  const canManage = !!permissions?.includes(Permissions.EDIT_PRODUCT_ROADMAP);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RoadmapOpportunityType[]>([]);
  const [stageFilter, setStageFilter] = useState<RoadmapOpportunityStage[]>([]);
  const [goalFilter, setGoalFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] =
    useState<NonNullable<RoadmapOpportunitiesQuery["sortBy"]>>("priority");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const [isAddOpen, setIsAddOpen] = useState(false);

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
      sortBy,
      order,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    [search, typeFilter, stageFilter, goalFilter, sortBy, order],
  );

  const { data, isLoading, isFetching } = useGetRoadmapOpportunitiesQuery(listArgs);
  const { data: budget } = useGetRoadmapCoinBudgetQuery();
  const { data: goals } = useGetRoadmapProductGoalsQuery();
  const { data: facets } = useGetRoadmapFacetsQuery();

  const openOpportunityId = searchParams.get("opportunity");

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

      <OpportunitiesBoard
        listArgs={listArgs}
        data={data}
        isLoading={isLoading}
        isFetching={isFetching}
        budget={budget}
        goals={goals ?? []}
        facets={facets}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        goalFilter={goalFilter}
        onGoalFilterChange={setGoalFilter}
        sortBy={sortBy}
        order={order}
        onToggleSort={toggleSort}
        canVote={canVote}
        canManage={canManage}
        onOpenOpportunity={openOpportunity}
        onAddClick={() => setIsAddOpen(true)}
      />

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
