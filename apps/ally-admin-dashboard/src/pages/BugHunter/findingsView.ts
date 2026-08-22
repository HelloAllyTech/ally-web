import { BugFinding, BugFindingSeverity, BugFindingStatus } from "@types";

import { bucketOfStatus } from "./lifecycleBucket";

import type { BucketFilter } from "./LifecycleBucketChips";

/**
 * Turning the loaded window of findings into the rows on screen: filter, sort,
 * flag duplicates, paginate.
 *
 * ## Why all of this is client-side
 *
 * `GET /findings` filters by one status, one source and one repo, and knows
 * nothing about free-text search, severity or the seven lifecycle buckets. It
 * could learn — but every surface on this tab (the card's status line, the
 * chips, the queue, this table) needs the *same* hundred findings, and they
 * currently share exactly one RTK Query cache entry because they all ask for
 * `{status: "all", limit: 100}`. Pushing filters into the query would fork that
 * entry per filter combination and turn one request into five, to sift a list
 * small enough that the sifting is free.
 *
 * So the window stays server-side (newest 100) and everything inside it is
 * computed here. The honest consequence is that filters describe the window and
 * not the whole table, which is why `FindingsView.windowed` exists: the table
 * states it in words rather than letting a reader assume a filter searched
 * history. That is the same failure the old workload strip's footnote was
 * apologising for, fixed by being accurate about the denominator instead.
 *
 * Kept out of the component for the ordinary reason: this is the part with
 * rules in it, and rules are worth testing without rendering a table.
 */

export type SortKey = "discovered" | "updated" | "severity" | "title";
export type SortDirection = "asc" | "desc";

/** High first when descending — the order an admin means by "sort by severity". */
const SEVERITY_RANK: Record<BugFindingSeverity, number> = {
  [BugFindingSeverity.HIGH]: 3,
  [BugFindingSeverity.MEDIUM]: 2,
  [BugFindingSeverity.LOW]: 1,
};

/** Unclassified severity ranks below "low" rather than above "high". */
const severityRank = (severity: BugFindingSeverity | null): number =>
  severity ? SEVERITY_RANK[severity] : 0;

export interface FindingsFilters {
  bucket: BucketFilter;
  /** Free text over title, file and repo. Trimmed and case-folded by `applyFilters`. */
  search: string;
  repo: string | "all";
  severity: BugFindingSeverity | "all";
  source: BugFinding["source"] | "all";
}

export const EMPTY_FILTERS: FindingsFilters = {
  bucket: "all",
  search: "",
  repo: "all",
  severity: "all",
  source: "all",
};

export const hasActiveFilters = (filters: FindingsFilters): boolean =>
  filters.bucket !== "all" ||
  filters.search.trim() !== "" ||
  filters.repo !== "all" ||
  filters.severity !== "all" ||
  filters.source !== "all";

/**
 * The key two findings have to share to be called duplicates of each other.
 *
 * Title, repo *and* status — not title alone. Two records with the same title
 * where one is REJECTED and the other is NEW are not the same item to an admin:
 * one is a decision already made and the other is a decision outstanding, and
 * flagging them as a pair would invite someone to treat the outstanding one as
 * already handled.
 */
/**
 * Joins the parts of a duplicate key.
 *
 * A NUL, because it is the one character a free-text bug title cannot contain —
 * so "a" + "bc" can never collide with "ab" + "c". Written as an escape rather
 * than as the byte itself: a raw NUL in the source makes git classify this
 * `.ts` file as binary, which costs the diff, the review and `grep -I`.
 */
const DUPLICATE_KEY_SEPARATOR = "\u0000";

export const duplicateKey = (finding: BugFinding): string =>
  [finding.title.trim().toLowerCase(), finding.repo ?? "", finding.status].join(
    DUPLICATE_KEY_SEPARATOR,
  );

export interface FindingRow {
  finding: BugFinding;
  /**
   * How many findings in the window share this row's duplicate key, when that
   * is more than one. Undefined for the ordinary case.
   *
   * Duplicates are *flagged and both kept*, never collapsed into one row. The
   * same bug reported twice is two records, each independently approvable and
   * rejectable, and merging them behind a "×2" badge would leave the second one
   * live after someone had dealt with what looked like the only one. The badge
   * exists so that seeing the same title twice reads as a known fact about the
   * data rather than as a rendering bug — which is how it read in production.
   */
  duplicateCount?: number;
}

export interface FindingsView {
  /** The rows for the current page. */
  rows: FindingRow[];
  /** Findings matching the filters, across all pages. */
  matched: number;
  /** Findings in the loaded window, before filtering. */
  loaded: number;
  /** Total findings the backend reports, which may exceed the window. */
  total: number;
  /** True when the backend has more findings than the window holds, so filters are known to be partial. */
  windowed: boolean;
  pageCount: number;
  /** Clamped into range, so a filter change that shrinks the list can never leave an empty page showing. */
  page: number;
}

