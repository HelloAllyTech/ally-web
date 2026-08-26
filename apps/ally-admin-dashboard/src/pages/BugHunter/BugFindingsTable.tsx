import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import {
  Button,
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
  useGetBugHuntRunQuery,
  useRejectBugFindingMutation,
  useStartBugFixSessionMutation,
} from "@api";
// Reached past the barrel on purpose. Importing the barrel pulls @constants,
// which reads `cellTypes` back off it at module-eval time — a test that needs
// the real boundary while stubbing the barrel deadlocks on that cycle. Same
// direct-path treatment as @components/action-confirmation-popup elsewhere.
import { TooltipIcon } from "@assets";
import { EmptyState } from "@components";
import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { ErrorBoundary } from "@components/error-boundary";
import { en } from "@constants";
import { BugFinding, BugFindingSeverity } from "@types";
import { formatDateTime, formatTimestamp } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingDrawer } from "./BugFindingDrawer";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStageChip } from "./BugFindingStageChip";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";
import { PAGE_SIZES, PageSize, useBugHunterUrlState } from "./bugHunterUrlState";
import { BulkTriageBar } from "./BulkTriageBar";
import { FindingsFilterBar } from "./FindingsFilterBar";
import { BUG_FINDINGS_TABLE_ANCHOR_ID } from "./findingsTableAnchor";
import {
  buildFacetCounts,
  buildFindingsView,
  FindingsFilters,
  isMidFlight,
  reposInWindow,
  severitiesInWindow,
  SortDirection,
  SortKey,
  sourcesInWindow,
  stagesInWindow,
  statusesInWindow,
  updatedAt,
  wasTouchedSinceDiscovery,
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

/**
 * The Staff/Consumer badge on a human-filed bug.
 *
 * Purple, matching the roadmap board's own consumer badge — the same distinction
 * carried over from the screen that used to make it, so someone who knows one
 * recognises the other. Both values get a badge here, unlike on the roadmap where
 * "staff" was the silent default: on that board almost everything was staff-filed,
 * whereas here almost nothing is human-filed at all, so which KIND of person filed
 * it is the informative half.
 */
const CONSUMER_BADGE_STYLE =
  "inline-flex items-center rounded bg-purple-50 px-1 text-[10px] font-semibold text-purple-700";

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

/**
 * The two columns that step aside on a narrow viewport.
 *
 * `max-w-0` on the title column makes it yield every spare pixel to the others,
 * which measured at 1024px left it 112px — eight characters of a bug title
 * beside 223px of buttons. Its `min-w` floor stops that, and this is the other
 * half: with a floor and no responsive columns the table just outgrows its
 * container. The sticky header rules out the usual `overflow-x-auto` wrapper,
 * because that wrapper would become the scrollport and the header would stop
 * sticking to the page.
 *
 * Stage and Updated are the two worth dropping. Age answers "how long has this
 * sat?" most of the time, so Updated adds little; Stage is derived from the
 * Status column right beside it. Both are in the drawer regardless.
 *
 * One breakpoint rather than a staircase, and `xl` rather than `2xl`, because
 * the number that matters is the *container* width and it is nothing like the
 * viewport's — the console's nav rail takes about 300px, so a 1512px viewport
 * is a 1204px table. Staggering these produced a table that hid Updated at
 * 1512 with 600px of slack in it.
 *
 * Applied to the header and the body cell identically. A column hidden on one
 * and not the other shifts every cell to its right by one.
 */
const SECONDARY_COLUMN = "hidden xl:table-cell";

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
  /**
   * Help text for a column whose name does not fully explain it.
   *
   * Rendered as a sibling of the sort button, never inside it: a tooltip
   * trigger is itself a `<button>`, and nesting one inside the sort control
   * would be invalid markup and would sort the table on the way to reading the
   * explanation.
   */
  tooltip?: string;
}> = ({ sortKey, label, activeKey, direction, onSort, className, tooltip }) => {
  const isActive = activeKey === sortKey;
  return (
    <TableHeader
      className={`py-2.5 pr-4 font-medium ${STICKY_HEADER} ${className ?? ""}`}
      // Real `aria-sort` on the header cell rather than a visual caret only:
      // the old table had no sort at all, and adding one that a screen reader
      // cannot read the state of would be adding half of it.
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1 cursor-pointer hover:text-typography-900"
        >
          {label}
          {/* The inactive marker is deliberately faint rather than absent:
              every column here sorts now, and a caret that appears only on the
              active one leaves a reader guessing which of the others will
              respond to a click. */}
          <span
            aria-hidden="true"
            className={`text-[10px] ${isActive ? "text-typography-700" : "text-typography-300"}`}
          >
            {isActive ? (direction === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
        {tooltip && (
          // `autoAlign` is on by default in the shared wrapper, which matters
          // here specifically: this header is `position: sticky` at the top of
          // the page's scroll container, so a top-aligned tooltip would open
          // into the chrome above it and flips itself instead.
          <Tooltip label={tooltip} align="top">
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        )}
      </span>
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
  /**
   * False for a SUPER_ADMIN, who can read this table but not act on it, and for
   * the roadmap's read-only Bugs tab — resolved once by the owning page and
   * threaded down here, into the row quick-actions, the keyboard shortcuts, the
   * bulk bar and the drawer, so there is exactly one copy of that rule.
   */
  canTriage: boolean;
}

/**
 * Every bug Bug Hunter knows about, from any source — pipeline findings and
 * human reports alike — as a surface built for triage rather than for reading.
 *
 * ## What the previous rebuilds gave it
 *
 * Buckets instead of seventeen statuses, search and facets, sortable columns
 * with real `aria-sort`, keyboard-reachable rows, a count, pagination, a
 * skeleton, duplicate flagging, per-row quick actions, a bulk bar and a
 * keyboard cursor. All of that stands; the module docs on `lifecycleBucket.ts`,
 * `findingsView.ts` and `BulkTriageBar` still explain why.
 *
 * ## What this rebuild adds
 *
 * The table was good at reading and good at deciding, and bad at the step in
 * between: **narrowing fifty-four bugs down to the eight you meant.** On a real
 * install the whole window lands in one bucket — 52 of 54 at "On the list" — so
 * the chips, which are the primary filter, separated nothing at all. Under them
 * sat three single-select facets and four sortable columns.
 *
 * - **Every facet is multi-select, and there are eight of them** — status,
 *   repo, severity, source, roadmap stage, age band, duplicates-only, plus the
 *   buckets. They live behind one button rather than eight controls, with the
 *   active ones shown as removable pills. `FindingsFilterBar` argues that.
 * - **Every column sorts**, including the three that did not: status (in
 *   lifecycle order, not alphabetically), repo, and stage.
 * - **Sort and page size ride in the URL** with the filters, so a link carries
 *   the view someone meant to send rather than its default ordering.
 * - **Rows per page is a control**, and its top value is the window size — so
 *   "select the lot and reject it" is one gesture instead of five rounds of
 *   select-page. `Select all N` does the same job across pages.
 * - **Stage got its own collapsible column** and left the status cell. Stacked
 *   under the status badge it produced rows reading "New" directly above
 *   "New" — two badges saying one thing, which is the exact failure the
 *   dead-column rule below exists to prevent everywhere else.
 *
 * ## Dead columns collapse, and that now includes Stage
 *
 * Repo, severity, PR, updated and stage render only when the loaded window
 * holds a value worth a column. On an install whose findings are mostly human
 * reports that is three of eight columns which would otherwise be an em-dash
 * from top to bottom. Decided over the whole window rather than the current
 * page, so a column cannot appear at page 2 and vanish at page 3. The selection
 * and quick-action columns follow the same rule against `canTriage`.
 *
 * ## A failed poll no longer empties the table
 *
 * `isError` used to win over `data`, and this list polls every fifteen seconds
 * — so one timed-out poll swapped fifty-four rows for a single line of error
 * text, and the next poll brought them back. Found by watching the live page.
 * Stale rows under a warning strip are strictly better than no rows: the reader
 * keeps working, and the strip says the data may have moved on.
 */
export const BugFindingsTable: FC<BugFindingsTableProps> = ({ onShowShortcuts, canTriage }) => {
  const {
    bug: selectedId,
    bucket,
    search,
    run,
    repos,
    severities,
    sources,
    statuses,
    stages,
    age,
    duplicatesOnly,
    sort: sortKey,
    direction: sortDirection,
    pageSize,
    density,
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
    toggleSort,
    setPageSize,
    setDensity,
    clearFilters,
  } = useBugHunterUrlState();

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

  /**
   * Unscoped, these are the same args as the profile card's and the queue's, so
   * all three read one RTK Query cache entry rather than opening a request
   * each, and every filter below is applied to that shared window client-side
   * (see findingsView.ts).
   *
   * A run scope is the one exception, and has to be: `runId` goes to the server
   * and *replaces* the window rather than filtering it. A sweep stamps its id
   * onto every row it touches — including a human-reported bug filed weeks ago,
   * which is the common case, not the corner one — so its findings are not the
   * newest hundred rows and filtering the shared window would have found only
   * the few that happened to be recent, then reported that number as the total.
   * That costs one extra cache entry while a scope is on, and is the difference
   * between "the 10 that sweep found" and "the 2 of them I could see".
   */
  const queryArgs = useMemo(
    () =>
      run
        ? { status: "all" as const, limit: 100, runId: run }
        : { status: "all" as const, limit: 100 },
    [run],
  );

  const { data, isLoading, isError, refetch } = useGetBugFindingsQuery(queryArgs, {
    pollingInterval: 15_000,
  });

  /**
   * The scoped sweep, for the banner's own words.
   *
   * Skipped entirely when there is no scope — an admin who never clicks a count
   * in the shift log should not pay a request for a banner that never renders.
   * The shift log has usually already cached this entry by the time they do.
   */
  const { data: scopedRun } = useGetBugHuntRunQuery(run ?? "", { skip: !run });

  // Memoised because `data?.items ?? []` is a fresh array identity every render:
  // without it the view below (filter, sort, duplicate scan, page slice) would
  // recompute on any unrelated re-render, and no dependency array could say so
  // honestly.
  const findings = useMemo<BugFinding[]>(() => data?.items ?? [], [data]);

  /**
   * Whether the last request failed *and* left nothing on screen.
   *
   * The distinction is the whole fix: RTK Query keeps `data` from the last good
   * response while `isError` describes the current one, so on a fifteen-second
   * poll a single timeout used to swap a full table for one line of error text.
   * A stale table under a warning strip is the honest rendering — the rows were
   * true a moment ago, and the strip says so.
   */
  const hasNothingToShow = findings.length === 0;
  const isStale = isError && !hasNothingToShow;

  const filters = useMemo<FindingsFilters>(
    () => ({
      bucket,
      search,
      repos,
      severities,
      sources,
      statuses,
      stages,
      age,
      duplicatesOnly,
    }),
    [bucket, search, repos, severities, sources, statuses, stages, age, duplicatesOnly],
  );

  // A filter change can shrink the list below the current offset, which would
  // otherwise leave an empty page rendered with no rows and no explanation.
  // `buildFindingsView` clamps as a backstop; this resets the intent.
  useEffect(() => {
    setPage(0);
  }, [filters, sortKey, sortDirection, pageSize]);

  const view = useMemo(
    () =>
      buildFindingsView({
        findings,
        total: data?.count ?? findings.length,
        filters,
        sortKey,
        sortDirection,
        page,
        pageSize,
      }),
    [findings, data?.count, filters, sortKey, sortDirection, page, pageSize],
  );

  const counts = useMemo(() => countByBucket(findings), [findings]);
  const facetCounts = useMemo(() => buildFacetCounts(findings), [findings]);
  const available = useMemo(
    () => ({
      repos: reposInWindow(findings),
      severities: severitiesInWindow(findings),
      sources: sourcesInWindow(findings),
      statuses: statusesInWindow(findings),
      stages: stagesInWindow(findings),
    }),
    [findings],
  );

  /**
   * Which optional columns are worth a column.
   *
   * Decided over the whole loaded window rather than the current page, so a
   * column cannot appear at page 2 and vanish at page 3 — a table whose shape
   * changes as you page through it is harder to read than one dead column.
   */
  const showRepo = available.repos.length > 0;
  const showSeverity = available.severities.length > 0;
  const showPr = useMemo(() => findings.some(finding => !!finding.prUrl), [findings]);
  /**
   * Stage earns a column only once the window holds more than one of them.
   *
   * Stricter than the others — *more than one* value, not *any* value — because
   * stage is derived from status. A window where every bug is at stage "New"
   * gives a column repeating one word down the page, which is the dead-column
   * failure with extra steps. This is also where the old status-cell chip went:
   * stacked under the badge it rendered "New" above "New" on most rows.
   */
  const showStage = available.stages.length > 1;
  /**
   * "Updated" earns its column only once something in the window has actually
   * moved since it was found.
   *
   * Without this it is the widest kind of dead column — not an em-dash repeated
   * down the page but a *second copy of Age*, which is worse: a reader has to
   * compare the two before concluding they say the same thing.
   */
  const showUpdated = useMemo(() => findings.some(wasTouchedSinceDiscovery), [findings]);

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

  /**
   * Ticks every bug the current filters match, across every page.
   *
   * The header checkbox deliberately stays page-scoped. A checkbox in a column
   * header means "this column", and letting it silently reach rows nobody has
   * seen is how somebody bulk-rejects forty bugs they meant to skim. So the
   * cross-page version is a separate, named action that states the number it is
   * about to select, and it appears only when there is more than one page for
   * it to reach.
   */
  const selectAllMatching = useCallback(() => {
    setSelectedIds(new Set(view.matchedIds));
  }, [view.matchedIds]);

  const matchedAllSelected =
    view.matchedIds.length > 0 && view.matchedIds.every(id => selectedIds.has(id));

  /** Runs a single-row decision once its confirmation is accepted. */
  const runPending = async () => {
    if (!pending) return;
    const { action, finding } = pending;
    setPending(null);
    try {
      if (action === "approve") await approve(finding.id).unwrap();
      else if (action === "reject") await reject(finding.id).unwrap();
      // No `repo` argument. ally-be resolves the repo itself for a bug that has
      // none — the confirm dialog says so in as many words — and this call used
      // to carry a `...(finding.repo ? {} : {})` spread whose two branches were
      // both the empty object.
      else await startFixSession({ id: finding.id }).unwrap();
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
      if (!canTriage) return;
      if (!cursorFinding) return;
      if (!canAct(action, cursorFinding)) {
        toast.error(en.bugHunter.quickActionNotApplicable);
        return;
      }
      setPending({ action, finding: cursorFinding });
    },
    [cursorFinding, canTriage],
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
          if (!canTriage) return;
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
    canTriage,
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

  const rowPadding = density === "compact" ? "py-1.5" : "py-2.5";

  return (
    <div id={BUG_FINDINGS_TABLE_ANCHOR_ID} className="scroll-mt-4">
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
              the whole view. The visible "Rows" label that used to sit beside
              this pair is gone: the two options name themselves, and it was a
              third piece of text in a corner already holding two controls. */}
          <div
            className="flex rounded border border-border-light overflow-hidden"
            role="group"
            aria-label={en.bugHunter.densityLabel}
          >
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

          {/* The discoverability half of the keyboard work — see
              KeyboardShortcutSheet on why a hint plus a sheet, and not a
              tooltip on a button. */}
          <Button size="sm" kind="ghost" onClick={onShowShortcuts}>
            {en.bugHunter.shortcutsButton}
          </Button>
        </div>
      </div>

      {/* Above the chips on purpose: the scope changes what every number below
          it counts, so a reader who has not seen this line will read
          "Everything 7" as "seven bugs exist". Stacks' *Making Agent
          Trustworthiness Visible Through Transparency* is the argument for
          spelling out the audit trail rather than quietly narrowing the view. */}
      {run && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-primary-200 bg-primary-50 px-3 py-2">
          <p className="text-xs text-typography-800">
            <span className="font-semibold">
              {scopedRun
                ? en.bugHunter.runScopeBanner
                    .replace("{repo}", scopedRun.repo)
                    .replace("{timestamp}", formatDateTime(scopedRun.createdAt))
                : en.bugHunter.runScopeBannerLoading}
            </span>{" "}
            {en.bugHunter.runScopeBannerHint}
          </p>
          <Button size="sm" kind="ghost" onClick={() => setRun(null)}>
            {en.bugHunter.runScopeClear}
          </Button>
        </div>
      )}

      <div className="mb-3">
        <LifecycleBucketChips
          counts={counts}
          total={findings.length}
          value={bucket}
          onChange={setBucket}
          disabled={isLoading}
        />
      </div>

      <div className="mb-3">
        <FindingsFilterBar
          filters={filters}
          available={available}
          counts={facetCounts}
          onSearch={setSearch}
          onRepos={setRepos}
          onSeverities={setSeverities}
          onSources={setSources}
          onStatuses={setStatuses}
          onStages={setStages}
          onAge={setAge}
          onDuplicatesOnly={setDuplicatesOnly}
          onClearAll={clearFilters}
          searchRef={searchRef}
        />
      </div>

      {/* A poll that failed while rows are already on screen. Deliberately a
          strip above the table rather than a replacement for it. */}
      {isStale && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">{en.bugHunter.findingsStaleNotice}</p>
          <Button size="sm" kind="ghost" onClick={() => refetch()}>
            {en.bugHunter.retry}
          </Button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : isError && hasNothingToShow ? (
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
      ) : hasNothingToShow ? (
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
          {/* Offered only when the selection could reach past this page. On a
              single-page result the header checkbox already selects everything,
              and a second control saying so would be two ways to do one job. */}
          {canTriage && somePageSelected && view.pageCount > 1 && !matchedAllSelected && (
            <div className="mb-2 rounded border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs text-typography-800">
              {en.bugHunter.selectAllMatchingPrompt.replace(
                "{count}",
                String(view.matchedIds.length),
              )}{" "}
              <button
                type="button"
                onClick={selectAllMatching}
                className="font-semibold text-primary-700 underline cursor-pointer"
              >
                {en.bugHunter.selectAllMatchingAction.replace(
                  "{count}",
                  String(view.matchedIds.length),
                )}
              </button>
            </div>
          )}

          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                {/* No selection column at all for a reader who cannot act —
                    bulk triage is a decision, same as the row quick actions and
                    the drawer's buttons, all gated the same way. The whole
                    <TableHeader> goes, not just the checkbox inside it: an
                    empty 32px gutter down the left of every row is the "dead
                    column" this table collapses everywhere else. */}
                {canTriage && (
                  <TableHeader className={`py-2.5 pr-3 w-8 ${STICKY_HEADER}`}>
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
                )}
                {/* The one column that holds prose, and the one that absorbs
                    whatever width the others do not use. A table in `auto`
                    layout hands surplus to whichever cell wants it, which used
                    to be the actions column — so a 1500px viewport spent 325px
                    on two ghost buttons while bug titles truncated at 420px.

                    `w-full` here is only half of it, and on its own it is worse
                    than the bug it fixes: measured on the live page it made the
                    column 100% of the container *plus* the other six columns'
                    content, so the table came out 1897px wide inside a 1204px
                    region and everything from Status rightwards was off-screen.
                    The other half is `max-w-0` on the body cell, which is what
                    lets this column shrink past its content — see there. */}
                <SortableHeader
                  sortKey="title"
                  label={en.bugHunter.findingColumnTitle}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="w-full"
                />
                {showRepo && (
                  <SortableHeader
                    sortKey="repo"
                    label={en.bugHunter.findingColumnRepo}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="whitespace-nowrap"
                  />
                )}
                {showSeverity && (
                  <SortableHeader
                    sortKey="severity"
                    label={en.bugHunter.findingColumnSeverity}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className="whitespace-nowrap"
                  />
                )}
                <SortableHeader
                  sortKey="status"
                  label={en.bugHunter.findingColumnStatus}
                  tooltip={en.bugHunter.findingColumnStatusTooltip}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="whitespace-nowrap"
                />
                {showStage && (
                  <SortableHeader
                    sortKey="stage"
                    label={en.bugHunter.findingColumnStage}
                    tooltip={en.bugHunter.findingColumnStageTooltip}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className={`whitespace-nowrap ${SECONDARY_COLUMN}`}
                  />
                )}
                {/* Replaces the old absolute "Discovered" date column. The
                    magnitude is what a triager reads ("this has been sitting
                    three weeks"); the exact timestamp is a hover away. */}
                <SortableHeader
                  sortKey="discovered"
                  label={en.bugHunter.findingColumnAge}
                  tooltip={en.bugHunter.findingColumnAgeTooltip}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="whitespace-nowrap"
                />
                {/* Age answers "how long has this been sitting"; this answers
                    "did anything happen to it recently" — and they come apart
                    hard on a re-triaged human report, where Age is the day
                    somebody filed it and this is last night. */}
                {showUpdated && (
                  <SortableHeader
                    sortKey="updated"
                    label={en.bugHunter.findingColumnUpdated}
                    tooltip={en.bugHunter.findingColumnUpdatedTooltip}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                    className={`whitespace-nowrap ${SECONDARY_COLUMN}`}
                  />
                )}
                {showPr && (
                  <TableHeader
                    className={`py-2.5 pr-4 font-medium whitespace-nowrap ${STICKY_HEADER}`}
                  >
                    {en.bugHunter.findingColumnPr}
                  </TableHeader>
                )}
                {/* Same rule as the selection column: for a read-only reader
                    every cell under this heading is empty, so the heading is a
                    column-width promise of buttons that are never coming. */}
                {canTriage && (
                  <TableHeader
                    className={`py-2.5 font-medium text-right whitespace-nowrap ${STICKY_HEADER}`}
                  >
                    {en.bugHunter.quickActionsColumn}
                  </TableHeader>
                )}
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
                      // on one cell inside a full-width row — so the row gets a
                      // left rule too, which is what makes "where am I"
                      // answerable at a glance while paging with j/k.
                      isCursor ? "shadow-[inset_3px_0_0_0_var(--cds-interactive,#0f62fe)]" : ""
                    } ${freshIds.has(finding.id) ? "animate-fadeIn motion-reduce:animate-none" : ""}`}
                    // Mouse convenience only. The row deliberately carries no
                    // role or tabIndex — see the button in the title cell.
                    onClick={() => setBug(finding.id)}
                  >
                    {/* Gated with its header above, never independently — a
                        body cell that outlives its column shifts every other
                        cell on the row one place left. */}
                    {canTriage && (
                      <TableCell className={`${rowPadding} pr-3`}>
                        <TriStateCheckbox
                          id={`bug-finding-select-${finding.id}`}
                          checked={isSelected}
                          onChange={() => toggleId(finding.id)}
                          label={en.bugHunter.rowSelectLabel.replace("{title}", finding.title)}
                        />
                      </TableCell>
                    )}

                    {/* `max-w-0` is load-bearing, not a typo. A table cell's
                        column can never be narrower than its content's
                        min-content width, and `truncate` does not lower that —
                        so a long title would widen the column and push the
                        table past its container however the header is sized.
                        `max-width: 0` opts this column out of that floor: the
                        header's `w-full` then gets it the leftover space, and
                        the `truncate`s below do the rest. */}
                    <TableCell className={`${rowPadding} pr-4 min-w-[12rem] max-w-0`}>
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
                          It reads as provenance rather than as a field, it freed
                          a column, and the facet above is how you scan by it.

                          The reporter joins it for a human-filed bug: with bugs
                          off the roadmap board this row is the only place a real
                          user's report can be told apart from an agent-found
                          lint error, and "who hit this" is the first thing a
                          triager wants from that distinction. */}
                      <div className="text-xs text-typography-600 truncate">
                        {BUG_FINDING_SOURCE_LABELS[finding.source]}
                        {finding.report && (
                          <>
                            {" · "}
                            <span className={CONSUMER_BADGE_STYLE}>
                              {finding.report.reporterSource === "consumer"
                                ? en.bugHunter.reporterConsumer
                                : en.bugHunter.reporterStaff}
                            </span>{" "}
                            {finding.report.reportedByName ?? en.bugHunter.reporterUnknown}
                          </>
                        )}
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

                    <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1.5">
                        <BugFindingStatusBadge status={finding.status} />
                        {isMidFlight(finding.status) && (
                          <BrailleSpinner className="text-amber-600" />
                        )}
                      </span>
                    </TableCell>

                    {/* The roadmap ladder, in its own column now rather than
                        stacked under the status badge — see `showStage`. */}
                    {showStage && (
                      <TableCell
                        className={`${rowPadding} pr-4 whitespace-nowrap ${SECONDARY_COLUMN}`}
                      >
                        <BugFindingStageChip
                          stage={finding.stage}
                          status={finding.status}
                          isAuto={finding.stageIsAuto}
                          pinnedByName={finding.stageOverriddenByName}
                          pinnedAt={finding.stageOverriddenAt}
                        />
                      </TableCell>
                    )}

                    <TableCell className={`${rowPadding} pr-4 whitespace-nowrap`}>
                      {/* The exact timestamp — to the second, not just the day —
                          stays reachable as the hover title, so a row can be
                          placed against the sweep that touched it. The column
                          itself shows the magnitude, which is the thing a
                          triager is actually comparing between rows.

                          The staleness wording rides in that same `title`
                          rather than on a control of its own. It used to be an
                          ⏳ emoji with its own tooltip, sitting in a numeric
                          column beside a value that was *already* amber or red
                          for the same reason — a third encoding of one fact,
                          and the only emoji in the table. */}
                      <span
                        title={
                          tinted === "stale" || tinted === "ancient"
                            ? `${formatTimestamp(finding.createdAt)} — ${
                                tinted === "ancient"
                                  ? en.bugHunter.findingAgeAncientTooltip
                                  : en.bugHunter.findingAgeStaleTooltip
                              }`
                            : formatTimestamp(finding.createdAt)
                        }
                        className={`tabular-nums ${STALENESS_STYLES[tinted]}`}
                      >
                        {days == null ? "—" : formatAge(days)}
                      </span>
                    </TableCell>

                    {showUpdated && (
                      <TableCell
                        className={`${rowPadding} pr-4 whitespace-nowrap ${SECONDARY_COLUMN}`}
                      >
                        {/* Relative, like Age, and from the same helper — a
                            column of absolute timestamps next to a column of
                            "9h" is two units to hold at once. */}
                        <span
                          title={formatTimestamp(finding.updatedAt)}
                          className="tabular-nums text-typography-700"
                        >
                          {formatAge(
                            // Fractional days, and clamped: `formatAge` derives
                            // hours from the fraction, so flooring here would
                            // print "now" for everything under a day, and clock
                            // skew would otherwise print a negative age.
                            Math.max(0, (Date.now() - updatedAt(finding)) / 86_400_000),
                          )}
                        </span>
                      </TableCell>
                    )}

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
                    {canTriage && (
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
                    )}
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

          {/* One line, not four. This footer used to stack the result count, the
              window notice and a shortcuts hint as three paragraphs of
              micro-copy under every table — permanent chrome that said nothing
              new after the first read. The count and the window caveat are one
              sentence now, and the shortcuts hint is gone: there is a "Keyboard"
              button at the top of this section and `?` opens the same sheet from
              anywhere on the page. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-xs text-typography-600" aria-live="polite">
              {view.matched === 1
                ? en.bugHunter.resultSummaryOne
                : en.bugHunter.resultSummary
                    .replace("{shown}", String(view.rows.length))
                    .replace("{matched}", String(view.matched))}
              {view.windowed && (
                <span className="text-typography-500">
                  {" · "}
                  {en.bugHunter.windowNotice
                    .replace("{loaded}", String(view.loaded))
                    .replace("{total}", String(view.total))}
                </span>
              )}
            </p>

            <div className="flex items-center gap-3">
              {/* Beside the pager rather than up with the filters: it changes
                  how the results are paginated, not which results there are. */}
              <label
                htmlFor="bug-findings-page-size"
                className="flex items-center gap-1.5 text-xs text-typography-600"
              >
                {en.bugHunter.pageSizeLabel}
                <select
                  id="bug-findings-page-size"
                  value={pageSize}
                  onChange={event => setPageSize(Number(event.target.value) as PageSize)}
                  className="rounded border border-border-light bg-white px-1.5 py-0.5 text-xs text-typography-900 cursor-pointer"
                >
                  {PAGE_SIZES.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

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
          <BugFindingDrawer id={selectedId} onClose={() => setBug(null)} canTriage={canTriage} />
        </ErrorBoundary>
      )}
    </div>
  );
};
