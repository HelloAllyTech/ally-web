import {
  RoadmapVoteBudget,
  RoadmapOpportunity,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

/**
 * THE SINGLE SOURCE OF TRUTH for the vote cap and the stage rule.
 *
 * The standalone app duplicated this logic between the Allocator's canInc/canDec and
 * handleAllocChange's clamp, and the two disagreed: on a row you already held votes on, `+`
 * rendered enabled at the global cap and then silently no-opped. Everything here — button
 * disabled states, the tap-button clamp, and the tests — goes through these three functions.
 */

/**
 * The most votes the caller may put on THIS row: whatever's already here, plus whatever's
 * still available to spend. There's no fixed monthly cap to net against anymore (the backend
 * spends from an expiring vote-grant ledger) — `available` already accounts for everything
 * cast elsewhere, so this is just "what's here now, plus what I could still add."
 */
export const maxFor = (budget: RoadmapVoteBudget, myVotes: number): number =>
  myVotes + budget.available;

/** Clamp an arbitrary next-total (e.g. pending + 1) to a legal vote value for this row. */
export const clampVotes = (raw: unknown, budget: RoadmapVoteBudget, myVotes: number): number => {
  const parsed = Number(raw);
  const safe = Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  return Math.min(Math.max(0, safe), maxFor(budget, myVotes));
};

/**
 * Votes may only be cast on a `new`, non-bug opportunity. A missing stage counts as `new`
 * so a partially-hydrated row never renders as locked. Bug reports are triaged and fixed, not
 * vote-prioritised, so they're excluded regardless of stage — mirrors the backend gate in
 * RoadmapAllocationService.setVotes.
 */
export const isVotable = (
  opportunity: Pick<RoadmapOpportunity, "stage" | "type"> | { stage?: string; type?: string },
): boolean =>
  (opportunity.stage ?? RoadmapOpportunityStage.NEW) === RoadmapOpportunityStage.NEW &&
  opportunity.type !== RoadmapOpportunityType.BUG;

/**
 * Remaining votes accounting for a local, not-yet-committed edit.
 *
 * The vote button updates its own value synchronously so taps are never gated on the network,
 * which means the server's `used` is stale for the row being edited. Disabling the button off the
 * raw budget would let a user tap past the cap during the debounce window.
 */
export const remainingWithPending = (
  budget: RoadmapVoteBudget,
  pending: number,
  serverMyVotes: number,
): number => Math.max(0, budget.available - (pending - serverMyVotes));
