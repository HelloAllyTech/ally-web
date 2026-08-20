import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

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
import {
  useApproveBugFindingMutation,
  useGetBugFindingsQuery,
  useRejectBugFindingMutation,
  useStartBugFixSessionMutation,
} from "@api";
import { EmptyState } from "@components";
// Reached past the barrel on purpose. Importing the barrel pulls @constants,
// which reads `cellTypes` back off it at module-eval time — a test that needs
// the real boundary while stubbing the barrel deadlocks on that cycle. Same
// direct-path treatment as @components/action-confirmation-popup elsewhere.
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { ErrorBoundary } from "@components/error-boundary";
import { en } from "@constants";
import { BugFinding, BugFindingSeverity, BugFindingSource } from "@types";
import { formatDate } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingDrawer } from "./BugFindingDrawer";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { useBugHunterUrlState } from "./bugHunterUrlState";
import { BulkTriageBar } from "./BulkTriageBar";
import {
  buildFindingsView,
  FindingsFilters,
  hasActiveFilters,
  isMidFlight,
  reposInWindow,
  SortDirection,
  SortKey,
} from "./findingsView";
import { countByBucket } from "./lifecycleBucket";
import { LifecycleBucketChips } from "./LifecycleBucketChips";
import {
  ageInDays,
  canAct,
  formatAge,
  showsStaleness,
  stalenessTier,
  TriageAction,
} from "./triage";

const PAGE_SIZE = 20;

/** Severity dot colours, so severity is scannable down the column without reading three words. */
const SEVERITY_DOTS: Record<BugFindingSeverity, string> = {
  [BugFindingSeverity.HIGH]: "bg-destructive-500",
  [BugFindingSeverity.MEDIUM]: "bg-amber-500",
  [BugFindingSeverity.LOW]: "bg-neutral-400",
};

/**
 * Sticks the header to the top of the page's scroll container.
 *
 * On a `<th>` rather than on the `<tr>`, because `position: sticky` on a table
 * row is ignored by Safari and by older Chrome — the cells are what stick. The
 * opaque background is not optional: without it, rows scroll visibly *through*
 * the header text.
 */
const STICKY_HEADER = "sticky top-0 z-20 bg-white";

/** Age tint. Only ever applied to bugs still awaiting a decision — see `showsStaleness`. */
const STALENESS_STYLES = {
  fresh: "text-typography-700",
  recent: "text-typography-700",
  stale: "text-amber-700 font-medium",
  ancient: "text-destructive-600 font-semibold",
} as const;

/**
 * A checkbox that can render the third state.
 *
 * Same shape as `NotionTable`'s: `indeterminate` is a DOM property with no HTML
 * attribute, so it can only be set through a ref. A header checkbox for a
 * partial selection has to show it — a plain unchecked box next to twelve
 * selected rows reads as "nothing is selected".
 */
const TriStateCheckbox: FC<{
  id: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}> = ({ id, checked, indeterminate = false, onChange, label, disabled }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={onChange}
      // Stops a click on the box from also opening the row underneath it.
      onClick={event => event.stopPropagation()}
      className="w-4 h-4 text-black border-border-light rounded focus:ring-black cursor-pointer disabled:cursor-not-allowed"
    />
  );
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
      className={`py-3 pr-4 font-medium ${STICKY_HEADER} ${className ?? ""}`}
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

export interface BugFindingsTableProps {
  /** Opens the shortcut sheet. Owned by the page so `?` works from anywhere on it. */
  onShowShortcuts: () => void;
}

