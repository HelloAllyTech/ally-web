/**
 * Pure state and arithmetic for the advanced filter panel.
 *
 * Separate from RoadmapAdvancedFilters.tsx on purpose: that component imports Carbon and
 * `@components`, and pulling either into a unit test drags in a module graph that fails to load
 * under vitest. Every other piece of roadmap logic worth testing lives in utils/ for the same
 * reason — see utils/coins.ts and utils/views.ts.
 */

/** The four range/identity filters, grouped so the parent passes and stores one object. */
export interface RoadmapAdvancedFilterValues {
  createdBy: number[];
  dateFrom: string;
  dateTo: string;
  releasedFrom: string;
  releasedTo: string;
  /** Kept as strings so "" can mean "no bound" — 0 is a legitimate score filter. */
  priorityMin: string;
  priorityMax: string;
}

export const EMPTY_ADVANCED_FILTERS: RoadmapAdvancedFilterValues = {
  createdBy: [],
  dateFrom: "",
  dateTo: "",
  releasedFrom: "",
  releasedTo: "",
  priorityMin: "",
  priorityMax: "",
};

/**
 * How many of these are narrowing the list. Drives the badge on the collapsed panel.
 *
 * A date range counts ONCE whether one or both bounds are set — the user thinks of it as one
 * filter. Priority is compared against "" rather than tested for truthiness, because
 * `priorityMin: "0"` is a real filter and a truthiness check would report the panel as inactive
 * while it was hiding rows.
 */
export const countActiveAdvancedFilters = (v: RoadmapAdvancedFilterValues): number =>
  (v.createdBy.length ? 1 : 0) +
  (v.dateFrom || v.dateTo ? 1 : 0) +
  (v.releasedFrom || v.releasedTo ? 1 : 0) +
  (v.priorityMin !== "" || v.priorityMax !== "" ? 1 : 0);
