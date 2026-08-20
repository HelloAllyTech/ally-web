import { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { BugFindingSeverity, BugFindingSource } from "@types";

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
 * Every reader below validates against the real enum and falls back to "all"
 * rather than passing a hand-typed `?sev=critical` through to a filter that
 * would then match nothing and look broken. Same for `?bucket=`, `?src=` and
 * `?density=`. An unknown value is treated as absent, never as an error — the
 * page is not the place to complain about a mistyped link.
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
  repo: "repo",
  severity: "sev",
  source: "src",
  density: "density",
} as const;

/** How tall a table row is. A preference, but a shareable one — it belongs in the same place as the rest. */
export type TableDensity = "comfortable" | "compact";

const DENSITIES: TableDensity[] = ["comfortable", "compact"];

const BUCKET_VALUES = new Set<string>(LIFECYCLE_BUCKETS);
const SEVERITY_VALUES = new Set<string>(Object.values(BugFindingSeverity));
const SOURCE_VALUES = new Set<string>(Object.values(BugFindingSource));

/**
 * Reads one param and validates it against a set of known values.
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

export interface BugHunterUrlState {
  /** The open finding's id, or null when the drawer is closed. */
  bug: string | null;
  bucket: BucketFilter;
  search: string;
  repo: string | "all";
  severity: BugFindingSeverity | "all";
  source: BugFindingSource | "all";
  density: TableDensity;
}

export interface BugHunterUrlActions {
  /** Opens a bug's drawer, or closes it with `null`. Pushes history so Back closes the drawer. */
  setBug: (id: string | null) => void;
  setBucket: (bucket: BucketFilter) => void;
  setSearch: (search: string) => void;
  setRepo: (repo: string | "all") => void;
  setSeverity: (severity: BugFindingSeverity | "all") => void;
  setSource: (source: BugFindingSource | "all") => void;
  setDensity: (density: TableDensity) => void;
  /** Drops every filter but leaves the open bug and the density preference alone. */
  clearFilters: () => void;
}

/**
 * True when any filter is set — used to decide whether to offer "Clear
 * filters". Density and the open bug are not filters and are excluded.
 */
export const hasFilterParams = (state: BugHunterUrlState): boolean =>
  state.bucket !== "all" ||
  state.search.trim() !== "" ||
  state.repo !== "all" ||
  state.severity !== "all" ||
  state.source !== "all";

export const useBugHunterUrlState = (): BugHunterUrlState & BugHunterUrlActions => {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<BugHunterUrlState>(() => {
    const rawDensity = searchParams.get(BUG_HUNTER_PARAM.density);
    return {
      bug: searchParams.get(BUG_HUNTER_PARAM.bug) || null,
      bucket: readFacet<LifecycleBucket>(searchParams, BUG_HUNTER_PARAM.bucket, BUCKET_VALUES),
      search: searchParams.get(BUG_HUNTER_PARAM.search) ?? "",
      // Repo is deliberately unvalidated against a list: the set of repos is
      // whatever the loaded findings mention, which this hook cannot see, and a
      // repo that matches nothing already renders as an empty table with a
      // "clear filters" button on it.
      repo: searchParams.get(BUG_HUNTER_PARAM.repo) || "all",
      severity: readFacet<BugFindingSeverity>(
        searchParams,
        BUG_HUNTER_PARAM.severity,
        SEVERITY_VALUES,
      ),
      source: readFacet<BugFindingSource>(searchParams, BUG_HUNTER_PARAM.source, SOURCE_VALUES),
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
   * `clearFilters` deliberately passes all five keys to a **single** call
   * instead of calling the five setters. Keep that property — a new setter that
   * fires alongside another is where this would start losing a param, and it
   * would do it silently.
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

  const setRepo = useCallback(
    (repo: string | "all") => write({ [BUG_HUNTER_PARAM.repo]: repo }),
    [write],
  );

  const setSeverity = useCallback(
    (severity: BugFindingSeverity | "all") => write({ [BUG_HUNTER_PARAM.severity]: severity }),
    [write],
  );

  const setSource = useCallback(
    (source: BugFindingSource | "all") => write({ [BUG_HUNTER_PARAM.source]: source }),
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
        [BUG_HUNTER_PARAM.repo]: null,
        [BUG_HUNTER_PARAM.severity]: null,
        [BUG_HUNTER_PARAM.source]: null,
      }),
    [write],
  );

  return {
    ...state,
    setBug,
    setBucket,
    setSearch,
    setRepo,
    setSeverity,
    setSource,
    setDensity,
    clearFilters,
  };
};