/**
 * Every bug Bug Hunter knows about, from any source — pipeline findings and
 * human reports alike — as a surface built for triage rather than for reading.
 *
 * ## What the previous rebuild gave it
 *
 * Buckets instead of seventeen statuses, search and facets, sortable columns
 * with real `aria-sort`, keyboard-reachable rows, a count, pagination, a
 * skeleton, and duplicate flagging. All of that stands; the module docs on
 * `lifecycleBucket.ts` and `findingsView.ts` still explain why.
 *
 * ## What this rebuild adds, and the one problem it solves
 *
 * That table was good at *reading* a hundred bugs and still bad at *clearing*
 * them. Every decision cost a drawer: open, read, confirm, close, find your
 * place again. A night's sweep in "Checks with you" mode produces fifty
 * findings that each need a yes or a no, and fifty drawers is not a triage
 * surface — it is a reading surface with a decision hidden at the bottom of it.
 *
 * So the decision comes to the row:
 *
 * - **Quick actions per row.** Approve, reject and "put me on it" sit in the
 *   last cell, offered only where ally-be would actually accept them
 *   (`triage.ts` owns those rules, so a button that 403s cannot ship). Each
 *   still confirms, because both approve and reject are one-way doors.
 * - **Selection and one bulk confirmation.** Twenty rejections behind one
 *   dialog instead of twenty. `BulkTriageBar` explains why this — and not the
 *   keyboard — is where the throughput actually comes from.
 * - **A keyboard cursor.** `j`/`k` move, `o` opens, `a`/`r`/`f` decide, `x`
 *   selects, `/` searches, `?` explains. The cursor is *real focus* on the
 *   row's own button rather than an `aria-activedescendant` shadow, so a screen
 *   reader announces the row it lands on and the browser scrolls it into view
 *   for free.
 * - **Age, with staleness.** A bug found five minutes ago and one that has been
 *   waiting three weeks looked identical. Only bugs awaiting a decision get the
 *   tint, for the reason `LifecycleBucketChips` gives about its own colours.
 * - **A sticky header and a density switch**, because twenty rows of six
 *   columns is a scroll, and a scroll that loses its column names is a guess.
 * - **Dead columns collapse.** Repo, severity and PR are all null for a bug a
 *   human reported in free text. On an install whose findings are mostly
 *   reports, three of six columns were an em-dash from top to bottom, taking a
 *   third of the width to say nothing.
 *
 * ## Filters live in the URL now
 *
 * This component reads them from `useBugHunterUrlState` rather than from props
 * or its own `useState`. The old `focusFindingId`/`onFocusHandled` pair is gone
 * with them: the open bug is `?bug=<id>`, so the queue, the inbox and this
 * table all "open a drawer" by writing the same query param, and no surface
 * needs to hand a callback to another. See that module for why opening pushes
 * history and typing replaces it.
 */
