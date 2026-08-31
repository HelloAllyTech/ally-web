import {
  BugFinding,
  BugFindingSeverity,
  BugFindingSource,
  BugFindingStage,
  BugFindingStatus,
} from "@types";

import { bucketOfStatus, LIFECYCLE_BUCKETS } from "./lifecycleBucket";
import { ageInDays, STALENESS_DAYS } from "./triage";

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
 * ## Every facet is multi-select
 *
 * They were single-valued, which quietly made whole questions unaskable rather
 * than merely awkward: "everything red across ally-be *and* ally-web" is one
 * triage pass, and a one-repo-at-a-time facet turns it into two passes whose
 * results you have to hold in your head. Arrays cost nothing here — an empty
 * array means "don't filter on this", so the absent case stays as cheap as the
 * old `"all"` sentinel was — and they make the URL say the true thing
 * (`?repo=ally-be,ally-web`).
 *
 * Kept out of the component for the ordinary reason: this is the part with
 * rules in it, and rules are worth testing without rendering a table.
 */

/**
 * Every column the table can show is sortable, plus source, which is a facet
 * rather than a column and still worth ordering by when you want the
 * human-filed reports gathered together.
 */
export type SortKey =
  | "discovered"
  | "updated"
  | "severity"
  | "title"
  | "status"
  | "repo"
  | "source"
  | "stage";

export const SORT_KEYS: SortKey[] = [
  "discovered",
  "updated",
  "severity",
  "title",
  "status",
  "repo",
  "source",
  "stage",
];

export type SortDirection = "asc" | "desc";

/**
 * The direction a column is usually read in, used when the reader switches to
 * a new sort key rather than flipping the current one.
 *
 * Dates and severity descend (newest, worst first); names ascend (A–Z). Status
 * ascends because its rank below is ordered "most in need of a human first",
 * so ascending is the useful end.
 */
export const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
  discovered: "desc",
  updated: "desc",
  severity: "desc",
  title: "asc",
  status: "asc",
  repo: "asc",
  source: "asc",
  stage: "asc",
};

/** High first when descending — the order an admin means by "sort by severity". */
const SEVERITY_RANK: Record<BugFindingSeverity, number> = {
  [BugFindingSeverity.HIGH]: 3,
  [BugFindingSeverity.MEDIUM]: 2,
  [BugFindingSeverity.LOW]: 1,
};

/** Unclassified severity ranks below "low" rather than above "high". */
const severityRank = (severity: BugFindingSeverity | null): number =>
  severity ? SEVERITY_RANK[severity] : 0;

/**
 * Where a status sorts, when the reader asks for the Status column.
 *
 * Bucket order first, status order within the bucket — never the enum's own
 * declaration order and never alphabetical. Sorting seventeen statuses
 * alphabetically puts "Approved" above "Needs input" and reads as noise; this
 * ranking puts the rows whose next move belongs to a human at one end, which
 * is the only reason anyone sorts by status on a triage table.
 *
 * Derived from `LIFECYCLE_BUCKETS` rather than written out, so the two orders
 * cannot drift and an eighteenth status is classified in exactly one place
 * (`bucketOfStatus`).
 */
const STATUS_RANK: Record<BugFindingStatus, number> = Object.values(BugFindingStatus).reduce(
  (ranks, status) => {
    const bucketIndex = LIFECYCLE_BUCKETS.indexOf(bucketOfStatus(status));
    // ×100 leaves room for the within-bucket tiebreak below without any
    // bucket's range ever reaching into the next one's.
    ranks[status] = bucketIndex * 100 + Object.values(BugFindingStatus).indexOf(status);
    return ranks;
  },
  {} as Record<BugFindingStatus, number>,
);

/** The roadmap ladder in ladder order, so sorting by stage walks it rather than the alphabet. */
const STAGE_RANK: Record<BugFindingStage, number> = {
  [BugFindingStage.NEW]: 0,
  [BugFindingStage.PRIORITISED]: 1,
  [BugFindingStage.UNDER_DEVELOPMENT]: 2,
  [BugFindingStage.RELEASED]: 3,
  [BugFindingStage.ARCHIVED]: 4,
};

/**
 * How old a bug is, as a filter.
 *
 * The two "over" bands are deliberately `STALENESS_DAYS` and not round numbers
 * of their own. The Age column already tints amber over a week and red over a
 * month; a filter reading "Over a week" that used a different boundary would
 * return rows the column had not tinted, and the tint is the thing that makes
 * someone reach for the filter in the first place.
 */
export type AgeFilter = "all" | "day" | "week" | "stale" | "ancient";

export const AGE_FILTERS: AgeFilter[] = ["all", "day", "week", "stale", "ancient"];

