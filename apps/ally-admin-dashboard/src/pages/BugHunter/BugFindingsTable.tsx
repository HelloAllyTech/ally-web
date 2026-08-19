import { FC, useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  Search,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { useGetBugFindingsQuery } from "@api";
import { EmptyState } from "@components";
// Reached past the barrel on purpose. Importing the barrel pulls @constants,
// which reads `cellTypes` back off it at module-eval time — a test that needs
// the real boundary while stubbing the barrel deadlocks on that cycle. Same
// direct-path treatment as @components/action-confirmation-popup elsewhere.
import { ErrorBoundary } from "@components/error-boundary";
import { en } from "@constants";
import { BugFinding, BugFindingSeverity, BugFindingSource } from "@types";
import { formatDate } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingDrawer } from "./BugFindingDrawer";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import {
  buildFindingsView,
  EMPTY_FILTERS,
  FindingsFilters,
  hasActiveFilters,
  isMidFlight,
  reposInWindow,
  SortDirection,
  SortKey,
} from "./findingsView";
import { countByBucket } from "./lifecycleBucket";
import { BucketFilter, LifecycleBucketChips } from "./LifecycleBucketChips";

const PAGE_SIZE = 20;

/** Severity dot colours, so severity is scannable down the column without reading three words. */
const SEVERITY_DOTS: Record<BugFindingSeverity, string> = {
  [BugFindingSeverity.HIGH]: "bg-destructive-500",
  [BugFindingSeverity.MEDIUM]: "bg-amber-500",
  [BugFindingSeverity.LOW]: "bg-neutral-400",
};

const SortableHeader: FC<{
  sortKey: SortKey;
  label: string;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}> = ({ sortKey, label, activeKey, direction, onSort, className }) => {
  const isActive = activeKey === sortKey;
  return (
    <TableHeader
      className={`py-3 pr-4 font-medium ${className ?? ""}`}
      // Real `aria-sort` on the header cell rather than a visual caret only:
      // the old table had no sort at all, and adding one that a screen reader
      // cannot read the state of would be adding half of it.
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 cursor-pointer hover:text-typography-900"
      >
        {label}
        <span aria-hidden="true" className="text-[10px] text-typography-500">
          {isActive ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </TableHeader>
  );
};

/** Six pulsing rows, so a slow response looks like a table arriving rather than a broken page. */
const TableSkeleton: FC = () => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-11 rounded bg-neutral-100 animate-pulse motion-reduce:animate-none"
      />
    ))}
  </div>
);

interface BugFindingsTableProps {
  /**
   * A bug to open the drawer on, chosen somewhere else on the page — clicking
   * a notification in the inbox, or a card in the needs-you queue. The drawer
   * lives here rather than being duplicated up there, so every entry point
   * lands on the same one.
   */
  focusFindingId?: string | null;
  onFocusHandled?: () => void;
  /** The bucket chip row is shared page state, so the workload numbers and the table can never disagree. */
  bucket: BucketFilter;
  onBucketChange: (bucket: BucketFilter) => void;
}

/**
 * Every bug Bug Hunter knows about, from any source — pipeline findings and
 * human reports alike — as a surface built for triage rather than for reading.
 *
 * ## What this rebuild changed
 *
 * The old table was a seven-column, date-sorted list of the hundred newest
 * findings with one control on it: a `<Select>` of all seventeen statuses in
 * enum-declaration order. Everything else it lacked, it lacked completely.
 *
 * - **Buckets, not seventeen statuses.** The chip row above states the
 *   breakdown and sets the filter; see `lifecycleBucket.ts` for why the groups
 *   are shaped by whose move it is.
 * - **Search, and facets for repo, severity and source.** A hundred rows with
 *   no way to ask "what's outstanding in ally-web" is a hundred rows you read.
 * - **Sortable columns**, with real `aria-sort`.
 * - **Rows reachable by keyboard.** They were `<tr onClick>` with no
 *   `tabIndex`, no role and no key handler, which meant a keyboard user could
 *   not open a single bug on this page. This was the one outright
 *   accessibility defect in the feature, not merely a rough edge.
 * - **A count and pagination**, where `count` came back on every response and
 *   was rendered nowhere.
 * - **A skeleton** in place of a literal `…` in a `<p>`.
 * - **Full titles on hover**, since the column truncates at 360px and the title
 *   is the whole basis for deciding what a row is.
 * - **Duplicates flagged.** Production showed the same reported bug twice with
 *   nothing to say why; `findingsView.ts` explains why they are flagged and
 *   both kept rather than collapsed.
 *
 * The filtering itself is client-side over the loaded window, for the reasons
 * in `findingsView.ts` — and the table says so in words whenever the window is
 * smaller than the table.
 */
