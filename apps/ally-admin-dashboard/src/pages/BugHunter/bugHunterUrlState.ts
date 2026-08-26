import { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { BugFindingSeverity, BugFindingSource, BugFindingStage, BugFindingStatus } from "@types";

import {
  AGE_FILTERS,
  AgeFilter,
  DEFAULT_SORT_DIRECTION,
  SORT_KEYS,
  SortDirection,
  SortKey,
} from "./findingsView";
import { LIFECYCLE_BUCKETS, LifecycleBucket } from "./lifecycleBucket";

import type { BucketFilter } from "./LifecycleBucketChips";

/**
 * The tab's view state, kept in the query string instead of in `useState`.
 *
 * ## What this fixes
 *
 * Every filter and the open bug lived in component state, which made three
 * ordinary things impossible on a page whose whole job is triage:
 *
 * - **Sending someone a bug.** "Take a look at the ally-be release failure" had
 *   no link attached to it. The recipient got the tab and a description of how
 *   to find the row.
 * - **Bookmarking a view.** "Everything red in ally-be" is a question an admin
 *   asks daily and had to re-answer with four controls every time.
 *   `?bucket=problem&repo=ally-be` is that question, saved.
 * - **The back button.** Opening a bug and pressing Back left the page, losing
 *   the filters that found it, rather than closing the drawer.
 *
 * ## Sort and page size live here too
 *
 * They were the last two `useState`s left in the table, and the omission had a
 * cost that reads as a bug rather than as a gap: "the oldest bugs nobody has
 * touched" is a *sort* plus a filter, and pasting that link handed the reader
 * the filter with the default sort back on — the same list in a different
 * order, silently. Anything that changes which rows a reader sees, or in what
 * order, belongs in the address bar.
 *
 * Density stays here for the same reason it always did: it is a preference,
 * but a shareable one, and a screenshot request ("look at row 14") survives it.
 *
 * ## Push for the drawer, replace for the filters
 *
 * Opening a bug **pushes** a history entry, so Back closes the drawer and lands
 * you exactly where you were — the behaviour anyone who has used a mail client
 * expects, and the reason this is worth doing at the router rather than with a
 * `useState` and a `useEffect`.
 *
 * Typing in the search box **replaces**. A search box that pushes one entry per
 * keystroke means "aut" -> "auth" costs four presses of Back to undo, which is
 * the single most common way URL-state goes wrong.
 *
 * ## The URL is untrusted input
 *
 * Every reader below validates against the real enum and drops what it does not
 * recognise, rather than passing a hand-typed `?sev=critical` through to a
 * filter that would then match nothing and look broken. That validation is
 * per-value for the multi-select facets, not per-param: `?sev=high,critical`
 * filters to high rather than throwing the whole param away, because the half
 * of the link that parses is still the link somebody meant to send. An unknown
 * value is treated as absent, never as an error — the page is not the place to
 * complain about a mistyped link.
 */

/**
 * Query-string keys. Short on purpose: these end up in links people paste into
 * chat, and `?bucket=needs_you&repo=ally-be` survives that better than a URL
 * carrying `severityFilter` and `lifecycleBucketSelection`.
 */
export const BUG_HUNTER_PARAM = {
  /** The finding whose drawer is open. */
  bug: "bug",
  bucket: "bucket",
  /** Free-text search. `q` because that is what every search box in the world calls it. */
  search: "q",
  /**
   * Scope the table to one sweep's findings — what the shift log's "Found N"
   * links to.
   *
   * Unlike every other key here this one is NOT a client-side filter over the
   * loaded window: it is passed to `GET /findings` so the window itself becomes
   * that run's findings. A sweep stamps its id onto every row it touches,
   * including a human-reported bug filed weeks ago, so its findings are not the
   * newest rows and a window-local filter would have found only the handful
   * that happened to be recent.
   */
  run: "run",
  /** Comma-joined, like every facet below. `repo=ally-be,ally-web` reads as what it does. */
  repo: "repo",
  severity: "sev",
  source: "src",
  status: "status",
  stage: "stage",
  age: "age",
  /** Present-and-`1` means on. Absent means off — see `write` on why defaults are dropped. */
  duplicates: "dup",
  sort: "sort",
  direction: "dir",
  /** Rows per page. */
  pageSize: "size",
  density: "density",
} as const;

/** How tall a table row is. A preference, but a shareable one — it belongs in the same place as the rest. */
export type TableDensity = "comfortable" | "compact";

const DENSITIES: TableDensity[] = ["comfortable", "compact"];

/**
 * Rows per page.
 *
 * 20 stays the default — it is what fits a laptop screen without the sticky
 * header doing all the work. The larger two exist because the window is only
 * ever 100 rows: at 100 the reader can select the whole window in one gesture
 * and act on it, which is the fastest way to clear a backlog of duplicates and
 * was previously five page-loads of select-page.
 */
export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

const BUCKET_VALUES = new Set<string>(LIFECYCLE_BUCKETS);
const SEVERITY_VALUES = new Set<string>(Object.values(BugFindingSeverity));
const SOURCE_VALUES = new Set<string>(Object.values(BugFindingSource));
const STATUS_VALUES = new Set<string>(Object.values(BugFindingStatus));
const STAGE_VALUES = new Set<string>(Object.values(BugFindingStage));
const AGE_VALUES = new Set<string>(AGE_FILTERS);
const SORT_VALUES = new Set<string>(SORT_KEYS);

/**
 * Reads one single-valued param and validates it against a set of known values.
 *
 * Returns `"all"` for anything absent, empty or unrecognised — see the module
 * doc on why an unknown value is silently the default rather than an error.
 */
const readFacet = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: Set<string>,
): T | "all" => {
  const raw = params.get(key);
  return raw && allowed.has(raw) ? (raw as T) : "all";
};

