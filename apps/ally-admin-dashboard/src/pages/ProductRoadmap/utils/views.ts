import {
  RoadmapBoardLayout,
  RoadmapOpportunityStage,
  RoadmapSavedView,
  RoadmapViewState,
} from "@types";

/**
 * Sentinel id for the "Queue" pseudo-view, a second hardcoded default sitting next to "All" (see
 * SavedViewTabs). Not a real RoadmapSavedView row, so it can never collide with one — saved-view
 * ids are Postgres-generated UUIDs, "queue" is not a valid one.
 */
export const QUEUE_VIEW_ID = "queue";

/** What "Queue" shows: every opportunity still active in the pipeline, as a list. */
export const QUEUE_VIEW_STATE: RoadmapViewState = {
  stageFilter: [
    RoadmapOpportunityStage.NEW,
    RoadmapOpportunityStage.PRIORITISED,
    RoadmapOpportunityStage.UNDER_DEVELOPMENT,
  ],
  layout: RoadmapBoardLayout.LIST,
  /**
   * Pinned, not left to the default. The Queue's cards carry a RANK, and a rank is only the
   * truth if the list is ordered by the same thing the rank is computed from — applying this
   * view with a sort inherited from wherever the user just was (filed date, say) would number
   * the cards 1, 2, 3 down an order that has nothing to do with the ranking.
   *
   * `composite` since the board started ranking on four factors rather than on votes alone.
   * ally-be's queueRankSql orders by exactly the same expression, deliberately, so the two
   * cannot drift. `normaliseSortField` happens to default to this too; stating it means a
   * change to that default cannot silently invalidate the ranks.
   */
  sort: { field: "composite", dir: "desc" },
};

/**
 * Sort-field names the STANDALONE app wrote into saved-view state, mapped to the API's names.
 *
 * This is a real data-compatibility problem, not defensive padding: 3 of the 8 views migrated
 * from production carry `created` or `released`, and the API's sortBy enum only accepts
 * `priority | createdAt | releasedAt | myVotes | description`. Applying such a view sent
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
  coins: "myVotes",
};

/*
 * NOTE on `score: "priority"` above, now that ranking is a composite: a saved view that asked
 * for the vote order still GETS the vote order. That is intentional and is not an oversight —
 * a saved view records what its author chose to look at, and silently upgrading it to the new
 * default would change what an existing view shows without anyone touching it. The default
 * below is what moves; explicitly-saved sorts are left alone.
 */

export const normaliseSortField = (field: string | undefined): string =>
  (field && LEGACY_SORT_FIELDS[field]) || field || "composite";

/**
 * Drops `bug` from a saved view's type filter.
 *
 * Same failure this file's sort normalisation exists for, and the same fix. Bugs
 * left the board for Bug Hunter, so a saved view filtering to `["bug"]` now
 * matches nothing: the chips would say "Type: Bug" over an empty table, which
 * reads as the board being broken rather than as the view being obsolete. A view
 * that asked for BOTH types keeps working and simply means "everything".
 *
 * Normalised on read so views self-heal on their next autosave, and applied in
 * serializeViewState too — otherwise a legacy view compares unequal to its own
 * normalised form and shows a permanent unsaved-changes dot.
 */
export const normaliseTypeFilter = (types: string[] | undefined): string[] =>
  (types ?? []).filter(type => type !== "bug");

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
  // Same reasoning: absent on every view saved before the source filter existed, and skipped
  // when undefined, so it doesn't mark a pre-existing view dirty either.
  "sourceFilter",
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
      // Normalised before the emptiness check, not after: a view whose typeFilter
      // is exactly ["bug"] normalises to [], and that has to read as "no type
      // filter" — the same as the key being absent — or it stays permanently dirty.
      const normalised =
        key === "typeFilter" ? normaliseTypeFilter(value as string[]) : (value as unknown[]);
      if (normalised.length === 0) continue;
      canonical[key] = [...normalised].sort();
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
