/**
 * Month-board logic, kept free of React, Carbon and dnd-kit on purpose.
 *
 * Same reason as utils/filters.ts: the drop resolver is the part of this feature most likely to be
 * subtly wrong (off-by-one on a downward drag, a card vanishing when dropped on an empty lane),
 * and it must be testable without pulling in the component module graph.
 *
 * Month keys are 'YYYY-MM' — the same shape the backend uses, so they sort lexicographically and
 * a window is a string comparison.
 */

/** The Unscheduled lane's month. Exported so callers stop writing `null` and meaning "no month". */
export const UNSCHEDULED = null;

const LANE_ID_PREFIX = "lane:";
const UNSCHEDULED_LANE_KEY = "unscheduled";

/** A lane reduced to what a drop needs to know. */
export interface LaneSnapshot {
  month: string | null;
  ids: string[];
}

export interface DropResult {
  /** Destination lane. Null is Unscheduled. */
  month: string | null;
  /** The destination lane's FULL new order — what PUT board/lane wants. */
  orderedIds: string[];
  /** False when the card changed lane, so the caller knows a month write is involved. */
  withinLane: boolean;
}

// ── month arithmetic (mirrors ally-be util/roadmap-month.util.ts) ─────────────

/** 'YYYY-MM' for a date, in UTC — the basis the backend groups lanes on. */
export const monthKeyOf = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * Step a month key by whole months.
 *
 * Anchored on day 1 via Date.UTC, which normalises overflow in both directions — so December + 1
 * is next January rather than '2026-13', and no 31st-of-the-month anchor can skip February.
 */
export const shiftMonthKey = (key: string, delta: number): string => {
  const [year, month] = key.split("-").map(Number);
  return monthKeyOf(new Date(Date.UTC(year, month - 1 + delta, 1)));
};

/** Inclusive list of month keys. Empty when the range is inverted. */
export const monthKeyRange = (from: string, to: string): string[] => {
  const keys: string[] = [];
  let cursor = from;
  while (cursor <= to && keys.length < 120) {
    keys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
  }
  return keys;
};

/**
 * Column heading for a lane: "Aug 2026", or "Unscheduled".
 *
 * Built from an explicit month-name table rather than toLocaleDateString, because the latter
 * varies with the runtime's locale and ICU build — a board whose column headings differ between
 * two admins' machines is a support ticket nobody can reproduce.
 */
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const monthLabel = (month: string | null): string => {
  if (month === null) return "Unscheduled";
  const [year, index] = month.split("-").map(Number);
  const name = MONTH_NAMES[index - 1];
  // A malformed key shows itself rather than rendering "undefined 2026".
  return name ? `${name} ${year}` : month;
};

// ── dnd-kit ids ──────────────────────────────────────────────────────────────

/**
 * The droppable id for a lane.
 *
 * Prefixed so a drop target can be told apart from a card id, which is a bare uuid. Dropping onto
 * the empty area of a lane reports the LANE as `over`, and without this the resolver would treat
 * that as "dropped on a card that doesn't exist" and silently discard the drag.
 */
export const laneDomId = (month: string | null): string =>
  `${LANE_ID_PREFIX}${month ?? UNSCHEDULED_LANE_KEY}`;

export const isLaneDomId = (id: string): boolean => id.startsWith(LANE_ID_PREFIX);

/** Inverse of laneDomId. Returns undefined for anything that is not a lane id. */
export const monthFromLaneDomId = (id: string): string | null | undefined => {
  if (!isLaneDomId(id)) return undefined;
  const key = id.slice(LANE_ID_PREFIX.length);
  return key === UNSCHEDULED_LANE_KEY ? null : key;
};

// ── the drop resolver ────────────────────────────────────────────────────────

/** Local arrayMove, so this module needs no dnd-kit import to be tested. */
const arrayMove = <T>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * Turn a dnd-kit drag end into the one lane write it implies.
 *
 * Returns null for a no-op — an unknown card, an unresolvable target, or a drag that landed
 * exactly where it started. Returning null rather than an identity write matters: every accepted
 * drop fires a mutation and a socket broadcast, and a board where clicking a card triggers a
 * round-trip feels broken to everyone else looking at it.
 *
 * Only the DESTINATION lane's order is returned. The source lane is deliberately left alone: its
 * remaining cards keep their positions, which now have a gap where the moved card was, and gaps
 * are harmless because the ordering has deterministic tiebreaks. Rewriting both lanes would
 * double the writes to make the numbers tidier and nothing else.
 */
export const resolveDrop = (
  lanes: LaneSnapshot[],
  activeId: string,
  overId: string,
): DropResult | null => {
  const from = lanes.find(lane => lane.ids.includes(activeId));
  if (!from) return null;

  const overMonth = monthFromLaneDomId(overId);
  const to =
    overMonth === undefined
      ? lanes.find(lane => lane.ids.includes(overId))
      : lanes.find(lane => lane.month === overMonth);
  if (!to) return null;

  if (from.month === to.month) {
    const fromIndex = from.ids.indexOf(activeId);
    // Dropped on the lane itself rather than a card: that means the end of the lane.
    const toIndex = isLaneDomId(overId) ? from.ids.length - 1 : from.ids.indexOf(overId);
    if (toIndex === -1 || fromIndex === toIndex) return null;
    // arrayMove, not filter-then-insert: it is the semantic dnd-kit's own sortable preview
    // animates, so what the user watched happen is what gets persisted. Hand-rolling the index
    // is where the classic off-by-one on a downward drag comes from.
    return {
      month: to.month,
      orderedIds: arrayMove(from.ids, fromIndex, toIndex),
      withinLane: true,
    };
  }

  const withoutActive = to.ids.filter(id => id !== activeId);
  const overIndex = isLaneDomId(overId) ? -1 : withoutActive.indexOf(overId);
  const insertAt = overIndex === -1 ? withoutActive.length : overIndex;

  return {
    month: to.month,
    orderedIds: [...withoutActive.slice(0, insertAt), activeId, ...withoutActive.slice(insertAt)],
    withinLane: false,
  };
};

/**
 * Whether a card may be dragged at all.
 *
 * A shipped card's lane is its release month, which is a fact — so it is made undraggable rather
 * than allowed to be dragged into a 422. The one thing it MAY do is move within its own lane, but
 * dnd-kit has no "draggable only within this container" mode, so the simpler and more honest
 * answer is to lock it and explain why in a tooltip.
 */
export const isDraggable = (opportunity: { monthPinned?: boolean }): boolean =>
  !opportunity.monthPinned;