/**
 * Reads a comma-joined multi-select facet, keeping only values the enum knows.
 *
 * Deduplicated, because `?sev=high,high` is a link somebody hand-edited and
 * a doubled value would double-count in the "3 filters" badge.
 */
const readList = <T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: Set<string>,
): T[] => {
  const raw = params.get(key);
  if (!raw) return [];
  return Array.from(new Set(raw.split(",").filter(value => allowed.has(value)))) as T[];
};

/**
 * Reads the repo facet, which is the one list with no enum behind it.
 *
 * The set of repos is whatever the loaded findings mention, which this hook
 * cannot see. Blank segments are dropped so `?repo=,ally-be` cannot produce an
 * empty-string repo that matches nothing; a *real-looking* repo that matches
 * nothing already renders as an empty table with a "clear filters" button on it.
 */
const readRepos = (params: URLSearchParams): string[] => {
  const raw = params.get(BUG_HUNTER_PARAM.repo);
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
    ),
  );
};

export interface BugHunterUrlState {
  /** The open finding's id, or null when the drawer is closed. */
  bug: string | null;
  bucket: BucketFilter;
  search: string;
  /** The sweep whose findings the table is scoped to, or null for every bug. */
  run: string | null;
  repos: string[];
  severities: BugFindingSeverity[];
  sources: BugFindingSource[];
  statuses: BugFindingStatus[];
  stages: BugFindingStage[];
  age: AgeFilter;
  duplicatesOnly: boolean;
  sort: SortKey;
  direction: SortDirection;
  pageSize: PageSize;
  density: TableDensity;
}

export interface BugHunterUrlActions {
  /** Opens a bug's drawer, or closes it with `null`. Pushes history so Back closes the drawer. */
  setBug: (id: string | null) => void;
  setBucket: (bucket: BucketFilter) => void;
  setSearch: (search: string) => void;
  /**
   * Scopes the table to one sweep, or drops the scope with `null`.
   *
   * Clears the other filters in the same write, deliberately. This is reached
   * by clicking a count in the shift log — "the 10 that sweep found" — and
   * intersecting that with a severity filter left over from earlier would
   * answer a question nobody asked, while still showing "10" in the log. One
   * `write` call, not five setters, for the reason `write`'s doc gives.
   */
  setRun: (runId: string | null) => void;
  setRepos: (repos: string[]) => void;
  setSeverities: (severities: BugFindingSeverity[]) => void;
  setSources: (sources: BugFindingSource[]) => void;
  setStatuses: (statuses: BugFindingStatus[]) => void;
  setStages: (stages: BugFindingStage[]) => void;
  setAge: (age: AgeFilter) => void;
  setDuplicatesOnly: (only: boolean) => void;
  /**
   * Sets the sort column and direction in one write.
   *
   * One setter rather than two, and not because it is tidier: two setters fired
   * in the same tick clobber each other here, and "click a new column header"
   * is exactly the gesture that wants to change both. See `write`.
   */
  setSort: (key: SortKey, direction: SortDirection) => void;
  /** Flips the current column, or moves to a new one at its natural direction. */
  toggleSort: (key: SortKey) => void;
  setPageSize: (size: PageSize) => void;
  setDensity: (density: TableDensity) => void;
  /** Drops every filter but leaves the open bug, the sort and the density preference alone. */
  clearFilters: () => void;
}

/**
 * True when any filter is set — used to decide whether to offer "Clear
 * filters". Density, sort, page size and the open bug are not filters and are
 * excluded: none of them changes *which* bugs are on the page.
 */
