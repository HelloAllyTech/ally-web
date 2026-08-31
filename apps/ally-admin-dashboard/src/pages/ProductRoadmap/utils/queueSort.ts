import { RoadmapOpportunitiesQuery } from "@types";

type SortBy = NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
type Order = "ASC" | "DESC";

/**
 * The Queue's orderings, in the vocabulary a reader uses rather than the API's.
 *
 * RANK IS THE COMPOSITE — votes, how many admins backed it, effort and strategy-goal coverage,
 * weighted in settings. "Most votes" is kept as its own pair of orderings rather than dropped,
 * and that is deliberate: the composite is only trustworthy if you can check it against the raw
 * signal it was built from. A reader who thinks the ranking looks wrong needs to be able to see
 * the vote order it departed from.
 *
 * "Most backers" is the third pair, and answers a question neither of the others can: forty
 * admins voting once each and one admin spending forty votes are the same total.
 *
 * The two rank orderings are `composite` in each direction. It used to be
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
export type QueueSortId =
  | "topRank"
  | "bottomRank"
  | "topVotes"
  | "bottomVotes"
  | "mostBackers"
  | "latest"
  | "oldest"
  | "expected";

export const QUEUE_SORTS: {
  id: QueueSortId;
  label: string;
  sortBy: SortBy;
  order: Order;
}[] = [
  { id: "topRank", label: "Top rank first", sortBy: "composite", order: "DESC" },
  { id: "bottomRank", label: "Bottom rank first", sortBy: "composite", order: "ASC" },
  // The raw signal, kept reachable so the composite can be checked against it.
  { id: "topVotes", label: "Most votes first", sortBy: "priority", order: "DESC" },
  { id: "bottomVotes", label: "Fewest votes first", sortBy: "priority", order: "ASC" },
  { id: "mostBackers", label: "Most admins backing", sortBy: "voters", order: "DESC" },
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