const matchesAge = (finding: BugFinding, age: AgeFilter, now: number): boolean => {
  if (age === "all") return true;
  const days = ageInDays(finding, now);
  if (days == null) return false;
  switch (age) {
    case "day":
      return days < 1;
    case "week":
      return days < STALENESS_DAYS.stale;
    case "stale":
      return days >= STALENESS_DAYS.stale;
    case "ancient":
      return days >= STALENESS_DAYS.ancient;
  }
};

export interface FindingsFilters {
  bucket: BucketFilter;
  /** Free text over title, description, file, repo and the reporter's name. Trimmed and case-folded by `applyFilters`. */
  search: string;
  /** Empty means "every repo" — same for every array below. */
  repos: string[];
  severities: BugFindingSeverity[];
  sources: BugFindingSource[];
  statuses: BugFindingStatus[];
  stages: BugFindingStage[];
  age: AgeFilter;
  /**
   * Narrow to bugs that share a duplicate key with at least one other bug in
   * the window.
   *
   * The table has flagged duplicates with a "×2" badge for a while and offered
   * no way to gather them, which is backwards: the badge's whole purpose is to
   * prompt "close one of these", and acting on that meant paging through
   * looking for badges. It is a filter over the window rather than a facet
   * because duplicate-ness is a property of the *set*, not of a row.
   */
  duplicatesOnly: boolean;
}

export const EMPTY_FILTERS: FindingsFilters = {
  bucket: "all",
  search: "",
  repos: [],
  severities: [],
  sources: [],
  statuses: [],
  stages: [],
  age: "all",
  duplicatesOnly: false,
};

export const hasActiveFilters = (filters: FindingsFilters): boolean =>
  filters.bucket !== "all" ||
  filters.search.trim() !== "" ||
  filters.repos.length > 0 ||
  filters.severities.length > 0 ||
  filters.sources.length > 0 ||
  filters.statuses.length > 0 ||
  filters.stages.length > 0 ||
  filters.age !== "all" ||
  filters.duplicatesOnly;

/** How many facet values are set, for the "Filters" button's count badge. Bucket and search are excluded — they have their own always-visible controls. */
export const activeFacetCount = (filters: FindingsFilters): number =>
  filters.repos.length +
  filters.severities.length +
  filters.sources.length +
  filters.statuses.length +
  filters.stages.length +
  (filters.age === "all" ? 0 : 1) +
  (filters.duplicatesOnly ? 1 : 0);

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
  /** Every matching finding's id, in sorted order — what "select all N" ticks. */
  matchedIds: string[];
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
  /** Injectable clock, so the age facet is testable without freezing global time. */
  now?: number;
}

const matchesSearch = (finding: BugFinding, needle: string): boolean =>
  finding.title.toLowerCase().includes(needle) ||
  // Description is searched but never shown in the table. That asymmetry is
  // deliberate: a triager who remembers a phrase from a bug's body should find
  // the row, and rendering the body would cost the column that makes the table
  // scannable. The drawer is where the match is read.
  finding.description.toLowerCase().includes(needle) ||
  (finding.file?.toLowerCase().includes(needle) ?? false) ||
  (finding.repo?.toLowerCase().includes(needle) ?? false) ||
  // "Everything Priya filed" is a question this table shows the answer to on
  // every human-reported row and had no way to ask.
  (finding.report?.reportedByName?.toLowerCase().includes(needle) ?? false);

/**
 * True when a value passes a multi-select facet.
 *
 * An empty array is "no opinion", never "match nothing" — which is what makes
 * an unset facet free rather than something every caller has to special-case.
 */
const passesFacet = <T>(selected: T[], value: T | null): boolean =>
  selected.length === 0 || (value !== null && selected.includes(value));

