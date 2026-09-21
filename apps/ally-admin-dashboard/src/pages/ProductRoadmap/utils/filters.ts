/**
 * Pure state and arithmetic for the advanced filter panel.
 *
 * Separate from RoadmapAdvancedFilters.tsx on purpose: that component imports Carbon and
 * `@components`, and pulling either into a unit test drags in a module graph that fails to load
 * under vitest. Every other piece of roadmap logic worth testing lives in utils/ for the same
 * reason — see utils/votes.ts and utils/views.ts.
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
  (v.createdBy.length ? 1 : 0) + countActiveRangeFilters(v);

/**
 * The three RANGES only — the badge on the collapsed "More filters" disclosure.
 *
 * Split from countActiveAdvancedFilters when `createdBy` moved into the Filter popover alongside
 * the other checkbox facets: the disclosure now holds nothing but ranges, so counting a creator
 * selection there would badge a panel that has no creator control in it. The wider count still
 * includes createdBy, because `hasActiveFilters` and "Clear all" both have to see it.
 */
export const countActiveRangeFilters = (v: RoadmapAdvancedFilterValues): number =>
  (v.dateFrom || v.dateTo ? 1 : 0) +
  (v.releasedFrom || v.releasedTo ? 1 : 0) +
  (v.priorityMin !== "" || v.priorityMax !== "" ? 1 : 0);

/**
 * Carbon hands back a Date at LOCAL midnight; the API and saved-view state both want YYYY-MM-DD.
 *
 * Built from the local calendar fields, NOT from `toISOString().slice(0, 10)`. That shortcut
 * converts to UTC first, so at any timezone east of Greenwich local midnight is still the previous
 * day in UTC and every pick was written back one day earlier — in IST, clicking Sep 1–Sep 2 stored
 * Aug 31–Sep 1, the controlled `value` fed that back into the calendar, and the range simply could
 * not be set. West of Greenwich the same bug rounds the other way.
 */
export const toIsoDate = (date?: Date): string => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