export const hasFilterParams = (state: BugHunterUrlState): boolean =>
  state.bucket !== "all" ||
  state.search.trim() !== "" ||
  state.run !== null ||
  state.repos.length > 0 ||
  state.severities.length > 0 ||
  state.sources.length > 0 ||
  state.statuses.length > 0 ||
  state.stages.length > 0 ||
  state.age !== "all" ||
  state.duplicatesOnly;

/** Joins a facet for the URL, or `null` to drop the param when nothing is selected. */
const writeList = (values: readonly string[]): string | null =>
  values.length > 0 ? values.join(",") : null;

export const useBugHunterUrlState = (): BugHunterUrlState & BugHunterUrlActions => {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<BugHunterUrlState>(() => {
    const rawDensity = searchParams.get(BUG_HUNTER_PARAM.density);
    const rawSort = searchParams.get(BUG_HUNTER_PARAM.sort);
    const sort = rawSort && SORT_VALUES.has(rawSort) ? (rawSort as SortKey) : "discovered";
    const rawDirection = searchParams.get(BUG_HUNTER_PARAM.direction);
    const rawSize = Number(searchParams.get(BUG_HUNTER_PARAM.pageSize));
    const rawAge = readFacet<AgeFilter>(searchParams, BUG_HUNTER_PARAM.age, AGE_VALUES);

    return {
      bug: searchParams.get(BUG_HUNTER_PARAM.bug) || null,
      bucket: readFacet<LifecycleBucket>(searchParams, BUG_HUNTER_PARAM.bucket, BUCKET_VALUES),
      search: searchParams.get(BUG_HUNTER_PARAM.search) ?? "",
      // Unvalidated for the same reason as `repos`: this hook cannot see the
      // run list, and a run id that matches nothing renders as an empty scope
      // banner with a "show all bugs" button already on it.
      run: searchParams.get(BUG_HUNTER_PARAM.run) || null,
      repos: readRepos(searchParams),
      severities: readList<BugFindingSeverity>(
        searchParams,
        BUG_HUNTER_PARAM.severity,
        SEVERITY_VALUES,
      ),
      sources: readList<BugFindingSource>(searchParams, BUG_HUNTER_PARAM.source, SOURCE_VALUES),
      statuses: readList<BugFindingStatus>(searchParams, BUG_HUNTER_PARAM.status, STATUS_VALUES),
      stages: readList<BugFindingStage>(searchParams, BUG_HUNTER_PARAM.stage, STAGE_VALUES),
      // `readFacet` speaks "all" and the age filter's own absent value is also
      // "all", so this needs no translation — unlike the lists above.
      age: rawAge,
      duplicatesOnly: searchParams.get(BUG_HUNTER_PARAM.duplicates) === "1",
      sort,
      // An unrecognised direction falls back to the column's natural one rather
      // than to a fixed "desc": `?sort=title` with no `dir` should read A–Z.
      direction:
        rawDirection === "asc" || rawDirection === "desc"
          ? rawDirection
          : DEFAULT_SORT_DIRECTION[sort],
      pageSize: (PAGE_SIZES as readonly number[]).includes(rawSize)
        ? (rawSize as PageSize)
        : DEFAULT_PAGE_SIZE,
      density: DENSITIES.includes(rawDensity as TableDensity)
        ? (rawDensity as TableDensity)
        : "comfortable",
    };
  }, [searchParams]);

  /**
   * Writes a batch of params, dropping any set to a default.
   *
   * Dropping rather than writing `bucket=all` keeps a default view's URL clean
   * — the tab's own address stays `/bug-hunter`, so a bookmark of the page is
   * not silently a bookmark of one filter combination.
   *
   * One real limitation, found by driving the live page: two `write` calls in
   * the *same tick* clobber each other. `setSearchParams`' functional form
   * looks like it should compose the way `useState`'s does, and it does not —
   * each call navigates, and the second one's `current` is still the params
   * from before the first. Setting density and a bucket in one synchronous
   * burst therefore keeps only the bucket.
   *
   * That is survivable rather than fixed, because nothing here writes twice in
   * a tick: every control is one user gesture, typing is one key at a time, and
   * `clearFilters` and `setSort` deliberately pass every key they touch to a
   * **single** call instead of calling the setters. Keep that property — a new
   * setter that fires alongside another is where this would start losing a
   * param, and it would do it silently.
   */
  const write = useCallback(
    (patch: Record<string, string | null>, { push = false }: { push?: boolean } = {}) => {
      setSearchParams(
        current => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === "" || value === "all") next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: !push },
      );
    },
    [setSearchParams],
  );

  const setBug = useCallback(
    (id: string | null) => write({ [BUG_HUNTER_PARAM.bug]: id }, { push: true }),
    [write],
  );

  const setBucket = useCallback(
    (bucket: BucketFilter) => write({ [BUG_HUNTER_PARAM.bucket]: bucket }),
    [write],
  );

  const setSearch = useCallback(
    (search: string) => write({ [BUG_HUNTER_PARAM.search]: search }),
    [write],
  );

  const setRun = useCallback(
    (runId: string | null) =>
      write({
        [BUG_HUNTER_PARAM.run]: runId,
        // Same single call, so nothing is clobbered — see `write`'s doc.
        [BUG_HUNTER_PARAM.bucket]: null,
        [BUG_HUNTER_PARAM.search]: null,
        [BUG_HUNTER_PARAM.repo]: null,
        [BUG_HUNTER_PARAM.severity]: null,
        [BUG_HUNTER_PARAM.source]: null,
        [BUG_HUNTER_PARAM.status]: null,
        [BUG_HUNTER_PARAM.stage]: null,
        [BUG_HUNTER_PARAM.age]: null,
        [BUG_HUNTER_PARAM.duplicates]: null,
      }),
    [write],
  );

  const setRepos = useCallback(
    (repos: string[]) => write({ [BUG_HUNTER_PARAM.repo]: writeList(repos) }),
    [write],
  );

  const setSeverities = useCallback(
    (severities: BugFindingSeverity[]) =>
      write({ [BUG_HUNTER_PARAM.severity]: writeList(severities) }),
    [write],
  );

  const setSources = useCallback(
    (sources: BugFindingSource[]) => write({ [BUG_HUNTER_PARAM.source]: writeList(sources) }),
    [write],
  );

  const setStatuses = useCallback(
    (statuses: BugFindingStatus[]) => write({ [BUG_HUNTER_PARAM.status]: writeList(statuses) }),
    [write],
  );

  const setStages = useCallback(
    (stages: BugFindingStage[]) => write({ [BUG_HUNTER_PARAM.stage]: writeList(stages) }),
    [write],
  );

  const setAge = useCallback((age: AgeFilter) => write({ [BUG_HUNTER_PARAM.age]: age }), [write]);

  // Written as "1" rather than "true" so the off state is a dropped param and
  // the on state is as short as it can be — see `write`.
  const setDuplicatesOnly = useCallback(
    (only: boolean) => write({ [BUG_HUNTER_PARAM.duplicates]: only ? "1" : null }),
    [write],
  );

  const setSort = useCallback(
    (key: SortKey, direction: SortDirection) =>
      write({
        // The default sort is the absent one, so clicking back to
        // newest-first leaves a clean URL rather than `?sort=discovered&dir=desc`.
        [BUG_HUNTER_PARAM.sort]: key === "discovered" && direction === "desc" ? null : key,
        [BUG_HUNTER_PARAM.direction]:
          key === "discovered" && direction === "desc" ? null : direction,
      }),
    [write],
  );

  const toggleSort = useCallback(
    (key: SortKey) =>
      setSort(
        key,
        key === state.sort
          ? state.direction === "asc"
            ? "desc"
            : "asc"
          : // A new column starts on the direction that column is usually read
            // in: newest-first for a date, worst-first for severity, A–Z for a
            // title.
            DEFAULT_SORT_DIRECTION[key],
      ),
    [setSort, state.sort, state.direction],
  );

  const setPageSize = useCallback(
    (size: PageSize) =>
      write({
        [BUG_HUNTER_PARAM.pageSize]: size === DEFAULT_PAGE_SIZE ? null : String(size),
      }),
    [write],
  );

  // "comfortable" is the default, so it is written as a removal — see `write`.
  const setDensity = useCallback(
    (density: TableDensity) =>
      write({ [BUG_HUNTER_PARAM.density]: density === "comfortable" ? null : density }),
    [write],
  );

  const clearFilters = useCallback(
    () =>
      write({
        [BUG_HUNTER_PARAM.bucket]: null,
        [BUG_HUNTER_PARAM.search]: null,
        [BUG_HUNTER_PARAM.run]: null,
        [BUG_HUNTER_PARAM.repo]: null,
        [BUG_HUNTER_PARAM.severity]: null,
        [BUG_HUNTER_PARAM.source]: null,
        [BUG_HUNTER_PARAM.status]: null,
        [BUG_HUNTER_PARAM.stage]: null,
        [BUG_HUNTER_PARAM.age]: null,
        [BUG_HUNTER_PARAM.duplicates]: null,
      }),
    [write],
  );

  return {
    ...state,
    setBug,
    setBucket,
    setSearch,
    setRun,
    setRepos,
    setSeverities,
    setSources,
    setStatuses,
    setStages,
    setAge,
    setDuplicatesOnly,
    setSort,
    toggleSort,
    setPageSize,
    setDensity,
    clearFilters,
  };
};
