import { RoadmapSavedView, RoadmapViewState } from "@types";

/**
 * Sort-field names the STANDALONE app wrote into saved-view state, mapped to the API's names.
 *
 * This is a real data-compatibility problem, not defensive padding: 3 of the 8 views migrated
 * from production carry `created` or `released`, and the API's sortBy enum only accepts
 * `priority | createdAt | releasedAt | myCoins | description`. Applying such a view sent
 * `sortBy=created`, the request 400'd, and the board silently kept showing the PREVIOUS rows —
 * the filter chips updated while the table did not, which reads as "filters are broken".
 *
 * Normalising on read (rather than rewriting the rows in the import) keeps the migration a pure
 * copy and lets views self-heal: the next autosave writes the canonical name.
 */
const LEGACY_SORT_FIELDS: Record<string, string> = {
  created: "createdAt",
  released: "releasedAt",
  score: "priority",
  coins: "myCoins",
};

export const normaliseSortField = (field: string | undefined): string =>
  (field && LEGACY_SORT_FIELDS[field]) || field || "priority";

/** Every key of RoadmapViewState, in a fixed order. See serializeViewState. */
const STATE_KEYS: (keyof RoadmapViewState)[] = [
  "searchQuery",
  "typeFilter",
  "stageFilter",
  "goalFilter",
  "ownerFilter",
  "creatorFilter",
  "dateFrom",
  "dateTo",
  "releasedFrom",
  "releasedTo",
  "priorityMin",
  "priorityMax",
  "sort",
  // Appended, not inserted: STATE_KEYS drives a canonical serialisation used for the dirty check,
  // and the order only has to be STABLE, not meaningful. Absent on every pre-month-board view,
  // and serializeViewState skips undefined — so an old view does not become permanently dirty
  // just because this key now exists.
  "layout",
];

/**
 * Canonical, key-ORDERED serialisation of a view's state, for the dirty check.
 *
 * Postgres jsonb does not preserve key order, so the state that comes back from the API is a
 * differently-ordered object than the one that was sent. A naive JSON.stringify comparison
 * therefore reports a mismatch immediately and every saved view looks permanently dirty — the
 * standalone app hit exactly this and documented it. Arrays are sorted too, since filter order
 * carries no meaning.
 */
export const serializeViewState = (state: RoadmapViewState | undefined): string => {
  if (!state) return "{}";
  const canonical: Record<string, unknown> = {};
  for (const key of STATE_KEYS) {
    const value = state[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      canonical[key] = [...value].sort();
    } else if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        // Legacy and canonical field names must compare EQUAL, or every migrated view would show
        // a permanent unsaved-changes dot the moment it is opened.
        key === "sort" && k === "field" ? [k, normaliseSortField(String(v))] : [k, v],
      );
      canonical[key] = Object.fromEntries(
        entries.sort(([a], [b]) => String(a).localeCompare(String(b))),
      );
    } else {
      canonical[key] = value;
    }
  }
  return JSON.stringify(canonical);
};

export const isViewDirty = (
  current: RoadmapViewState,
  saved: RoadmapViewState | undefined,
): boolean => serializeViewState(current) !== serializeViewState(saved);

/**
 * Apply a user's saved tab order to the visible views.
 *
 * Deliberately TOLERANT, mirroring utils/navigation.ts's applySavedOrder: ids in the saved
 * order that no longer resolve are skipped, and views missing from the order are appended in
 * natural order. A stale order must degrade to a slightly-wrong order, never to a hidden view.
 *
 * Pinned views always sort ahead of personal ones, so the two groups stay visually distinct.
 */
export const applySavedViewOrder = (
  views: RoadmapSavedView[],
  savedOrder: string[] | undefined,
): RoadmapSavedView[] => {
  const byId = new Map(views.map(v => [v.id, v]));
  const ordered: RoadmapSavedView[] = [];

  for (const id of savedOrder ?? []) {
    const view = byId.get(id);
    if (view) {
      ordered.push(view);
      byId.delete(id);
    }
  }
  // Anything the saved order didn't mention keeps its natural position, at the end.
  ordered.push(...views.filter(v => byId.has(v.id)));

  return [...ordered.filter(v => v.pinned), ...ordered.filter(v => !v.pinned)];
};

/**
 * Whether a drag may land at `toIndex`.
 *
 * Fixes a real bug in the source: it happily persisted an order placing a personal view above a
 * pinned one, then re-sorted on render so the tab visibly snapped back. Rejecting the drop is
 * clearer than accepting and undoing it.
 */
export const isValidViewDrop = (
  views: RoadmapSavedView[],
  fromIndex: number,
  toIndex: number,
): boolean => {
  const moving = views[fromIndex];
  if (!moving) return false;
  const pinnedCount = views.filter(v => v.pinned).length;
  return moving.pinned ? toIndex < pinnedCount : toIndex >= pinnedCount;
};