export const BugFindingsTable: FC<BugFindingsTableProps> = ({ onShowShortcuts }) => {
  const {
    bug: selectedId,
    bucket,
    search,
    repo,
    severity,
    source,
    density,
    setBug,
    setBucket,
    setSearch,
    setRepo,
    setSeverity,
    setSource,
    setDensity,
    clearFilters,
  } = useBugHunterUrlState();

  const [sortKey, setSortKey] = useState<SortKey>("discovered");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);

  /** Ids the reader has ticked. Kept as ids, not findings, so a poll that refreshes a row keeps it selected. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /**
   * The bug the keyboard cursor is on, held as an **id rather than a row
   * index**.
   *
   * An index is the obvious choice and the wrong one: re-sort the table, change
   * a filter, or let a poll insert a newly-found bug above the cursor, and
   * index 4 is now a different bug than the one that was highlighted — with
   * `a` and `r` still aimed at it. An id either still exists on the page or it
   * does not, and "does not" is simply no cursor. It also means the cursor
   * follows its bug across a sort instead of staying put.
   */
  const [cursorId, setCursorId] = useState<string | null>(null);
  /** A single-row decision awaiting its confirmation. */
  const [pending, setPending] = useState<{ action: TriageAction; finding: BugFinding } | null>(
    null,
  );

  const [approve] = useApproveBugFindingMutation();
  const [reject] = useRejectBugFindingMutation();
  const [startFixSession] = useStartBugFixSessionMutation();

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

  /**
   * Which optional columns are worth a column.
   *
   * Decided over the whole loaded window rather than the current page, so a
   * column cannot appear at page 2 and vanish at page 3 — a table whose shape
   * changes as you page through it is harder to read than one dead column.
   */
  const showRepo = useMemo(() => findings.some(finding => !!finding.repo), [findings]);
  const showSeverity = useMemo(() => findings.some(finding => !!finding.severity), [findings]);
  const showPr = useMemo(() => findings.some(finding => !!finding.prUrl), [findings]);

  const rows = view.rows;

  /** Where the cursor's bug currently sits on this page, or -1 if it isn't on it. */
  const cursor = useMemo(
    () => (cursorId == null ? -1 : rows.findIndex(row => row.finding.id === cursorId)),
    [rows, cursorId],
  );

  /**
   * The selection, resolved against the loaded window.
   *
   * Every consumer reads *this* rather than `selectedIds`, which is what makes
   * a reconciliation pass unnecessary: rejecting twelve bugs drops them out of
   * the window, they stop appearing here, and the bar's count follows without
   * anything having to prune the id set in an effect. Ids for bugs that have
   * left the window linger in `selectedIds` and are simply inert — nothing
   * counts them, renders them or sends a request for them.
   */
  const selected = useMemo(
    () => findings.filter(finding => selectedIds.has(finding.id)),
    [findings, selectedIds],
  );

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

  const toggleId = useCallback((id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageIds = useMemo(() => rows.map(row => row.finding.id), [rows]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));

  const togglePage = useCallback(() => {
    setSelectedIds(current => {
      const next = new Set(current);
      const everySelected = pageIds.length > 0 && pageIds.every(id => next.has(id));
      pageIds.forEach(id => (everySelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [pageIds]);

  /** Runs a single-row decision once its confirmation is accepted. */
  const runPending = async () => {
    if (!pending) return;
    const { action, finding } = pending;
    setPending(null);
    try {
      if (action === "approve") await approve(finding.id).unwrap();
      else if (action === "reject") await reject(finding.id).unwrap();
      else {
        // `repo` is only sent when the finding hasn't got one — the mutation's
        // own doc explains why. A repo-less bug reaches here only from the row
        // button, never from a bulk run; see `bulkEligible`.
        await startFixSession({ id: finding.id, ...(finding.repo ? {} : {}) }).unwrap();
      }
    } catch {
      toast.error(en.bugHunter.quickActionFailed);
    }
  };

  // ── Keyboard ────────────────────────────────────────────────────
  const rowButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  /**
   * Moves the cursor and puts real focus on that row's own control.
   *
   * Focus, not an `aria-activedescendant` shadow: the row's title button is
   * already a named control, so focusing it makes a screen reader announce the
   * row the cursor lands on and makes the browser scroll it into view — both
   * for free, and both correct in a way a hand-rolled cursor is not.
   */
  const moveCursor = useCallback(
    (delta: number) => {
      if (rows.length === 0) return;
      // From nothing, `j` starts at the top and `k` at the bottom, rather than
      // both starting at row one.
      const next = cursor < 0 ? (delta > 0 ? 0 : rows.length - 1) : cursor + delta;
      const clamped = Math.min(rows.length - 1, Math.max(0, next));
      setCursorId(rows[clamped].finding.id);
      const target = rowButtonRefs.current[clamped];
      target?.focus();
      // `nearest` rather than `center`: a row already fully visible should not
      // make the page jump, which is what `center` does on every keypress.
      target?.scrollIntoView({ block: "nearest" });
    },
    [cursor, rows],
  );

  const cursorFinding = cursor >= 0 ? rows[cursor].finding : null;

  /** Offers a decision for the row the cursor is on, or says why it doesn't apply. */
  const requestFromCursor = useCallback(
    (action: TriageAction) => {
      if (!cursorFinding) return;
      if (!canAct(action, cursorFinding)) {
        toast.error(en.bugHunter.quickActionNotApplicable);
        return;
      }
      setPending({ action, finding: cursorFinding });
    },
    [cursorFinding],
  );

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      // Ctrl/Cmd/Alt combinations belong to the browser and the OS. Shift is
      // allowed through, because shift+X is one of ours.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      // Never steal a keystroke from something the reader is typing into. `/`
      // in a search box has to be a slash, and `r` in one has to be an r.
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true
      ) {
        return;
      }
      // The drawer is a modal surface with its own controls; while it is open
      // the list underneath is not what the keyboard is addressing.
      if (selectedId) return;

      switch (event.key) {
        case "j":
        case "ArrowDown":
          event.preventDefault();
          moveCursor(1);
          return;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          moveCursor(-1);
          return;
        case "o":
          if (cursorFinding) {
            event.preventDefault();
            setBug(cursorFinding.id);
          }
          return;
        case "a":
          event.preventDefault();
          requestFromCursor("approve");
          return;
        case "r":
          event.preventDefault();
          requestFromCursor("reject");
          return;
        case "f":
          event.preventDefault();
          requestFromCursor("fix");
          return;
        // Both spellings, and `shiftKey` rather than the capital, on purpose.
        // A real browser reports shift+x as `key: "X"`, but synthesised events
        // (automation, some IMEs, some remote-desktop layers) deliver `"x"`
        // with `shiftKey` set — and reading only the capital there turns
        // "select the page" into "deselect the row you were on", which is the
        // opposite of what was asked for.
        case "x":
        case "X":
          event.preventDefault();
          if (event.shiftKey) togglePage();
          else if (cursorFinding) toggleId(cursorFinding.id);
          return;
        // `?` is shift+/ on a US layout, and a real browser reports it as `"?"`.
        // Synthesised events report `"/"` with `shiftKey` instead — the same
        // split as shift+x above — so both spellings are accepted, and the
        // shifted form must be tested first or it falls through to "focus the
        // search box".
        case "/":
        case "?":
          event.preventDefault();
          if (event.key === "?" || event.shiftKey) onShowShortcuts();
          else searchRef.current?.querySelector("input")?.focus();
          return;
        case "Escape":
          if (selectedIds.size > 0) {
            event.preventDefault();
            setSelectedIds(new Set());
          }
          return;
        default:
          return;
      }
    };

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [
    cursorFinding,
    moveCursor,
    onShowShortcuts,
    requestFromCursor,
    selectedId,
    selectedIds.size,
    setBug,
    toggleId,
    togglePage,
  ]);

  const rowPadding = density === "compact" ? "py-1.5" : "py-3";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-typography-900">
            {en.bugHunter.findingsTitle}
          </h2>
          <p className="text-xs text-typography-600">{en.bugHunter.findingsSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Density is a preference, but a shareable one — it rides in the URL
              with the filters rather than in local storage, so a link carries
              the whole view. */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-typography-600">{en.bugHunter.densityLabel}</span>
            <div className="flex rounded border border-border-light overflow-hidden">
              {(["comfortable", "compact"] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={density === option}
                  onClick={() => setDensity(option)}
                  className={`px-2 py-1 text-[11px] cursor-pointer ${
                    density === option
                      ? "bg-neutral-100 text-typography-900 font-medium"
                      : "bg-white text-typography-600 hover:bg-neutral-50"
                  }`}
                >
                  {option === "comfortable"
                    ? en.bugHunter.densityComfortable
                    : en.bugHunter.densityCompact}
                </button>
              ))}
            </div>
          </div>

          {/* The discoverability half of the keyboard work — see
              KeyboardShortcutSheet on why a hint plus a sheet, and not a
              tooltip on a button. */}
          <Button size="sm" kind="ghost" onClick={onShowShortcuts}>
            {en.bugHunter.shortcutsButton}
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <LifecycleBucketChips
          counts={counts}
          total={findings.length}
          value={bucket}
          onChange={setBucket}
          disabled={isLoading}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] max-w-md" ref={searchRef}>
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

        {/* The repo facet only earns its place when the window actually holds
            more than one repo to choose between. */}
        {repos.length > 1 && (
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
        )}

        {showSeverity && (
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
        )}

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
                <TableHeader className={`py-3 pr-3 w-8 ${STICKY_HEADER}`}>
                  <Tooltip label={en.bugHunter.selectAllTooltip} align="right">
                    <span className="inline-flex">
                      <TriStateCheckbox
                        id="bug-findings-select-all"
                        checked={allPageSelected}
                        indeterminate={somePageSelected}
                        onChange={togglePage}
                        label={en.bugHunter.selectAllLabel}
                      />
                    </span>
                  </Tooltip>
                </TableHeader>
                <SortableHeader
                  sortKey="title"
                  label={en.bugHunter.findingColumnTitle}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                {showRepo && (
                  <TableHeader className={`py-3 pr-4 font-medium ${STICKY_HEADER}`}>
                    {en.bugHunter.findingColumnRepo}
                  </TableHeader>
                )}
                {showSeverity && (
                  <SortableHeader
                    sortKey="severity"
                    label={en.bugHunter.findingColumnSeverity}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                )}
                <TableHeader className={`py-3 pr-4 font-medium ${STICKY_HEADER}`}>
                  {en.bugHunter.findingColumnStatus}
                </TableHeader>
                {/* Replaces the old absolute "Discovered" date column. The
                    magnitude is what a triager reads ("this has been sitting
                    three weeks"); the exact timestamp is a hover away. */}
                <SortableHeader
                  sortKey="discovered"
                  label={en.bugHunter.findingColumnAge}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                {showPr && (
                  <TableHeader className={`py-3 pr-4 font-medium ${STICKY_HEADER}`}>
                    {en.bugHunter.findingColumnPr}
                  </TableHeader>
                )}
                <TableHeader className={`py-3 font-medium text-right ${STICKY_HEADER}`}>
                  {en.bugHunter.quickActionsColumn}
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ finding, duplicateCount }, index) => {
                const days = ageInDays(finding);
                const tier = days == null ? "fresh" : stalenessTier(days);
                const tinted = showsStaleness(finding) ? tier : "fresh";
                const isCursor = index === cursor;
                const isSelected = selectedIds.has(finding.id);

                return (
                  <TableRow
                    key={finding.id}
                    className={`border-b border-border-light text-sm text-typography-900 cursor-pointer ${
                      isSelected ? "bg-primary-50" : "hover:bg-neutral-50"
                    } ${
                      // The keyboard cursor's own mark. Focus lands on the
                      // row's button and is visible on its own, but the ring is
                      // on a 420px cell inside a full-width row — so the row
                      // gets a left rule too, which is what makes "where am I"
                      // answerable at a glance while paging with j/k.
                      isCursor ? "shadow-[inset_3px_0_0_0_var(--cds-interactive,#0f62fe)]" : ""
                    } ${freshIds.has(finding.id) ? "animate-fadeIn motion-reduce:animate-none" : ""}`}
                    // Mouse convenience only. The row deliberately carries no
                    // role or tabIndex — see the button in the title cell.
                    onClick={() => setBug(finding.id)}
                  >
                    <TableCell className={`${rowPadding} pr-3`}>
                      <TriStateCheckbox
                        id={`bug-finding-select-${finding.id}`}
                        checked={isSelected}
                        onChange={() => toggleId(finding.id)}
                        label={en.bugHunter.rowSelectLabel.replace("{title}", finding.title)}
                      />
                    </TableCell>

                    <TableCell className={`${rowPadding} pr-4 max-w-[420px]`}>
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
                            It doubles as the keyboard cursor's focus target. */}
                        <button
                          ref={element => {
                            rowButtonRefs.current[index] = element;
                          }}
                          type="button"
                          aria-label={en.bugHunter.rowOpenLabel.replace("{title}", finding.title)}
                          title={finding.title}
                          onFocus={() => setCursorId(finding.id)}
                          onClick={event => {
                            event.stopPropagation();
                            setBug(finding.id);
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

                    {showRepo && (
                      <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
                        {finding.repo ?? "—"}
                      </TableCell>
                    )}

                    {showSeverity && (
                      <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
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
                    )}

                    <TableCell className={`${rowPadding} pr-4`}>
                      <span className="inline-flex items-center gap-1.5">
                        <BugFindingStatusBadge status={finding.status} />
                        {isMidFlight(finding.status) && (
                          <BrailleSpinner className="text-amber-600" />
                        )}
                      </span>
                    </TableCell>

                    <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
                      {/* The absolute date stays reachable as the hover title —
                          the column shows the magnitude, which is the thing a
                          triager is actually comparing between rows. */}
                      <span
                        title={formatDate(finding.createdAt)}
                        className={`tabular-nums ${STALENESS_STYLES[tinted]}`}
                      >
                        {days == null ? "—" : formatAge(days)}
                      </span>
                      {tinted === "stale" || tinted === "ancient" ? (
                        <Tooltip
                          label={
                            tinted === "ancient"
                              ? en.bugHunter.findingAgeAncientTooltip
                              : en.bugHunter.findingAgeStaleTooltip
                          }
                          align="top"
                        >
                          <span className="ml-1 cursor-help" aria-hidden="true">
                            ⏳
                          </span>
                        </Tooltip>
                      ) : null}
                    </TableCell>

                    {showPr && (
                      <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
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
                    )}

                    {/* Quick actions. Rendered only where ally-be would accept
                        them, so there is no such thing as a disabled one here —
                        a greyed-out "Approve" on forty rows is noise, and an
                        enabled one that 403s is worse. */}
                    <TableCell className={`${rowPadding} text-right whitespace-nowrap`}>
                      <div
                        className="inline-flex items-center gap-1 justify-end"
                        // These are the row's actions, not the row: a click on
                        // one must not also open the drawer behind it.
                        onClick={event => event.stopPropagation()}
                      >
                        {canAct("approve", finding) && (
                          <Button
                            size="sm"
                            kind="ghost"
                            onClick={() => setPending({ action: "approve", finding })}
                          >
                            {en.bugHunter.quickApprove}
                          </Button>
                        )}
                        {canAct("reject", finding) && (
                          <Button
                            size="sm"
                            kind="ghost"
                            onClick={() => setPending({ action: "reject", finding })}
                          >
                            {en.bugHunter.quickReject}
                          </Button>
                        )}
                        {canAct("fix", finding) && (
                          <Button
                            size="sm"
                            kind="ghost"
                            onClick={() => setPending({ action: "fix", finding })}
                          >
                            {en.bugHunter.quickFix}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Only while something is ticked — an always-present bar with a zero
              in it is a permanent strip of chrome at the bottom of the page. */}
          {selected.length > 0 && (
            <BulkTriageBar
              selected={selected}
              onClear={() => setSelectedIds(new Set())}
              onSettled={actedIds =>
                setSelectedIds(current => {
                  const next = new Set(current);
                  actedIds.forEach(id => next.delete(id));
                  return next;
                })
              }
            />
          )}

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
              <p className="text-[11px] text-typography-400 mt-0.5">{en.bugHunter.shortcutsHint}</p>
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

      {/* One dialog for every single-row decision, whichever surface asked for
          it — the row's button or the keyboard. Both approve and reject are
          one-way doors in ally-be's transition map, so neither is offered
          without one; the bulk bar is where that cost is paid once instead of
          per bug. */}
      {pending && (
        <ActionConfirmationPopup
          isOpen
          onClose={() => setPending(null)}
          title={
            pending.action === "approve"
              ? en.bugHunter.drawerApproveConfirmTitle
              : pending.action === "reject"
                ? en.bugHunter.drawerRejectConfirmTitle
                : en.bugHunter.drawerFixSessionConfirmTitle
          }
          description={
            pending.action === "approve"
              ? en.bugHunter.drawerApproveConfirmBody
              : pending.action === "reject"
                ? en.bugHunter.drawerRejectConfirmBody
                : pending.finding.repo
                  ? en.bugHunter.drawerFixSessionConfirmBody.replace("{repo}", pending.finding.repo)
                  : en.bugHunter.drawerFixSessionConfirmBodyUnknownRepo
          }
          primaryButton={{
            label:
              pending.action === "approve"
                ? en.bugHunter.quickApproveConfirm
                : pending.action === "reject"
                  ? en.bugHunter.quickRejectConfirm
                  : en.bugHunter.drawerFixSessionStart,
            onClick: () => void runPending(),
          }}
          secondaryButton={{ label: en.bugHunter.cancel, onClick: () => setPending(null) }}
        />
      )}

      {/* Scoped barrier, keyed to the open bug. The page-level one in
          PrivateLayout would already stop a bad drawer blanking the console,
          but it would take the bugs table down with it — and the table is how
          you'd reach a different bug. This keeps the failure inside the drawer,
          and a different row starts clean rather than inheriting the error. */}
      {selectedId && (
        <ErrorBoundary variant="panel" resetKey={selectedId} onDismiss={() => setBug(null)}>
          <BugFindingDrawer id={selectedId} onClose={() => setBug(null)} />
        </ErrorBoundary>
      )}
    </div>
  );
};
