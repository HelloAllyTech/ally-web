import {
  RoadmapCoinBudget,
  RoadmapOpportunity,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

/**
 * THE SINGLE SOURCE OF TRUTH for the coin cap and the stage rule.
 *
 * The standalone app duplicated this logic between the Allocator's canInc/canDec and
 * handleAllocChange's clamp, and the two disagreed: on a row you already held coins on, `+`
 * rendered enabled at the global cap and then silently no-opped. Everything here — button
 * disabled states, the typed-input clamp, and the tests — goes through these three functions.
 */

/**
 * The most coins the caller may put on THIS row.
 *
 * Note the `- myCoins`: the coins already on this row are not "spent elsewhere", so they must
 * be added back before comparing against the cap. That is the same self-exclusion the backend
 * applies (and the DB trigger enforces); getting it wrong is what makes raising your own vote
 * from 40 to 60 look impossible.
 */
export const maxFor = (budget: RoadmapCoinBudget, myCoins: number): number =>
  Math.max(0, budget.coinsPerMonth - (budget.used - myCoins));

/** Clamp arbitrary input (typed text included) to a legal coin value for this row. */
export const clampCoins = (raw: unknown, budget: RoadmapCoinBudget, myCoins: number): number => {
  const parsed = Number(raw);
  const safe = Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  return Math.min(Math.max(0, safe), maxFor(budget, myCoins));
};

/**
 * Coins may only be allocated to a `new`, non-bug opportunity. A missing stage counts as `new`
 * so a partially-hydrated row never renders as locked. Bug reports are triaged and fixed, not
 * coin-prioritised, so they're excluded regardless of stage — mirrors the backend gate in
 * RoadmapAllocationService.setCoins.
 */
export const isAllocatable = (
  opportunity: Pick<RoadmapOpportunity, "stage" | "type"> | { stage?: string; type?: string },
): boolean =>
  (opportunity.stage ?? RoadmapOpportunityStage.NEW) === RoadmapOpportunityStage.NEW &&
  opportunity.type !== RoadmapOpportunityType.BUG;

/**
 * Remaining coins accounting for a local, not-yet-committed edit.
 *
 * The allocator updates its own value synchronously so clicks are never gated on the network,
 * which means the server's `used` is stale for the row being edited. Disabling `+` off the raw
 * budget would let a user click past the cap during the debounce window.
 */
export const remainingWithPending = (
  budget: RoadmapCoinBudget,
  pending: number,
  serverMyCoins: number,
): number => Math.max(0, budget.remaining - (pending - serverMyCoins));