export interface BuildFindingsViewInput {
  findings: BugFinding[];
  /** `count` from the list response — total in the table, not in the window. */
  total: number;
  filters: FindingsFilters;
  sortKey: SortKey;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

const matchesSearch = (finding: BugFinding, needle: string): boolean =>
  finding.title.toLowerCase().includes(needle) ||
  (finding.file?.toLowerCase().includes(needle) ?? false) ||
  (finding.repo?.toLowerCase().includes(needle) ?? false);

const applyFilters = (findings: BugFinding[], filters: FindingsFilters): BugFinding[] => {
  const needle = filters.search.trim().toLowerCase();

  return findings.filter(finding => {
    if (filters.bucket !== "all" && bucketOfStatus(finding.status) !== filters.bucket) return false;
    if (filters.repo !== "all" && (finding.repo ?? "") !== filters.repo) return false;
    if (filters.severity !== "all" && finding.severity !== filters.severity) return false;
    if (filters.source !== "all" && finding.source !== filters.source) return false;
    if (needle !== "" && !matchesSearch(finding, needle)) return false;
    return true;
  });
};

/**
 * When anything last happened to a bug, falling back to its discovery date.
 *
 * The fallback is for an unparseable value rather than a missing one: the field
 * is required on the wire, but a NaN here would sort its row to an arbitrary
 * place in the table instead of to one end, which is the kind of defect nobody
 * reads as a date-parsing problem.
 */
export const updatedAt = (finding: BugFinding): number => {
  const at = new Date(finding.updatedAt).getTime();
  return Number.isNaN(at) ? new Date(finding.createdAt).getTime() : at;
};

/**
 * True when a bug has been touched since it was discovered — a status move, a
 * sweep re-triaging it, an admin rewriting its description.
 *
 * The minute of slack is not cosmetic: a finding is INSERTed and then PATCHed
 * to `pending_approval` seconds later within one sweep, so a strict `>` would
 * call every row "updated" and the column would repeat Age on the whole table.
 */
export const wasTouchedSinceDiscovery = (finding: BugFinding): boolean =>
  updatedAt(finding) - new Date(finding.createdAt).getTime() > 60_000;

const compare = (a: BugFinding, b: BugFinding, sortKey: SortKey): number => {
  switch (sortKey) {
    case "severity":
      return severityRank(a.severity) - severityRank(b.severity);
    case "title":
      return a.title.localeCompare(b.title);
    case "discovered":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "updated":
      return updatedAt(a) - updatedAt(b);
  }
};

/**
 * Sorts a copy, never the argument.
 *
 * The array handed in is `data.items` straight off an RTK Query cache entry,
 * which three other surfaces on this page read from the same render. `.sort()`
 * mutates in place, so sorting it directly would reorder the card's and the
 * queue's view of the world as a side effect of clicking a column header here.
 */
const sortFindings = (
  findings: BugFinding[],
  sortKey: SortKey,
  direction: SortDirection,
): BugFinding[] => {
  const sign = direction === "asc" ? 1 : -1;
  return [...findings].sort((a, b) => {
    const primary = compare(a, b, sortKey) * sign;
    if (primary !== 0) return primary;
    // Ties broken by recency, then by id. Without the id, two findings created
    // in the same second swap places between polls and the table flickers.
    const byRecency = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return byRecency !== 0 ? byRecency : a.id.localeCompare(b.id);
  });
};

/** Duplicate counts are computed over the whole loaded window, not the page — a pair split across a page boundary is still a pair. */
const countDuplicates = (findings: BugFinding[]): Map<string, number> => {
  const counts = new Map<string, number>();
  findings.forEach(finding => {
    const key = duplicateKey(finding);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
};

export const buildFindingsView = ({
  findings,
  total,
  filters,
  sortKey,
  sortDirection,
  page,
  pageSize,
}: BuildFindingsViewInput): FindingsView => {
  const duplicates = countDuplicates(findings);
  const matched = sortFindings(applyFilters(findings, filters), sortKey, sortDirection);

  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * pageSize;

  const rows: FindingRow[] = matched.slice(start, start + pageSize).map(finding => {
    const count = duplicates.get(duplicateKey(finding)) ?? 1;
    return count > 1 ? { finding, duplicateCount: count } : { finding };
  });

  return {
    rows,
    matched: matched.length,
    loaded: findings.length,
    total,
    windowed: total > findings.length,
    pageCount,
    page: safePage,
  };
};

/** Repos present in the window, for the repo facet — so the facet never offers a value that matches nothing. */
export const reposInWindow = (findings: BugFinding[]): string[] =>
  Array.from(new Set(findings.map(finding => finding.repo).filter((r): r is string => !!r))).sort();

/**
 * Whether Bug Hunter is moving this bug right now — the spinner rides along
 * wherever this is true.
 *
 * Asked of the bucket rather than of a fourth copy of the same status list.
 * The table used to carry its own `MID_FLIGHT_STATUSES` array identical to
 * `agentPersona`'s `IN_FLIGHT_STATUSES` and to the drawer's, which is three
 * places to remember when an eighteenth status arrives.
 */
export const isMidFlight = (status: BugFindingStatus): boolean =>
  bucketOfStatus(status) === "in_flight";
