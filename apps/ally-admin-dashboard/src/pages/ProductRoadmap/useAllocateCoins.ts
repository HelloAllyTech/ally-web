import { useCallback } from "react";

import { toast } from "sonner";

import { productRoadmapAPI, useSetRoadmapAllocationMutation } from "@api";
import { store } from "@store";
import { RoadmapOpportunitiesQuery } from "@types";

/**
 * Commit a coin allocation optimistically.
 *
 * THREE THINGS TO KNOW BEFORE CHANGING THIS:
 *
 * 1. THE `listArgs` TRAP — the highest silent-failure risk on this page.
 *    `updateQueryData("getRoadmapOpportunities", args, …)` matches on a SERIALISED arg object.
 *    Called with anything other than the exact args the component subscribed with, it patches a
 *    cache entry that does not exist and no-ops silently: the coins simply appear not to move,
 *    with no error anywhere. So `listArgs` must be the SAME memoised object passed to
 *    useGetRoadmapOpportunitiesQuery. There is exactly one subscriber per page today; if a
 *    second ever appears, iterate the cached entries instead of guessing.
 *
 * 2. `setRoadmapAllocation` carries NO tags on purpose (see api/productRoadmap.ts). The
 *    reconciliation below is the whole update path — invalidating the list would refetch on
 *    every click and stomp this patch mid-interaction.
 *
 * 3. Reconciliation is not optional. Between the patch and the response another voter may have
 *    moved `priorityScore`, so the server's numbers overwrite the optimistic guess rather than
 *    being assumed correct.
 */
export const useAllocateCoins = (listArgs: RoadmapOpportunitiesQuery) => {
  const [setAllocation] = useSetRoadmapAllocationMutation();

  return useCallback(
    async (opportunityId: string, next: number, previous: number) => {
      const delta = next - previous;

      const patches = [
        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapOpportunities", listArgs, draft => {
            const row = draft.items.find(o => o.id === opportunityId);
            if (!row) return;
            row.priorityScore += delta;
            row.myCoins = next;
          }),
        ),
        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapCoinBudget", undefined, draft => {
            draft.used += delta;
            draft.remaining = Math.max(0, draft.coinsPerMonth - draft.used);
          }),
        ),
      ];

      try {
        const result = await setAllocation({ opportunityId, coins: next }).unwrap();

        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapOpportunities", listArgs, draft => {
            const row = draft.items.find(o => o.id === opportunityId);
            if (!row) return;
            row.priorityScore = result.priorityScore;
            row.myCoins = result.coins;
          }),
        );
        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapCoinBudget", undefined, draft =>
            Object.assign(draft, result.budget),
          ),
        );
      } catch (error) {
        patches.forEach(patch => patch.undo());
        // The backend answers 422 with the real remaining balance for a cap breach and 409 when
        // the opportunity has left the `new` stage; surface its message rather than a generic one.
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not save your coins. Refresh to see your current balance.";
        toast.error(message);
      }
    },
    [listArgs, setAllocation],
  );
};
