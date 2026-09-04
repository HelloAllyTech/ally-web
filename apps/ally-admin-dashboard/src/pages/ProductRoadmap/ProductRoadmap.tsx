import React, { useMemo, useState } from "react";

import {
  BugReportIcon,
  LightbulbGuidedIcon,
  LightbulbIcon,
  RoadmapSettingsIcon,
  TriangleIcon,
} from "@icons";
import { useSearchParams } from "react-router-dom";

import { CarbonDropdown, Tabs, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetBugFindingsQuery,
  useGetRoadmapBoardQuery,
  useGetRoadmapVoteBudgetQuery,
  useGetRoadmapFacetsQuery,
  useGetRoadmapInterviewNotesQuery,
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapProductGoalsQuery,
} from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import {
  RoadmapBoardGroupBy,
  RoadmapBoardLayout,
  RoadmapBoardQuery,
  RoadmapOpportunitiesQuery,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapViewState,
} from "@types";

import { AddOpportunityDrawer } from "./AddOpportunityDrawer";
import { BugsTab } from "./BugsTab";
import { BuilderSessionDrawer } from "./BuilderSessionDrawer";
import { InterviewsTab } from "./InterviewsTab";
import { MonthBoard } from "./MonthBoard";
import { OpportunitiesBoard } from "./OpportunitiesBoard";
import { OpportunitiesListView } from "./OpportunitiesListView";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { OpportunityInterviewDrawer } from "./OpportunityInterviewDrawer";
import { ReportBugModal } from "./ReportBugModal";
import { RoadmapSettingsDrawer } from "./RoadmapSettingsDrawer";
import { RoadmapSortControl } from "./RoadmapSortControl";
import { SavedViewTabs } from "./SavedViewTabs";
import { useProductRoadmapRealtime } from "./useProductRoadmapRealtime";
import { useSavedViews } from "./useSavedViews";
import { canManageRoadmap } from "./utils/access";
import { seedForHandle } from "./utils/builder";
import { EMPTY_ADVANCED_FILTERS, RoadmapAdvancedFilterValues } from "./utils/filters";
import { RoadmapEffortFilterValue } from "./utils/filterSelection";
import { monthKeyOf, shiftMonthKey } from "./utils/monthBoard";
import {
  QUEUE_VIEW_ID,
  QUEUE_VIEW_STATE,
  normaliseSortField,
  normaliseTypeFilter,
} from "./utils/views";

/** One page of the TABLE layout, which walks `offset`. */
const PAGE_SIZE = 50;

/**
 * How many cards the LIST feed loads at once — its opening depth and its "Load more" step.
 *
 * Deliberately NOT the table's page size, which it used to share. The two are different reading
 * modes: the table is walked a page at a time and 200 rows to a page defeats the pager, while the
 * feed is SCROLLED, so a shallow first load just means hitting a button to carry on reading. At
 * 50 the queue ran out four times before reaching the tail.
 *
 * Bounded by LIST_MAX_LOADED / ROADMAP_LIST_DEFAULTS.MAX_LIMIT (500), which the server clamps to
 * silently — 200 sits inside it and reaches the ceiling in two more presses.
 */
const FEED_PAGE_SIZE = 200;

/**
 * Default month window: one back, four forward. Mirrors ROADMAP_BOARD_DEFAULTS in ally-be — the
 * backend defaults the same way when `from`/`to` are omitted, and the client computes it too so
 * the window stepper has something concrete to step FROM on first render.
 */
const WINDOW_MONTHS_BACK = 1;
const WINDOW_MONTHS_FORWARD = 4;

const defaultWindow = () => {
  const current = monthKeyOf(new Date());
  return {
    from: shiftMonthKey(current, -WINDOW_MONTHS_BACK),
    to: shiftMonthKey(current, WINDOW_MONTHS_FORWARD),
  };
};

/**
 * The board's grouping options, in display order.
 *
 * "Planned month", not "Month" — it is the field the lanes write (`plannedMonth`), and beside
 * "Filed by" a bare "Month" could as easily mean the month a thing was filed.
 *
 * "Filed by" matches the table's "Filed" column and the source filter's wording. Its lanes are
 * read-only — see laneSupportsMoving — because who filed an opportunity is history, not an
 * assignment; the other four groupings each drag-edit the column they lane by.
 */
const GROUP_BY_OPTIONS: { value: RoadmapBoardGroupBy; label: string }[] = [
  { value: RoadmapBoardGroupBy.PRODUCT_GOAL, label: "Product goal" },
  { value: RoadmapBoardGroupBy.MONTH, label: "Planned month" },
  { value: RoadmapBoardGroupBy.OWNER, label: "Owner" },
  { value: RoadmapBoardGroupBy.CREATED_BY, label: "Filed by" },
  { value: RoadmapBoardGroupBy.STAGE, label: "Stage" },
];

/**
 * Top-level tabs, deep-linked via ?tab= so a shared link lands where the sender was.
 *
 * "release-notes" was removed when that feature was deprecated in favour of the automated
 * changelog. No redirect is needed: `isTabAvailable` below already treats any unrecognised
 * ?tab= as "show the board", so an old bookmark lands on Opportunities rather than a dead tab.
 */
enum RoadmapTab {
  /**
   * The pipeline, promoted out of the saved-view strip to sit beside Opportunities.
   *
   * DERIVED, NOT A `?tab=` VALUE. Queue-ness still lives in `?view=queue`, exactly as it did when
   * this was a pseudo-view, so every existing shared link keeps working and the landing logic in
   * useSavedViews (absent `?view=` resolves to the queue) needs no change. This id names the tab
   * in the strip; the URL never carries `tab=queue`. Keeping ONE source of truth is the point —
   * a separate `?tab=queue` could disagree with `?view=`, and there would be no right answer for
   * `?tab=opportunities&view=queue`.
   */
  QUEUE = "queue",
  OPPORTUNITIES = "opportunities",
  INTERVIEWS = "interviews",
  /** Bug Hunter's table, read-only. See BugsTab for why it is mirrored here. */
  BUGS = "bugs",
}

