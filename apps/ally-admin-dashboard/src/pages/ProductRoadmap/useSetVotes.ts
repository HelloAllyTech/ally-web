import { useCallback } from "react";

import { toast } from "sonner";

import { productRoadmapAPI, useSetRoadmapAllocationMutation } from "@api";
import { store } from "@store";
import { RoadmapBoardQuery, RoadmapOpportunitiesQuery, RoadmapOpportunity } from "@types";

/**
 * Which cached read to patch: the table's flat list, or the month board's lanes.
 *
 * Generalised rather than copied when month boards arrived. The vote path has three non-obvious
 * invariants (below) and a second hook would be a second place for each of them to rot — the ONLY
 * thing that differs between the two layouts is how you reach an opportunity inside the cached
 * response, so that is the only thing injected.
 */
export type AllocationTarget =
  | { kind: "list"; args: RoadmapOpportunitiesQuery }
  | { kind: "board"; args: RoadmapBoardQuery };

/**
 * Commit a vote total optimistically.
 *
 * THREE THINGS TO KNOW BEFORE CHANGING THIS:
 *
 * 1. THE ARGS TRAP — the highest silent-failure risk on this page.
 *    `updateQueryData(endpoint, args, …)` matches on a SERIALISED arg object. Called with anything
 *    other than the exact args the component subscribed with, it patches a cache entry that does
 *    not exist and no-ops silently: the votes simply appear not to move, with no error anywhere.
 *    So `target.args` must be the SAME memoised object passed to the corresponding query hook.
 *    There is exactly one subscriber per layout today; if a second ever appears, iterate the
 *    cached entries instead of guessing.
 *
 * 2. `setRoadmapAllocation` carries NO tags on purpose (see api/productRoadmap.ts). The
 *    reconciliation below is the whole update path — invalidating the list would refetch on
 *    every tap and stomp this patch mid-interaction.
 *
 * 3. Reconciliation is not optional. Between the patch and the response another voter may have
 *    moved `priorityScore`, so the server's numbers overwrite the optimistic guess rather than
 *    being assumed correct.
 */
export const useSetVotes = (target: AllocationTarget) => {
  const [setAllocation] = useSetRoadmapAllocationMutation();

  /**
   * Apply `mutate` to one opportunity wherever it lives in the cached read.
   *
   * The board's copy is nested inside a lane, so the table's `draft.items.find` would miss it
   * entirely — and per invariant 1 a miss is SILENT, so this is the difference between votes
   * working and votes mysteriously not moving on one of the two layouts.
   */
  const patchOpportunity = useCallback(
    (opportunityId: string, mutate: (row: RoadmapOpportunity) => void) => {
      if (target.kind === "list") {
        return store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapOpportunities", target.args, draft => {
            const row = draft.items.find(o => o.id === opportunityId);
            if (row) mutate(row);
          }),
        );
      }
      return store.dispatch(
        productRoadmapAPI.util.updateQueryData("getRoadmapBoard", target.args, draft => {
          for (const lane of draft.lanes) {
            const row = lane.items.find(o => o.id === opportunityId);
            if (row) {
              mutate(row);
              return;
            }
          }
        }),
      );
    },
    [target],
  );

  return useCallback(
    async (opportunityId: string, next: number, previous: number) => {
      const delta = next - previous;

      const patches = [
        patchOpportunity(opportunityId, row => {
          row.priorityScore += delta;
          row.myVotes = next;
        }),
        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapVoteBudget", undefined, draft => {
            draft.used += delta;
            draft.remaining = Math.max(0, draft.votesPerMonth - draft.used);
          }),
        ),
      ];

      try {
        const result = await setAllocation({ opportunityId, votes: next }).unwrap();

        patchOpportunity(opportunityId, row => {
          row.priorityScore = result.priorityScore;
          row.myVotes = result.votes;
        });
        store.dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapVoteBudget", undefined, draft =>
            Object.assign(draft, result.budget),
          ),
        );
      } catch (error) {
        patches.forEach(patch => patch.undo());
        // The backend answers 422 with the real remaining balance for a cap breach and 409 when
        // the opportunity has left the `new` stage; surface its message rather than a generic one.
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not save your vote. Refresh to see your current balance.";
        toast.error(message);
      }
    },
    [patchOpportunity, setAllocation],
  );
};
