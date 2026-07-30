import { RoadmapSavedView, RoadmapViewState } from "@types";

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
      canonical[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
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