/**
 * The Product Roadmap board — a vote-based prioritisation surface, rebuilt from the standalone
 * `sandeep-roadmap-app`.
 *
 * PERMISSION MODEL (three tiers, not a role gate):
 *   VIEW  — reach the tab and read everything. The route gate.
 *   VOTE  — file an opportunity, cast votes, comment, keep saved views.
 *   EDIT  — manage: stages, editing/deleting anyone's opportunity, taxonomy, split/merge,
 *           month-board lane moves, opening a Builder session, pinning views.
 * VIEW and VOTE come from the permission set every platform admin carries. EDIT is the
 * permission AND the `product_roadmap_manage` feature toggle — see `canManage` below. Every
 * manage affordance is hidden behind that flag, and the backend rejects it independently, so
 * hiding it is a courtesy rather than the enforcement.
 *
 * URL is the state store for what should survive a refresh or a shared link:
 *   ?tab=<id>          selects the top-level tab
 *   ?opportunity=<id>  opens the detail drawer (replaces the source's /opportunity/[id] page)
 */
export const ProductRoadmap: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions, features, user } = useUser();

  const canVote = !!permissions?.includes(Permissions.VOTE_PRODUCT_ROADMAP);
  /**
   * The permission AND the `product_roadmap_manage` toggle — see canManageRoadmap for why the
   * permission alone stopped meaning anything, and for the fail-closed rule.
   */
  const canManage = canManageRoadmap(permissions, features);
  /**
   * Whether the Bugs tab exists for this reader.
   *
   * VIEW_PRODUCT_ROADMAP, which is the same permission the route gate already
   * required to render this page — so in practice the tab is unconditional, and
   * this reads as documentation of the rule rather than as a branch.
   *
   * It was briefly the BUG_HUNTER toggle instead, mirroring what
   * `GET /v1/bug-hunter/findings` enforced at the time. That endpoint is now
   * gated on VIEW_PRODUCT_ROADMAP too, so the tab and the data behind it agree;
   * keeping the toggle here would hide a tab the server would happily serve.
   * Naming the permission rather than deleting the check keeps the two sides
   * greppable as one rule — if ally-be ever narrows that endpoint, this is the
   * line that has to move with it.
   */
  const canViewBugs = !!permissions?.includes(Permissions.VIEW_PRODUCT_ROADMAP);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RoadmapOpportunityType[]>([]);
  const [stageFilter, setStageFilter] = useState<RoadmapOpportunityStage[]>([]);
  const [sourceFilter, setSourceFilter] = useState<RoadmapOpportunitySource[]>([]);
  const [effortFilter, setEffortFilter] = useState<RoadmapEffortFilterValue[]>([]);
  const [goalFilter, setGoalFilter] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  /** Creator + the three range filters, grouped so one setter drives the whole panel. */
  const [advanced, setAdvanced] = useState<RoadmapAdvancedFilterValues>({
    ...EMPTY_ADVANCED_FILTERS,
  });
  /**
   * Composite is the default: vote count alone answers "what is most wanted", which is not the
   * same question as "what should we do next". The raw vote ordering stays one click away in the
   * sort control, so the composite can always be checked against the signal it was built from.
   */
  const [sortBy, setSortBy] =
    useState<NonNullable<RoadmapOpportunitiesQuery["sortBy"]>>("composite");
  const [order, setOrder] = useState<"ASC" | "DESC">("DESC");
  const [isAddOpen, setIsAddOpen] = useState(false);
  /** The guided interview (the spark-bulb icon). Manage-gated; see the header button. */
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);
  /**
   * The one admin surface: product goals, strategy & ranking and merge, as tabs in a drawer.
   *
   * Was three booleans for three header glyphs. Which panel is showing is the drawer's own state
   * — the page opens it, it decides where you land.
   */
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  /**
   * Whether the vote budget is expanded. Collapsed by default, per the header being a place for
   * actions rather than a permanent readout.
   *
   * Page-local and NOT persisted: it costs one click to reopen, and a remembered-collapsed state
   * is how someone casting votes loses their running total without remembering they hid it.
   */
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  /** Offset pagination, PAGE_SIZE rows at a time. See resetPaging for the invalidation rule. */
  const [offset, setOffset] = useState(0);
  /**
   * How many rows the LIST view has loaded. It uses "Load more" rather than pages, so it grows a
   * limit from the top instead of walking `offset` — kept separate from `offset` so switching
   * layout back to the table does not inherit a 200-row limit as a page size.
   */
  const [listLoaded, setListLoaded] = useState(FEED_PAGE_SIZE);
  /**
   * Table, month board, or the single-column list feed. Table stays the default: it is the
   * layout every saved view was written against, and a view with no `layout` key must open the
   * way it always has.
   */
  const [layout, setLayout] = useState<RoadmapBoardLayout>(RoadmapBoardLayout.TABLE);
  /** The month board's window. Page-level so the layout toggle doesn't reset it. */
  const [monthWindow, setMonthWindow] = useState(defaultWindow);
  /**
   * What the board's lanes are. Month stays the default — it is the board every saved view was
   * written against, and a view with no grouping recorded must open the way it always has.
   */
  const [groupBy, setGroupBy] = useState<RoadmapBoardGroupBy>(RoadmapBoardGroupBy.MONTH);

  /**
   * Every search / filter / sort change returns to the first page.
   *
   * An offset only means something against the result set it was taken from: keeping offset 150
   * while switching to a filter that matches 12 rows renders an empty table that looks like a
   * broken filter. Wrapping the setters rather than resetting in an effect keeps it to ONE
   * render, so we never fire a throwaway request at the stale offset first.
   */
  const resetPaging = () => {
    setOffset(0);
    // Load-more accumulates, so a filter change has to collapse it back to one slice or the new
    // result set arrives pre-expanded to whatever depth the last one was read to.
    setListLoaded(FEED_PAGE_SIZE);
  };

  const withPagingReset =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value);
      resetPaging();
    };

  /**
   * ONE memoised query-arg object, used by BOTH the list subscription and useSetVotes.
   * They must be referentially the same value or the optimistic cache patch silently targets a
   * non-existent entry — see the docblock on useSetVotes.
   */
  /**
   * List is row-oriented like the table, but reads from the top with "Load more" rather than
   * paging — declared up here because listArgs below branches on it.
   */
  const isList = layout === RoadmapBoardLayout.LIST;

  const listArgs = useMemo<RoadmapOpportunitiesQuery>(
    () => ({
      search: search.trim() || undefined,
      type: typeFilter.length ? typeFilter : undefined,
      stage: stageFilter.length ? stageFilter : undefined,
      source: sourceFilter.length ? sourceFilter : undefined,
      effort: effortFilter.length ? effortFilter : undefined,
      productGoal: goalFilter.length ? goalFilter : undefined,
      owner: ownerFilter.length ? ownerFilter : undefined,
      createdBy: advanced.createdBy.length ? advanced.createdBy : undefined,
      // Empty string means "no bound" — sending it would fail @IsISO8601 / @IsInt.
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      releasedFrom: advanced.releasedFrom || undefined,
      releasedTo: advanced.releasedTo || undefined,
      priorityMin: advanced.priorityMin === "" ? undefined : Number(advanced.priorityMin),
      priorityMax: advanced.priorityMax === "" ? undefined : Number(advanced.priorityMax),
      sortBy,
      order,
      // The LIST view reads from the top and grows (Load more); the table pages. One query serves
      // both, so the shape of the request depends on which layout is on screen — and because
      // they are different cache entries, switching layout does not refetch the other one.
      limit: isList ? listLoaded : PAGE_SIZE,
      offset: isList ? 0 : offset,
    }),
    [
      search,
      typeFilter,
      stageFilter,
      sourceFilter,
      effortFilter,
      goalFilter,
      ownerFilter,
      advanced,
      sortBy,
      order,
      isList,
      listLoaded,
      offset,
    ],
  );

  /**
   * The month board's args — the same filters, minus sort and offset, plus the month window.
   *
   * Derived from `listArgs` rather than rebuilt, so the two layouts cannot drift on how a filter
   * is normalised (empty string vs undefined is the one that bites: sending "" fails @IsISO8601).
   * Memoised for the same reason listArgs is — useSetVotes and the drag mutation both patch
   * this exact cache entry, and a fresh object each render would patch one nobody is rendering.
   */
  const boardArgs = useMemo<RoadmapBoardQuery>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sortBy: _sortBy, order: _order, limit: _limit, offset: _offset, ...filters } = listArgs;
    // from/to ride along on every grouping; the server ignores them unless grouping by month.
    // Kept in the args rather than stripped so switching grouping and back does not lose the
    // window the user had stepped to.
    return { ...filters, groupBy, from: monthWindow.from, to: monthWindow.to };
  }, [groupBy, listArgs, monthWindow]);

  const isBoard = layout === RoadmapBoardLayout.BOARD;

  const { data, isLoading, isFetching } = useGetRoadmapOpportunitiesQuery(listArgs, {
    // Don't hold a subscription to the layout that isn't on screen: it would refetch the table on
    // every socket invalidation while the user is looking at the board. Table and List share this
    // one subscription — they are the same query, just rendered differently.
    skip: isBoard,
  });
  const {
    data: boardData,
    isLoading: isBoardLoading,
    isFetching: isBoardFetching,
  } = useGetRoadmapBoardQuery(boardArgs, { skip: !isBoard });

  const boardCount = boardData ? boardData.lanes.reduce((sum, lane) => sum + lane.total, 0) : 0;
  const { data: budget } = useGetRoadmapVoteBudgetQuery();
  const { data: goals } = useGetRoadmapProductGoalsQuery();
  const { data: facets } = useGetRoadmapFacetsQuery();
  // Counts only — the tab bodies own their own data. Cheap, and the tab strip needs them.
  const { data: interviews } = useGetRoadmapInterviewNotesQuery({ limit: 1 });
  /**
   * Count only, and skipped entirely without the toggle — the same shape as the
   * two above. `limit: 1` rather than the table's `limit: 100`: this fires on
   * every visit to the page including the ones that never open the Bugs tab, and
   * the tab's own table opens its own (shared, polled) window when it mounts.
   */
  const { data: bugs } = useGetBugFindingsQuery(
    { status: "all", limit: 1 },
    { skip: !canViewBugs },
  );

  /*
   * Counts for the two Opportunities-family tabs.
   *
   * The strip's Opportunities count reflects WHAT IS ON SCREEN — the board's lane totals, or the
   * filtered table count — which is right while that tab is the one you are looking at and wrong
   * the moment it isn't. Splitting Queue out made that visible: standing on the Queue, `data` is
   * the queue's own query, so an unguarded Opportunities count would have read 159 rather than
   * the 432 it holds.
   *
   * So each entry falls back to its own count when it is not the active one. `limit: 1` — these
   * fire on every visit and only the `count` is read, the same shape as the two above.
   */
  const { data: queueTotal } = useGetRoadmapOpportunitiesQuery({
    stage: QUEUE_VIEW_STATE.stageFilter,
    limit: 1,
  });
  const { data: opportunitiesTotal } = useGetRoadmapOpportunitiesQuery({ limit: 1 });

  const openOpportunityId = searchParams.get("opportunity");
  const activeViewId = searchParams.get("view");
  /** Queue is a pseudo-view (see QUEUE_VIEW_ID) that is defined as a list, not a filter preset. */
  const isQueueView = activeViewId === QUEUE_VIEW_ID;
  /**
   * The Builder session on screen, in the URL for the same reason the opportunity drawer is:
   * a refresh or a shared link should land back on the conversation.
   */
  const openBuilderSessionId = searchParams.get("builder");
  /**
   * The opening brief, held in STATE and never in the URL.
   *
   * It is a multi-paragraph blob, so it would be an unusable query string — and it is
   * single-use: only a session created seconds ago has an empty transcript to seed. A refresh
   * drops it, which is correct, because by then the turn is already in the transcript.
   */
  const [builderSeed, setBuilderSeed] = useState<string | null>(null);

  const openBuilderSession = (sessionId: string | null, seed: string | null = null) => {
    setBuilderSeed(seed);
    const next = new URLSearchParams(searchParams);
    if (sessionId) next.set("builder", sessionId);
    else next.delete("builder");
    setSearchParams(next, { replace: true });
  };

  const setActiveViewId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("view", id);
    else next.delete("view");
    setSearchParams(next, { replace: true });
  };

  /**
   * Whether the vote icon should blink: votes left to use, and the readout still collapsed.
   *
   * `remaining > 0` rather than "has a budget at all" — someone who has used their whole 100
   * has nothing left to act on, so blinking at them would be motion that never resolves.
   */
  const shouldNudgeVotes = !!budget && budget.remaining > 0 && !isBudgetOpen;

  /** The board's filter/sort state in saved-view shape. Goals are NAMES, per RoadmapViewState. */
  const currentViewState = useMemo<RoadmapViewState>(
    () => ({
      searchQuery: search.trim() || undefined,
      typeFilter,
      stageFilter,
      sourceFilter,
      effortFilter,
      goalFilter,
      ownerFilter,
      // Same key names the standalone app used, so a view saved here and a view migrated from
      // Supabase are the same shape — see RoadmapViewState.
      creatorFilter: advanced.createdBy.map(String),
      dateFrom: advanced.dateFrom || undefined,
      dateTo: advanced.dateTo || undefined,
      releasedFrom: advanced.releasedFrom || undefined,
      releasedTo: advanced.releasedTo || undefined,
      priorityMin: advanced.priorityMin || undefined,
      priorityMax: advanced.priorityMax || undefined,
      sort: { field: sortBy, dir: order === "DESC" ? "desc" : "asc" },
      // Only written when it is NOT the default, so saving a view from the table produces the same
      // state a pre-month-board view has and every existing view stays clean rather than showing a
      // permanent unsaved-changes dot.
      layout: layout === RoadmapBoardLayout.TABLE ? undefined : layout,
    }),
    [
      search,
      typeFilter,
      stageFilter,
      sourceFilter,
      effortFilter,
      goalFilter,
      ownerFilter,
      advanced,
      sortBy,
      order,
      layout,
    ],
  );

  const applyViewState = (state: RoadmapViewState) => {
    setSearch(state.searchQuery ?? "");
    // Normalised, not taken verbatim: a view saved when bugs were still on this
    // board may filter to `["bug"]`, which now matches nothing. See
    // normaliseTypeFilter — the view self-heals on its next autosave.
    setTypeFilter(normaliseTypeFilter(state.typeFilter) as RoadmapOpportunityType[]);
    setStageFilter((state.stageFilter ?? []) as RoadmapOpportunityStage[]);
    // Absent on every view saved before this filter existed — undefined must mean "no filter",
    // not "leave whatever was previously selected", or applying an old view would leave a stale
    // source filter from whatever the user had picked before switching views.
    setSourceFilter((state.sourceFilter ?? []) as RoadmapOpportunitySource[]);
    setEffortFilter((state.effortFilter ?? []) as RoadmapEffortFilterValue[]);
    setGoalFilter(state.goalFilter ?? []);
    setOwnerFilter(state.ownerFilter ?? []);
    // These four keys were previously DROPPED on apply: the board had no controls for them, so a
    // view carrying a date or priority bound applied only partially and looked like it had worked.
    setAdvanced({
      createdBy: (state.creatorFilter ?? []).map(Number).filter(id => Number.isFinite(id)),
      dateFrom: state.dateFrom ?? "",
      dateTo: state.dateTo ?? "",
      releasedFrom: state.releasedFrom ?? "",
      releasedTo: state.releasedTo ?? "",
      priorityMin: state.priorityMin ?? "",
      priorityMax: state.priorityMax ?? "",
    });
    // Migrated views carry the standalone app's field names — see normaliseSortField.
    setSortBy(
      normaliseSortField(state.sort?.field) as NonNullable<RoadmapOpportunitiesQuery["sortBy"]>,
    );
    setOrder(state.sort?.dir === "asc" ? "ASC" : "DESC");
    // Absent on every migrated view and everything saved before month boards, so undefined has to
    // mean TABLE rather than "leave whatever layout is showing" — otherwise selecting an old view
    // while on the board would look like the view had failed to apply.
    setLayout(state.layout ?? RoadmapBoardLayout.TABLE);
    // A saved view is a whole new result set; page 3 of the previous one does not survive it.
    resetPaging();
  };

  /**
   * The Table / Board / List switch.
   *
   * Rendered here and passed down, so all three layouts show the identical control in the
   * identical place — a toggle that moved when you used it would be its own bug.
   *
   * A joined segmented triple rather than separate bordered buttons behind a "View" label: the
   * option names say what each is, so the label was a fourth element earning nothing, and it now
   * shares the one control row instead of occupying a line of its own.
   */
  /**
   * The Queue's toggle is TWO options where the other views get three.
   *
   * List is the queue (QUEUE_VIEW_STATE sets layout: LIST, so every entry to the tab lands
   * there), and Board is the same pipeline laid out in lanes — the queue's stage filter rides
   * along in boardArgs, so the board shows exactly the rows the list does. Table stays off the
   * queue: a sortable grid is the "All opportunities" reading of the data, and offering it here
   * is how the tab stops being a queue. Leaving the tab and coming back lands on List again —
   * the board is a way of looking at the queue, not a new definition of it.
   */
  const layoutToggle = (
    <div className="border-border-light flex items-center border text-sm">
      {(isQueueView
        ? [
            { id: RoadmapBoardLayout.LIST, label: "List" },
            { id: RoadmapBoardLayout.BOARD, label: "Board" },
          ]
        : [
            { id: RoadmapBoardLayout.TABLE, label: "Table" },
            { id: RoadmapBoardLayout.BOARD, label: "Board" },
            { id: RoadmapBoardLayout.LIST, label: "List" },
          ]
      ).map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => setLayout(option.id)}
          aria-pressed={layout === option.id}
          className={`px-2 py-1 ${
            layout === option.id
              ? "bg-primary-50 text-primary-600"
              : "text-typography-secondary hover:text-typography-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  /**
   * What the board groups by. Rendered only ON the board — on the table it would be a control
   * that changes nothing, which reads as broken rather than as inapplicable.
   *
   * A <select> rather than a second segmented row: four options in a row of pills would double
   * the control bar's height for a choice most people make once, and the toggle beside it is
   * already carrying the "which view" question.
   */
  /**
   * What the board groups by. Rendered only ON the board — on the table it would be a control
   * that changes nothing, which reads as broken rather than as inapplicable.
   *
   * History worth keeping, because two wrong answers came first: Carbon's `<Select>` is a native
   * `<select>` wearing Carbon classes and painted no field background in inline mode, so it read
   * as an unstyled browser control; the house `DropdownField` is a real listbox but draws a
   * RIGHT-pointing arrow where a dropdown wants a down chevron. Carbon's `Dropdown` is the one
   * that is actually Carbon.
   */
  /**
   * Merge trigger. Rendered ONCE, in the page header beside "Manage product goals".
   *
   * It is not a table affordance: the drawer searches the whole board, so merging never depended
   * on which layout you were in or which 50 rows were on screen — that is what the old checkbox
   * column required and why it went. Nor is it a toolbar one. It sat in the layout-toggle slot of
   * all three layouts, which meant three copies of the same button whose position shifted with
   * the row of controls beside it, sitting among things you touch every visit (search, filters,
   * layout) rather than among the once-in-a-while admin jobs it belongs with.
   *
   * The header already holds the other one of those — the goal taxonomy — under the same
   * canManage gate, as the same kind of icon-only control with the same tooltip-plus-aria-label
   * treatment. Two admin jobs by the title, one set of controls in the toolbar.
   */
  /**
   * The Queue's sort, and only the Queue's: the table sorts from its own column headers, and
   * the board is ordered by whatever it groups by.
   *
   * ONE labelled disclosure — "Sort: Top rank first" — in place of the collapsed-glyph toolbar
   * that used to sit here (a sort glyph plus goal and owner facets). The two facets are not
   * lost: the Queue now offers the SAME multi-field Filter popover and Dates & score panel as
   * every other layout, where goal and owner sit beside source, filed-by and the ranges — so
   * the one thing left standing on its own is the ordering, which is single-choice and does not
   * belong inside a checkbox popover. See RoadmapSortControl for that argument, and
   * RoadmapFilterBar's `stageLocked` for the part of the old "the Queue hides its filters"
   * policy that was actually right and is kept: stage is the Queue's definition, so it alone is
   * not offered.
   *
   * Changing the ordering resets the loaded depth — a different ordering is a different result
   * set, and keeping 150 rows loaded would show the first 150 of the NEW order, which is not
   * what the reader asked to see.
   *
   * THE RANK IS UNAFFECTED BY SORTING OR FILTERING. queueRank is computed by ally-be in its own
   * subquery over the whole queue, deliberately not sharing the outer WHERE (see QUEUE_RANK_SQL),
   * so filtering to one goal shows #3, #14, #57 — their standing in the queue — rather than
   * renumbering them 1, 2, 3 as though the filtered set were the queue.
   */
  const queueToolbar = isQueueView ? (
    <RoadmapSortControl
      sortBy={sortBy}
      order={order}
      onChange={(nextSortBy, nextOrder) => {
        setSortBy(nextSortBy);
        setOrder(nextOrder);
        resetPaging();
      }}
    />
  ) : null;

  const groupByPicker = isBoard ? (
    /*
      Same component as the sort picker above — one page should not carry two different dropdown
      styles. See there for why this is Carbon's Dropdown rather than the house DropdownField.
    */
    <CarbonDropdown
      id="roadmap-group-by"
      type="inline"
      size="sm"
      titleText="Group by"
      label="Group the board"
      items={GROUP_BY_OPTIONS}
      itemToString={item => item?.label ?? ""}
      selectedItem={GROUP_BY_OPTIONS.find(o => o.value === groupBy) ?? GROUP_BY_OPTIONS[0]}
      onChange={({ selectedItem }) => {
        if (selectedItem) setGroupBy(selectedItem.value);
      }}
    />
  ) : null;

  // Live updates. Gated on VIEW so the socket stays closed rather than connecting and being
  // rejected by the gateway's permission middleware.
  useProductRoadmapRealtime({
    currentUserId: user?.id,
    openOpportunityId,
    enabled: !!permissions?.includes(Permissions.VIEW_PRODUCT_ROADMAP),
  });

  const savedViews = useSavedViews({
    current: currentViewState,
    onApply: applyViewState,
    activeViewId,
    setActiveViewId,
    canVote,
    canManage,
    currentUserId: user?.id,
  });

  const requestedTab = searchParams.get("tab") as RoadmapTab | null;
  const isTabAvailable = (tab: RoadmapTab | null): tab is RoadmapTab =>
    !!tab &&
    Object.values(RoadmapTab).includes(tab) &&
    // QUEUE is derived from `?view=`, never read off `?tab=` — see the enum. A pasted
    // `?tab=queue` is therefore an unrecognised tab and falls back to Opportunities, the same
    // way the retired `?tab=release-notes` does.
    tab !== RoadmapTab.QUEUE &&
    // A pasted `?tab=bugs` from someone who holds the toggle must fall back for
    // someone who doesn't, rather than selecting a tab with no strip entry —
    // which would render the page with no tab underlined and no body.
    (tab !== RoadmapTab.BUGS || canViewBugs);
  /**
   * Queue and Opportunities are the same `?tab=` value split into two strip entries by which
   * view is applied. Queue-ness only overrides Opportunities — a reader on Bugs or User
   * Interviews with `?view=queue` still in the URL stays where they are, and finds the Queue
   * waiting when they come back.
   */
  const baseTab = isTabAvailable(requestedTab) ? requestedTab : RoadmapTab.OPPORTUNITIES;
  const activeTab =
    baseTab === RoadmapTab.OPPORTUNITIES && isQueueView ? RoadmapTab.QUEUE : baseTab;
  /** Both strip entries render the same body; only the applied view differs. */
  const isOpportunitiesTab =
    activeTab === RoadmapTab.OPPORTUNITIES || activeTab === RoadmapTab.QUEUE;

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    /*
     * Queue and Opportunities differ by VIEW, not by tab, so selecting either writes
     * `tab=opportunities` and moves `?view=` instead — and does it in ONE setSearchParams.
     *
     * That is not a tidy-up. savedViews.selectView writes the view param from its own closure
     * over `searchParams`; calling it after a setSearchParams here would rebuild the query
     * string from the same stale base and drop the tab change on the floor. So the param write
     * happens once, here, and applyViewState is called directly for the half selectView does
     * that this cannot: applying the filters, layout and sort.
     */
    if (id === RoadmapTab.QUEUE || id === RoadmapTab.OPPORTUNITIES) {
      const toQueue = id === RoadmapTab.QUEUE;
      next.set("tab", RoadmapTab.OPPORTUNITIES);
      if (toQueue) next.set("view", QUEUE_VIEW_ID);
      // Leaving Queue lands on "All" — the sibling default in the strip below — rather than on
      // whichever saved view happened to be applied last, which the reader cannot see from here.
      else next.delete("view");
      next.delete("opportunity");
      next.delete("bug");
      setSearchParams(next, { replace: true });
      applyViewState(toQueue ? QUEUE_VIEW_STATE : {});
      return;
    }
    next.set("tab", id);
    // A drawer belongs to the tab that opened it; leaving one open across a tab
    // switch is confusing. `bug` is the Bugs tab's equivalent of `opportunity`
    // — BugFindingsTable reads it out of this same query string.
    next.delete("opportunity");
    next.delete("bug");
    setSearchParams(next, { replace: true });
  };

  const openOpportunity = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("opportunity", id);
    else next.delete("opportunity");
    setSearchParams(next, { replace: true });
  };

  const toggleSort = (field: NonNullable<RoadmapOpportunitiesQuery["sortBy"]>) => {
    if (field === sortBy) {
      setOrder(prev => (prev === "DESC" ? "ASC" : "DESC"));
    } else {
      setSortBy(field);
      // A newly-chosen column starts descending: for scores and dates that is what people mean.
      setOrder("DESC");
    }
    // Re-sorting reshuffles which rows land on which page, so page 3 is meaningless afterwards.
    resetPaging();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* The title row carries the vote balance inline. It used to spend four lines on a bordered
          card plus a two-line paragraph explaining the vote economy — standing instructions that
          every returning voter has already read, above a board where the first row of data started
          roughly 900px down the page. The rule that actually has a consequence (unused votes
          lapse) is not deleted, just moved into the help tooltip, per the tooltip convention in
          ally-web/CLAUDE.md. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-typography-primary text-2xl font-primary">Product Roadmap</h1>
        {/* items-CENTER, not baseline. This row is a vote icon and three buttons; an icon has no
            baseline to align to, so baseline alignment left the (now 40px) badge sitting off
            from the buttons beside it. Centring is what a row of controls wants anyway. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* The vote budget, collapsed to its icon.
              It expands IN PLACE rather than into a popover: the numbers push the two buttons
              along rather than covering anything, so nothing is hidden behind it and there is
              no dismiss behaviour to get wrong.

              The icon keeps its tooltip while collapsed, so the control is not a mystery glyph
              — hovering says what it is, clicking shows the numbers. */}
          {budget && (
            <div className="text-typography-secondary flex items-center gap-1.5 text-sm">
              <Tooltip
                label={
                  isBudgetOpen
                    ? `Your votes for ${budget.periodKey}. Use them on what matters most — votes go to new opportunities only, and anything unspent lapses at the start of next month.`
                    : `${budget.remaining} of ${budget.votesPerMonth} votes left this month. Click for detail.`
                }
                align="bottom"
              >
                <button
                  type="button"
                  onClick={() => setIsBudgetOpen(open => !open)}
                  aria-expanded={isBudgetOpen}
                  aria-label={`Vote budget: ${budget.remaining} of ${budget.votesPerMonth} left`}
                  // Bare, and sized by its glyph — the SAME className the two icon buttons to
                  // the right carry, so the three read as one row of icons. It used to be a
                  // 40px outlined square, which made the leftmost of three peers the only one
                  // with a box around it and set it a size apart from the other two.
                  className="text-typography-secondary hover:text-primary-500 inline-flex cursor-pointer items-center"
                >
                  {/* An outlined triangle — see TriangleIcon in @icons for why the underlying
                      Material Symbol is called "change_history" and why it is not the solid
                      "arrow_drop_up".

                      Third glyph here. "vertical_align_top" described the EFFECT of a vote (it
                      moves a thing up the queue) and read as a sort or scroll-to-top control;
                      a thumb read as an approval on a single item rather than as a running
                      balance. The triangle is the quietest of the three, which suits a control
                      whose job is to sit still until you have votes left to spend.

                      Kept primary-500 while its two neighbours are grey. The outline that this
                      colour used to match is gone, but the blue is doing separate work: this is
                      the only one of the three that BLINKS as a nudge, and a nudge that resolves
                      to the same grey as the buttons around it is not one.

                      SIZED BY THE `size` PROP, not by a text-[Npx] class. materialSymbol writes
                      font-size as an INLINE style from `size ?? width ?? height ?? 16`, and an
                      inline style beats a class — so the `text-[22px]` that used to sit here was
                      dead, and the glyph had been rendering at the 16px default the whole time
                      while its neighbours were 20. Measured in the DOM: 16x16 against their
                      20x20.

                      Weight comes from `.material-symbols-outlined` (FILL 0 / wght 100 /
                      GRAD -25 / opsz 24) in styles.css, shared with the two icons beside it so
                      the row is one weight. The symbol must also be listed in index.html's
                      `icon_names` subset or it renders as the words "change_history".

                      The ICON is what blinks now that the badge is gone, and only while there
                      are votes left AND the readout is collapsed — once the number is on screen
                      the nudge has nothing left to say. Reuses the config's existing fadeInOut
                      token rather than adding a keyframe for one icon.

                      motion-reduce:animate-none is not optional. This is indefinitely blinking
                      content, which WCAG 2.2.2 treats as something the user must be able to
                      stop — honouring the OS reduced-motion setting is that mechanism. */}
                  <TriangleIcon
                    size={20}
                    className={`text-primary-500 ${
                      shouldNudgeVotes ? "animate-fadeInOut motion-reduce:animate-none" : ""
                    }`}
                  />
                </button>
              </Tooltip>

              {isBudgetOpen && (
                <>
                  <span className="text-typography-primary tabular-nums text-base">
                    {budget.remaining}
                    <span className="text-typography-secondary"> / {budget.votesPerMonth}</span>
                  </span>
                  <span className="whitespace-nowrap">votes left · {budget.used} used</span>
                </>
              )}
            </div>
          )}

          {/*
            Both header actions are ICONS now, matching the coin readout beside them and the
            goal-taxonomy flag by the title — this header is a row of icons, and two filled
            buttons in it were carrying more weight than "file a thing" and "report a thing"
            deserve next to a 159-row queue.

            Icon-only means each MUST carry a tooltip AND an aria-label, per the tooltip
            convention in ally-web/CLAUDE.md: without them these are two unlabelled glyphs.
            align="bottom" on both because a tooltip pointing up from the page header renders
            off-screen — the same reason the coin readout's does.

            Order and gating are unchanged: new-opportunity first (the common case) and
            VOTE-gated; report-a-bug second and deliberately ungated, since filing a bug is not
            voting and the endpoint behind it accepts any logged-in user.
          */}
          {canVote && (
            <Tooltip label="New opportunity" align="bottom">
              <button
                type="button"
                aria-label="New opportunity"
                onClick={() => setIsAddOpen(true)}
                className="text-typography-secondary hover:text-primary-500 inline-flex cursor-pointer items-center"
              >
                {/* A lightbulb, not a plus: every opportunity is badged "Idea", and the plus
                    said "add a row" where this says what kind of thing gets added.

                    The Material Symbol rather than Carbon's `Idea`. Carbon icons are filled
                    paths with no weight to turn down, so beside a `wght 100` symbol they read
                    as a heavier family — which is exactly what this row looked like. */}
                <LightbulbIcon size={20} />
              </button>
            </Tooltip>
          )}

          {/*
            The GUIDED door, immediately right of the blank one so the pair reads as two ways
            into the same act rather than two features. Manage-gated while the interview is
            experimental — see the route's docblock in roadmap-admin.controller.ts — so most
            people who can file still see exactly one way to do it.
          */}
          {canManage && (
            <Tooltip label="New opportunity, guided" align="bottom">
              <button
                type="button"
                aria-label="New opportunity, guided by an interview"
                onClick={() => setIsInterviewOpen(true)}
                className="text-typography-secondary hover:text-primary-500 inline-flex cursor-pointer items-center"
              >
                <LightbulbGuidedIcon size={20} />
              </button>
            </Tooltip>
          )}

          <Tooltip label="Report a bug" align="bottom">
            <button
              type="button"
              aria-label="Report a bug"
              onClick={() => setIsReportBugOpen(true)}
              className="text-typography-secondary hover:text-primary-500 inline-flex cursor-pointer items-center"
            >
              {/* Material Symbols DOES ship a bug glyph, so this is `bug_report` rather than the
                  Carbon stand-in `Debug` the note in @icons describes — and it matches the weight
                  of the two symbols beside it, which the Carbon one could not. */}
              <BugReportIcon size={20} />
            </button>
          </Tooltip>

          {/* ONE gear for the four admin jobs — product goals, strategy & ranking, merge, split
              — which are tabs inside it now. See RoadmapSettingsDrawer for why they are tabs
              rather than one form, and why one entry point beats three header glyphs plus a
              permanent Split column on the table.

              LAST, and in this row rather than beside the title. It sat next to the h1 while it
              was one of three admin glyphs that had nowhere else to be; as a single control it
              belongs with the other header actions, which is also the only place its hover and
              its 20px sizing agree with anything. Rightmost because a gear conventionally is,
              and because it keeps the two "file a thing" actions adjacent instead of splitting
              them around an admin control most readers cannot see.

              A Material Symbol at the same `wght 100` as the three glyphs beside it — see
              RoadmapSettingsIcon in @icons. The Carbon `Settings` is a filled path with no
              weight to turn down and read heavier than its neighbours, which is the whole
              reason this row is symbols and not Carbon icons.

              The scales glyph it replaced was materialSymbol("balance"), and "balance" was
              never added to index.html's `icon_names` subset, so it had been rendering as the
              literal word BALANCE beside the page title. "settings" was added to that list in
              the same change; without it this would fail the identical way.

              Icon-only means it MUST carry both a tooltip and an aria-label, per the tooltip
              convention in ally-web/CLAUDE.md. align="bottom" like every tooltip in this row,
              because one pointing up from the page header renders off-screen. */}
          {canManage && (
            <Tooltip label="Roadmap settings" align="bottom">
              <button
                type="button"
                aria-label="Roadmap settings: product goals, strategy and ranking, merge, split"
                onClick={() => setIsSettingsOpen(true)}
                className="text-typography-secondary hover:text-primary-500 inline-flex cursor-pointer items-center"
              >
                <RoadmapSettingsIcon size={20} />
              </button>
            </Tooltip>
          )}
        </div>
      </header>

      <Tabs
        items={[
          // FIRST. The queue is the pipeline people come here to work through; "All
          // opportunities" — every row, shipped and archived included — is the reference behind
          // it.
          // Promoted out of the saved-view strip below, where it sat as a pseudo-view.
          {
            id: RoadmapTab.QUEUE,
            label: "Queue",
            count: activeTab === RoadmapTab.QUEUE ? (data?.count ?? 0) : (queueTotal?.count ?? 0),
          },
          {
            id: RoadmapTab.OPPORTUNITIES,
            // "All opportunities", not "Opportunities": with the Queue promoted alongside it,
            // the bare noun read as the section both tabs belong to rather than as the sibling
            // of the Queue — and the distinction that matters between them is scope. The Queue
            // is the working subset; this is every row, shipped and archived included.
            label: "All opportunities",
            // While THIS tab is the active one the count reflects what is on screen: on the board
            // the sum of the lane totals, which is exactly the number of cards the board shows
            // across the current window plus Unscheduled — not the whole table's count, because
            // the board deliberately only covers a month window. Standing anywhere else, `data`
            // belongs to another tab's query, so fall back to this tab's own total.
            count:
              activeTab === RoadmapTab.OPPORTUNITIES
                ? isBoard
                  ? boardCount
                  : (data?.count ?? 0)
                : (opportunitiesTotal?.count ?? 0),
          },
          // SECOND, and conditional. Second because what is broken is read as often as what is
          // planned — the two together are the picture someone deciding next month needs, and
          // burying bugs behind research put the least-visited tab in the more reachable slot.
          // (This was deliberately last once, on the argument that bugs are context rather than
          // a kind of roadmap item. That ordering lost; the reachability argument won.)
          ...(canViewBugs
            ? [
                {
                  id: RoadmapTab.BUGS,
                  label: "Bugs",
                  count: bugs?.count ?? 0,
                },
              ]
            : []),
          {
            id: RoadmapTab.INTERVIEWS,
            label: "User Interviews",
            count: interviews?.count ?? 0,
          },
        ]}
        activeId={activeTab}
        onChange={setTab}
      />

      {activeTab === RoadmapTab.INTERVIEWS && (
        <InterviewsTab canVote={canVote} canManage={canManage} currentUserId={user?.id} />
      )}

      {/* `canViewBugs` is already folded into `activeTab`, so this cannot mount
          without the toggle — but the table polls every 15s once mounted, so
          the guard is worth being explicit about rather than implied. */}
      {activeTab === RoadmapTab.BUGS && canViewBugs && <BugsTab />}

      {/* Saved-view sub-tabs sit between the top-level strip and the board, so the hierarchy
          reads top-down: section → view → rows.

          NOT rendered on the Queue. The Queue is one fixed view with no alternatives to offer, so
          a strip whose only purpose is switching between views would sit there with nothing in it
          that applies — and "All" one row under a Queue tab invites the reading that it means
          "all of the queue". */}
      {activeTab === RoadmapTab.OPPORTUNITIES && (
        <SavedViewTabs
          views={savedViews.views}
          activeViewId={activeViewId}
          isDirty={savedViews.isDirty}
          isOwner={savedViews.isOwner}
          canReorder={savedViews.canReorder}
          canPin={savedViews.canPin}
          canSave={canVote}
          onSelect={savedViews.selectView}
          onCreateView={savedViews.createNewView}
          onRename={savedViews.renameView}
          onTogglePinned={savedViews.togglePinned}
          onDelete={savedViews.removeView}
          onReorder={savedViews.reorderViews}
        />
      )}

      {isOpportunitiesTab && isBoard && (
        <MonthBoard
          showFilters
          stageLocked={isQueueView}
          groupBy={groupBy}
          boardArgs={boardArgs}
          data={boardData}
          isLoading={isBoardLoading}
          isFetching={isBoardFetching}
          budget={budget}
          goals={goals ?? []}
          facets={facets}
          search={search}
          onSearchChange={withPagingReset(setSearch)}
          typeFilter={typeFilter}
          onTypeFilterChange={withPagingReset(setTypeFilter)}
          stageFilter={stageFilter}
          onStageFilterChange={withPagingReset(setStageFilter)}
          sourceFilter={sourceFilter}
          onSourceFilterChange={withPagingReset(setSourceFilter)}
          effortFilter={effortFilter}
          onEffortFilterChange={withPagingReset(setEffortFilter)}
          goalFilter={goalFilter}
          onGoalFilterChange={withPagingReset(setGoalFilter)}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={withPagingReset(setOwnerFilter)}
          advanced={advanced}
          onAdvancedChange={withPagingReset(setAdvanced)}
          canVote={canVote}
          canManage={canManage}
          onOpenOpportunity={openOpportunity}
          onAddClick={() => setIsAddOpen(true)}
          window={monthWindow}
          onWindowChange={setMonthWindow}
          layoutToggle={
            <div className="flex items-center gap-3">
              {layoutToggle}
              {groupByPicker}
            </div>
          }
        />
      )}

      {isOpportunitiesTab && layout === RoadmapBoardLayout.TABLE && (
        <OpportunitiesBoard
          showFilters
          listArgs={listArgs}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          budget={budget}
          goals={goals ?? []}
          facets={facets}
          search={search}
          onSearchChange={withPagingReset(setSearch)}
          typeFilter={typeFilter}
          onTypeFilterChange={withPagingReset(setTypeFilter)}
          stageFilter={stageFilter}
          onStageFilterChange={withPagingReset(setStageFilter)}
          sourceFilter={sourceFilter}
          onSourceFilterChange={withPagingReset(setSourceFilter)}
          effortFilter={effortFilter}
          onEffortFilterChange={withPagingReset(setEffortFilter)}
          goalFilter={goalFilter}
          onGoalFilterChange={withPagingReset(setGoalFilter)}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={withPagingReset(setOwnerFilter)}
          advanced={advanced}
          onAdvancedChange={withPagingReset(setAdvanced)}
          sortBy={sortBy}
          order={order}
          onToggleSort={toggleSort}
          canVote={canVote}
          canManage={canManage}
          onOpenOpportunity={openOpportunity}
          onAddClick={() => setIsAddOpen(true)}
          offset={offset}
          pageSize={PAGE_SIZE}
          layoutToggle={layoutToggle}
          onOffsetChange={setOffset}
        />
      )}

      {/* Same query/pagination as the table, no drag and no merge-select — see
          OpportunitiesListView's docblock for why those are table/board-only. */}
      {isOpportunitiesTab && isList && (
        <OpportunitiesListView
          // No sort gating: the rank is computed server-side over the whole queue, so it stays
          // correct when the feed is ordered by date. That is the point of moving it to the
          // backend — a client-side position could only ever describe the current ordering.
          isQueue={isQueueView}
          leading={queueToolbar}
          showFilters
          listArgs={listArgs}
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          budget={budget}
          goals={goals ?? []}
          facets={facets}
          search={search}
          onSearchChange={withPagingReset(setSearch)}
          typeFilter={typeFilter}
          onTypeFilterChange={withPagingReset(setTypeFilter)}
          stageFilter={stageFilter}
          onStageFilterChange={withPagingReset(setStageFilter)}
          sourceFilter={sourceFilter}
          onSourceFilterChange={withPagingReset(setSourceFilter)}
          effortFilter={effortFilter}
          onEffortFilterChange={withPagingReset(setEffortFilter)}
          goalFilter={goalFilter}
          onGoalFilterChange={withPagingReset(setGoalFilter)}
          ownerFilter={ownerFilter}
          onOwnerFilterChange={withPagingReset(setOwnerFilter)}
          advanced={advanced}
          onAdvancedChange={withPagingReset(setAdvanced)}
          canVote={canVote}
          canManage={canManage}
          onOpenOpportunity={openOpportunity}
          onAddClick={() => setIsAddOpen(true)}
          loaded={data?.items.length ?? 0}
          onLoadMore={() => setListLoaded(current => current + FEED_PAGE_SIZE)}
          layoutToggle={layoutToggle}
        />
      )}

      {/* Gated here as well as on the gear that opens it: the drawer holds three write surfaces,
          and a read-only voter should not be able to mount it by any route. */}
      {isSettingsOpen && canManage && (
        <RoadmapSettingsDrawer
          goals={goals ?? []}
          areGoalsLoading={!goals}
          onClose={() => setIsSettingsOpen(false)}
          onMerged={primaryId => {
            setIsSettingsOpen(false);
            // Straight into the merged opportunity: stage, goal, owner, planned month and PRD are
            // all editable there, so "then do all the settings" is the existing editor rather
            // than a second copy of it inside the merge form.
            openOpportunity(primaryId);
          }}
          // The original survives a split carrying its comments and shared links, so it is the
          // part worth landing on — same handoff as merge.
          onSplit={originalId => {
            setIsSettingsOpen(false);
            openOpportunity(originalId);
          }}
        />
      )}

      {isAddOpen && (
        <AddOpportunityDrawer
          goals={goals ?? []}
          canManage={canManage}
          onClose={() => setIsAddOpen(false)}
          onOpenExisting={id => {
            setIsAddOpen(false);
            openOpportunity(id);
          }}
        />
      )}

      {/*
        The interview hands over by FILING, then closing itself and opening the normal drawer on
        what it filed — which is where review and editing happen, because that drawer already
        autosaves. There is deliberately no third "review" UI in between: a second editor over
        the same row would be a second set of save semantics to keep honest.
      */}
      {isInterviewOpen && (
        <OpportunityInterviewDrawer
          onClose={() => setIsInterviewOpen(false)}
          onCreated={id => {
            setIsInterviewOpen(false);
            openOpportunity(id);
          }}
        />
      )}

      {isReportBugOpen && <ReportBugModal onClose={() => setIsReportBugOpen(false)} />}

      {openOpportunityId && (
        <OpportunityDrawer
          opportunityId={openOpportunityId}
          goals={goals ?? []}
          canVote={canVote}
          canManage={canManage}
          onOpenBuilderSession={handle =>
            openBuilderSession(handle.sessionId, seedForHandle(handle))
          }
          onClose={() => openOpportunity(null)}
        />
      )}

      {/*
        A SIBLING of the opportunity drawer, not a child. Both can be open at once — the
        opportunity behind, the agent in front — and closing the agent returns you to the row
        you briefed it from rather than to the bare board.
      */}
      {openBuilderSessionId && (
        <BuilderSessionDrawer
          sessionId={openBuilderSessionId}
          openingMessage={builderSeed}
          onClose={() => openBuilderSession(null)}
        />
      )}
    </div>
  );
};
