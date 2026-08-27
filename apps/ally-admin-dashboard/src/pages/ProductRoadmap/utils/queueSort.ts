import { RoadmapOpportunitiesQuery } from "@types";

type SortBy = NonNullable<RoadmapOpportunitiesQuery["sortBy"]>;
type Order = "ASC" | "DESC";

/**
 * The Queue's three orderings, in the vocabulary a reader uses rather than the API's.
 *
 * "By rank" IS total votes descending — the same thing the rank number counts. The other two are
 * filing date. The rank stays visible under all three, because ally-be computes it over the whole
 * queue rather than from the card's position on screen; ordering the feed by date reorders the
 * cards without changing what any of them is ranked.
 */
export type QueueSortId = "rank" | "latest" | "oldest";

export const QUEUE_SORTS: {
  id: QueueSortId;
  label: string;
  sortBy: SortBy;
  order: Order;
}[] = [
  { id: "rank", label: "By rank", sortBy: "priority", order: "DESC" },
  { id: "latest", label: "Latest first", sortBy: "createdAt", order: "DESC" },
  { id: "oldest", label: "Oldest first", sortBy: "createdAt", order: "ASC" },
];

/**
 * Which option the current query state corresponds to.
 *
 * Falls back to "rank" rather than to undefined: the control has to show something, and every
 * other ordering the API can express (myVotes, description, releasedAt) is unreachable from the
 * Queue, so an unrecognised pair can only come from state carried in from another layout.
 */
export const queueSortIdFor = (sortBy: SortBy, order: Order): QueueSortId =>
  QUEUE_SORTS.find(s => s.sortBy === sortBy && s.order === order)?.id ?? "rank";
