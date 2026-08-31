import { RoadmapOpportunitiesQuery } from "@types";

type SortBy = NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
type Order = "ASC" | "DESC";

/**
 * The Queue's five orderings, in the vocabulary a reader uses rather than the API's.
 *
 * Rank IS total votes, so the two rank orderings are `priority` in each direction. It used to be
 * a single "By rank" button, which only ever meant DESCENDING — there was no way to reach the
 * bottom of the queue except by paging to the end of it. Splitting it names both ends: "top rank
 * first" is what is winning, "bottom rank first" is what nobody has voted for, and that second
 * list is the one worth reading before an archive sweep.
 *
 * Then two on filing date, and one on the PLANNED month — "expected first", soonest first, which
 * is the only ordering here that answers "what is meant to land next" rather than "what is wanted
 * most" or "what arrived when". ally-be sorts that column NULLS LAST in both directions, so
 * unscheduled work lands at the end rather than burying the dated rows the ordering exists to
 * surface.
 *
 * The rank number stays visible under all five, because ally-be computes it over the whole queue
 * rather than from the card's position on screen; ordering the feed by date or by month reorders
 * the cards without changing what any of them is ranked.
 */
export type QueueSortId = "topRank" | "bottomRank" | "latest" | "oldest" | "expected";

export const QUEUE_SORTS: {
  id: QueueSortId;
  label: string;
  sortBy: SortBy;
  order: Order;
}[] = [
  { id: "topRank", label: "Top rank first", sortBy: "priority", order: "DESC" },
  { id: "bottomRank", label: "Bottom rank first", sortBy: "priority", order: "ASC" },
  { id: "latest", label: "Latest first", sortBy: "createdAt", order: "DESC" },
  { id: "oldest", label: "Oldest first", sortBy: "createdAt", order: "ASC" },
  // ASC: 'YYYY-MM' sorts lexicographically, so ascending IS soonest-first.
  { id: "expected", label: "Expected first", sortBy: "plannedMonth", order: "ASC" },
];

/**
 * Which option the current query state corresponds to.
 *
 * Falls back to "topRank" rather than to undefined: the control has to show something, and every
 * other ordering the API can express (myVotes, description, releasedAt) is unreachable from the
 * Queue, so an unrecognised pair can only come from state carried in from another layout. Top
 * rank is the Queue's own default, so the fallback lands on the ordering the page opens in.
 */
export const queueSortIdFor = (sortBy: SortBy, order: Order): QueueSortId =>
  QUEUE_SORTS.find(s => s.sortBy === sortBy && s.order === order)?.id ?? "topRank";