const applyFilters = (
  findings: BugFinding[],
  filters: FindingsFilters,
  duplicates: Map<string, number>,
  now: number,
): BugFinding[] => {
  const needle = filters.search.trim().toLowerCase();

  return findings.filter(finding => {
    if (filters.bucket !== "all" && bucketOfStatus(finding.status) !== filters.bucket) return false;
    if (!passesFacet(filters.repos, finding.repo)) return false;
    if (!passesFacet(filters.severities, finding.severity)) return false;
    if (!passesFacet(filters.sources, finding.source)) return false;
    if (!passesFacet(filters.statuses, finding.status)) return false;
    if (!passesFacet(filters.stages, finding.stage)) return false;
    if (!matchesAge(finding, filters.age, now)) return false;
    if (filters.duplicatesOnly && (duplicates.get(duplicateKey(finding)) ?? 1) < 2) return false;
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

/** Nulls sort to the end in both directions, rather than clumping at whichever end `localeCompare("")` lands them. */
const compareNullableText = (a: string | null, b: string | null, sign: number): number => {
  if (a === b) return 0;
  if (!a) return 1 * sign;
  if (!b) return -1 * sign;
  return a.localeCompare(b);
};

const compare = (a: BugFinding, b: BugFinding, sortKey: SortKey, sign: number): number => {
  switch (sortKey) {
    case "severity":
      return severityRank(a.severity) - severityRank(b.severity);
    case "title":
      return a.title.localeCompare(b.title);
    case "discovered":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "updated":
      return updatedAt(a) - updatedAt(b);
    case "status":
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    case "stage":
      return STAGE_RANK[a.stage] - STAGE_RANK[b.stage];
    case "source":
      return a.source.localeCompare(b.source);
    case "repo":
      // Multiplied back out by the caller, so the sign is passed in to keep
      // "no repo" at the bottom whichever way the column is pointing.
      return compareNullableText(a.repo, b.repo, sign);
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
    const primary = compare(a, b, sortKey, sign) * sign;
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
  now = Date.now(),
}: BuildFindingsViewInput): FindingsView => {
  const duplicates = countDuplicates(findings);
  const matched = sortFindings(
    applyFilters(findings, filters, duplicates, now),
    sortKey,
    sortDirection,
  );

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
    matchedIds: matched.map(finding => finding.id),
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
 * Statuses present in the window, in the same rank order the Status sort uses.
 *
 * Offered instead of all seventeen for the reason `lifecycleBucket`'s docblock
 * gives about the old flat `<Select>`: a list of every status the enum can hold
 * is a list of mostly-empty options, and the reader has to try one to find out.
 * Only what is actually in front of them.
 */
export const statusesInWindow = (findings: BugFinding[]): BugFindingStatus[] =>
  Array.from(new Set(findings.map(finding => finding.status))).sort(
    (a, b) => STATUS_RANK[a] - STATUS_RANK[b],
  );

/** Stages present in the window, in ladder order. Same argument as `statusesInWindow`. */
export const stagesInWindow = (findings: BugFinding[]): BugFindingStage[] =>
  Array.from(new Set(findings.map(finding => finding.stage))).sort(
    (a, b) => STAGE_RANK[a] - STAGE_RANK[b],
  );

/** Sources present in the window, alphabetically by enum value. Same argument as `statusesInWindow`. */
export const sourcesInWindow = (findings: BugFinding[]): BugFindingSource[] =>
  Array.from(new Set(findings.map(finding => finding.source))).sort();

/** Severities present in the window, worst first. Same argument as `statusesInWindow`. */
export const severitiesInWindow = (findings: BugFinding[]): BugFindingSeverity[] =>
  Array.from(
    new Set(findings.map(finding => finding.severity).filter((s): s is BugFindingSeverity => !!s)),
  ).sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a]);

/** How many bugs in the window share a duplicate key with another — the count on the "duplicates only" toggle. */
export const duplicateCountInWindow = (findings: BugFinding[]): number => {
  const counts = countDuplicates(findings);
  return findings.filter(finding => (counts.get(duplicateKey(finding)) ?? 1) > 1).length;
};

export interface FacetCounts {
  repos: Record<string, number>;
  severities: Record<string, number>;
  sources: Record<string, number>;
  statuses: Record<string, number>;
  stages: Record<string, number>;
  ages: Record<AgeFilter, number>;
  duplicates: number;
}

/**
 * How many bugs in the window carry each facet value — the numbers beside the
 * checkboxes in the filter panel.
 *
 * Counted over the **whole loaded window**, not over the rows the other filters
 * currently leave standing. That is the same denominator the bucket chips use,
 * and picking one denominator for every number on the toolbar is worth more
 * than the extra precision of live-narrowing counts: a panel where ticking
 * "ally-be" silently rewrites the numbers next to every other facet is a panel
 * whose numbers cannot be compared with each other or with the chips.
 */
export const buildFacetCounts = (findings: BugFinding[], now: number = Date.now()): FacetCounts => {
  const counts: FacetCounts = {
    repos: {},
    severities: {},
    sources: {},
    statuses: {},
    stages: {},
    ages: { all: findings.length, day: 0, week: 0, stale: 0, ancient: 0 },
    duplicates: duplicateCountInWindow(findings),
  };

  const bump = (map: Record<string, number>, key: string | null | undefined) => {
    if (key == null) return;
    map[key] = (map[key] ?? 0) + 1;
  };

  findings.forEach(finding => {
    bump(counts.repos, finding.repo);
    bump(counts.severities, finding.severity);
    bump(counts.sources, finding.source);
    bump(counts.statuses, finding.status);
    bump(counts.stages, finding.stage);
    // The bands overlap on purpose — "under a week" contains "under a day", and
    // "over a month" is a subset of "over a week" — because each is counted the
    // same way the filter matches, and a reader picking one wants the number
    // that filter will produce, not a share of a partition.
    (["day", "week", "stale", "ancient"] as const).forEach(band => {
      if (matchesAge(finding, band, now)) counts.ages[band] += 1;
    });
  });

  return counts;
};

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