export const BugFindingsTable: FC<BugFindingsTableProps> = ({
  focusFindingId,
  onFocusHandled,
  bucket,
  onBucketChange,
}) => {
  const [ownSelectedId, setOwnSelectedId] = useState<string | null>(null);
  const selectedId = focusFindingId ?? ownSelectedId;
  const setSelectedId = (id: string | null) => {
    setOwnSelectedId(id);
    if (!id) onFocusHandled?.();
  };

  const [search, setSearch] = useState("");
  const [repo, setRepo] = useState<string | "all">("all");
  const [severity, setSeverity] = useState<BugFindingSeverity | "all">("all");
  const [source, setSource] = useState<BugFindingSource | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("discovered");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);

  // Same args as the profile card's and the queue's, so all three read one RTK
  // Query cache entry rather than opening a request each. Every filter below is
  // applied to that shared window client-side — see findingsView.ts.
  const { data, isLoading, isError, refetch } = useGetBugFindingsQuery(
    { status: "all", limit: 100 },
    { pollingInterval: 15_000 },
  );

  // Memoised because `data?.items ?? []` is a fresh array identity every render:
  // without it the view below (filter, sort, duplicate scan, page slice) would
  // recompute on any unrelated re-render, and no dependency array could say so
  // honestly.
  const findings = useMemo<BugFinding[]>(() => data?.items ?? [], [data]);

  const filters = useMemo<FindingsFilters>(
    () => ({ bucket, search, repo, severity, source }),
    [bucket, search, repo, severity, source],
  );
  const filtersActive = hasActiveFilters(filters);

  // A filter change can shrink the list below the current offset, which would
  // otherwise leave an empty page rendered with no rows and no explanation.
  // `buildFindingsView` clamps as a backstop; this resets the intent.
  useEffect(() => {
    setPage(0);
  }, [filters, sortKey, sortDirection]);

  const view = useMemo(
    () =>
      buildFindingsView({
        findings,
        total: data?.count ?? findings.length,
        filters,
        sortKey,
        sortDirection,
        page,
        pageSize: PAGE_SIZE,
      }),
    [findings, data?.count, filters, sortKey, sortDirection, page],
  );

  const counts = useMemo(() => countByBucket(findings), [findings]);
  const repos = useMemo(() => reposInWindow(findings), [findings]);

  // Which rows just showed up, so they can get a one-time fade-in — never on
  // the first successful load, only on a poll that grew the list. `null`
  // means "haven't seen a real response yet"; once set, it's the id set from
  // the previous render to diff the new one against.
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  // from `data` and nothing else, so a new response is the only thing that can
  // change it; adding it would re-run this on identity churn instead.
  useEffect(() => {
    if (!data) return undefined;
    const currentIds = new Set(findings.map(finding => finding.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return undefined;
    }
    const fresh = new Set<string>();
    currentIds.forEach(id => {
      if (!seenIdsRef.current!.has(id)) fresh.add(id);
    });
    seenIdsRef.current = currentIds;
    if (fresh.size === 0) return undefined;
    setFreshIds(fresh);
    const timer = setTimeout(() => setFreshIds(new Set()), 250);
    return () => clearTimeout(timer);
  }, [data]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(direction => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    // A new column starts on the direction that column is usually read in:
    // newest-first for a date, worst-first for severity, A–Z for a title.
    setSortDirection(key === "title" ? "asc" : "desc");
  };

  const clearFilters = () => {
    setSearch("");
    setRepo("all");
    setSeverity("all");
    setSource("all");
    onBucketChange(EMPTY_FILTERS.bucket);
  };

  const openRow = (id: string) => setSelectedId(id);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-typography-900">{en.bugHunter.findingsTitle}</h2>
        <p className="text-xs text-typography-600">{en.bugHunter.findingsSubtitle}</p>
      </div>

      <div className="mb-3">
        <LifecycleBucketChips
          counts={counts}
          total={findings.length}
          value={bucket}
          onChange={onBucketChange}
          disabled={isLoading}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] max-w-md">
          <Search
            id="bug-findings-search"
            size="sm"
            labelText={en.bugHunter.searchLabel}
            placeholder={en.bugHunter.searchPlaceholder}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>

        <div className="w-40">
          <Select
            id="bug-findings-repo"
            size="sm"
            labelText={en.bugHunter.filterRepoLabel}
            hideLabel
            value={repo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRepo(e.target.value)}
          >
            <SelectItem value="all" text={en.bugHunter.filterRepoAll} />
            {repos.map(name => (
              <SelectItem key={name} value={name} text={name} />
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select
            id="bug-findings-severity"
            size="sm"
            labelText={en.bugHunter.filterSeverityLabel}
            hideLabel
            value={severity}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSeverity(e.target.value as BugFindingSeverity | "all")
            }
          >
            <SelectItem value="all" text={en.bugHunter.filterSeverityAll} />
            {Object.values(BugFindingSeverity).map(value => (
              <SelectItem key={value} value={value} text={BUG_FINDING_SEVERITY_LABELS[value]} />
            ))}
          </Select>
        </div>

        <div className="w-44">
          <Select
            id="bug-findings-source"
            size="sm"
            labelText={en.bugHunter.filterSourceLabel}
            hideLabel
            value={source}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSource(e.target.value as BugFindingSource | "all")
            }
          >
            <SelectItem value="all" text={en.bugHunter.filterSourceAll} />
            {Object.values(BugFindingSource).map(value => (
              <SelectItem key={value} value={value} text={BUG_FINDING_SOURCE_LABELS[value]} />
            ))}
          </Select>
        </div>

        {filtersActive && (
          <Button size="sm" kind="ghost" onClick={clearFilters}>
            {en.bugHunter.clearFilters}
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className="text-destructive-600 text-sm">{en.bugHunter.findingsLoadFailed}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary-600 underline"
          >
            {en.bugHunter.retry}
          </button>
        </div>
      ) : findings.length === 0 ? (
        <EmptyState
          title={en.bugHunter.findingsEmptyTitle}
          subtitle={en.bugHunter.findingsEmptySubtitle}
          hideActionButton
        />
      ) : view.matched === 0 ? (
        // A filtered-to-nothing table is a different situation from an empty
        // one, and telling someone "Once I'm on duty, anything I find shows up
        // here" when they have simply typed a typo into the search box is the
        // page blaming its own state for the reader's.
        <div className="border border-border-light rounded-lg py-10 text-center">
          <p className="text-sm font-medium text-typography-900">{en.bugHunter.noMatchTitle}</p>
          <p className="text-xs text-typography-600 mt-1">{en.bugHunter.noMatchSubtitle}</p>
          <div className="mt-3">
            <Button size="sm" kind="tertiary" onClick={clearFilters}>
              {en.bugHunter.clearFilters}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <SortableHeader
                  sortKey="title"
                  label={en.bugHunter.findingColumnTitle}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHeader className="py-3 pr-4 font-medium">
                  {en.bugHunter.findingColumnRepo}
                </TableHeader>
                <SortableHeader
                  sortKey="severity"
                  label={en.bugHunter.findingColumnSeverity}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHeader className="py-3 pr-4 font-medium">
                  {en.bugHunter.findingColumnStatus}
                </TableHeader>
                <SortableHeader
                  sortKey="discovered"
                  label={en.bugHunter.findingColumnDiscovered}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHeader className="py-3 pr-4 font-medium">
                  {en.bugHunter.findingColumnPr}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {view.rows.map(({ finding, duplicateCount }) => (
                <TableRow
                  key={finding.id}
                  className={`border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-neutral-50 ${
                    freshIds.has(finding.id) ? "animate-fadeIn motion-reduce:animate-none" : ""
                  }`}
                  // Mouse convenience only. The row deliberately carries no
                  // role or tabIndex — see the button in the first cell.
                  onClick={() => openRow(finding.id)}
                >
                  <TableCell className="py-3 pr-4 max-w-[420px]">
                    <div className="flex items-center gap-2">
                      {/* The row's real control, and the reason it is here
                          rather than on the <tr>.
              
                          Rows used to be `<tr onClick>` with no tabIndex, no
                          role and no key handler, so a keyboard user could not
                          open a single bug — the one outright accessibility
                          defect in the feature. The first fix put
                          role="button", tabIndex and aria-label on the TableRow,
                          and live testing showed Carbon destructures
                          `aria-label` out of TableRow's props (it only forwards
                          it for expandable rows), leaving twenty *unnamed*
                          buttons — worse than before. `role="button"` on a <tr>
                          also destroys the table semantics for a screen reader.
              
                          So the row stays a row, and one cell holds a named
                          control. The aria-label states the affordance and
                          contains the visible text, satisfying WCAG 2.5.3.
              
                          `title` for the hover tooltip, because the column
                          truncates at 420px and the title is the whole basis for
                          knowing what the row is; `min-w-0` so it can shrink
                          inside the flex row rather than overflowing it. */}
                      <button
                        type="button"
                        aria-label={en.bugHunter.rowOpenLabel.replace("{title}", finding.title)}
                        title={finding.title}
                        onClick={event => {
                          event.stopPropagation();
                          openRow(finding.id);
                        }}
                        className="min-w-0 truncate text-left rounded cursor-pointer hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {finding.title}
                      </button>
                      {duplicateCount != null && (
                        <Tooltip
                          label={en.bugHunter.duplicateTooltip.replace(
                            "{count}",
                            String(duplicateCount),
                          )}
                          align="top"
                        >
                          <span className="shrink-0 inline-flex items-center rounded border border-border-light bg-neutral-100 px-1.5 text-[10px] font-semibold text-typography-600 cursor-help">
                            {en.bugHunter.duplicateTag.replace("{count}", String(duplicateCount))}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {/* Source moved out of its own column and under the title.
                        It reads as provenance rather than as a field, it freed a
                        column, and the facet above is how you scan by it. */}
                    <div className="text-xs text-typography-600 truncate">
                      {BUG_FINDING_SOURCE_LABELS[finding.source]}
                      {finding.file ? ` · ${finding.file}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {finding.repo ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {finding.severity ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${SEVERITY_DOTS[finding.severity]}`}
                        />
                        {BUG_FINDING_SEVERITY_LABELS[finding.severity]}
                      </span>
                    ) : (
                      en.bugHunter.findingSeverityNone
                    )}
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1.5">
                      <BugFindingStatusBadge status={finding.status} />
                      {isMidFlight(finding.status) && <BrailleSpinner className="text-amber-600" />}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(finding.createdAt)}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {finding.prUrl ? (
                      <a
                        href={finding.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {en.bugHunter.viewPr}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-typography-600" aria-live="polite">
                {view.matched === 1
                  ? en.bugHunter.resultSummaryOne
                  : en.bugHunter.resultSummary
                      .replace("{shown}", String(view.rows.length))
                      .replace("{matched}", String(view.matched))}
              </p>
              {/* Said plainly rather than as a footnote apologising for a
                  denominator: the filters above searched the newest hundred,
                  and a reader who assumes they searched all history would draw
                  a wrong conclusion from an empty result. */}
              {view.windowed && (
                <p className="text-xs text-typography-500 mt-0.5">
                  {en.bugHunter.windowNotice
                    .replace("{loaded}", String(view.loaded))
                    .replace("{total}", String(view.total))}
                </p>
              )}
            </div>

            {view.pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  kind="ghost"
                  disabled={view.page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                  {en.bugHunter.pagePrev}
                </Button>
                <span className="text-xs text-typography-600 tabular-nums">
                  {en.bugHunter.pageStatus
                    .replace("{page}", String(view.page + 1))
                    .replace("{pages}", String(view.pageCount))}
                </span>
                <Button
                  size="sm"
                  kind="ghost"
                  disabled={view.page >= view.pageCount - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  {en.bugHunter.pageNext}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Scoped barrier, keyed to the open bug. The page-level one in
          PrivateLayout would already stop a bad drawer blanking the console,
          but it would take the bugs table down with it — and the table is how
          you'd reach a different bug. This keeps the failure inside the drawer,
          and a different row starts clean rather than inheriting the error. */}
      {selectedId && (
        <ErrorBoundary variant="panel" resetKey={selectedId} onDismiss={() => setSelectedId(null)}>
          <BugFindingDrawer id={selectedId} onClose={() => setSelectedId(null)} />
        </ErrorBoundary>
      )}
    </div>
  );
};
