/** Wire types for the Product Roadmap board. Mirrors ally-be src/product-roadmap DTOs. */

export enum RoadmapOpportunityType {
  IDEA = "idea",
  BUG = "bug",
}

export enum RoadmapOpportunityStage {
  NEW = "new",
  PRIORITISED = "prioritised",
  UNDER_DEVELOPMENT = "under_development",
  RELEASED = "released",
  ARCHIVED = "archived",
}

/**
 * Who filed it — 'staff' (the admin New Opportunity path, and every pre-existing row) or
 * 'consumer' (a logged-in app user's "Report a problem" form). Admin-side display/filtering
 * only, mirrors ally-be's RoadmapOpportunitySource.
 */
export enum RoadmapOpportunitySource {
  STAFF = "staff",
  CONSUMER = "consumer",
}

export interface RoadmapUserRef {
  id: number;
  email: string;
  /** "Unknown user" when the Ally account no longer exists — createdBy has no FK. */
  name: string;
}

export interface RoadmapOpportunity {
  id: string;
  description: string;
  type: RoadmapOpportunityType;
  stage: RoadmapOpportunityStage;
  productGoal: string;
  /** Display name: the linked super-admin's current name, or a legacy migrated string. */
  owner: string | null;
  /** Null for legacy migrated rows whose owner was never linked to an Ally account. */
  ownerUserId?: number | null;
  prd: string | null;
  /** AI-generated Claude Code implementation prompt, saved verbatim like `prd`. */
  claudePrompt: string | null;
  releasedAt: string | null;
  /** The month this was PLANNED into, 'YYYY-MM'. Null means Unscheduled. */
  plannedMonth: string | null;
  /** Manual rank within its month lane, ascending. Only meaningful against its own lane. */
  boardPosition: number;
  /**
   * The lane the card actually shows in: its release month once shipped, else plannedMonth.
   * Server-derived — never recompute it here, or the board and the API will disagree about
   * where a slipped item lives.
   */
  effectiveMonth: string | null;
  /** True when the lane is a fact rather than a plan, so the card must not be draggable. */
  monthPinned: boolean;
  /** SUM of every user's coins across every period. Computed in SQL, never stored. */
  priorityScore: number;
  /** The CALLER's coins on this opportunity in the CURRENT period only. */
  myCoins: number;
  commentCount: number;
  /** Who filed it — see RoadmapOpportunitySource. Admin display only. */
  source: RoadmapOpportunitySource;
  createdAt: string;
  updatedAt: string;
  creator: RoadmapUserRef | null;
}

export interface RoadmapOpportunitiesResponse {
  items: RoadmapOpportunity[];
  count: number;
  /**
   * MAX score across ALL non-deleted opportunities — deliberately unfiltered, so the priority
   * bars keep a stable scale when a filter is applied.
   */
  maxScore: number;
  /** Server-computed 'YYYY-MM'. Never derive this on the client. */
  periodKey: string;
}

export interface RoadmapOpportunitiesQuery {
  search?: string;
  type?: string[];
  stage?: string[];
  source?: string[];
  productGoal?: string[];
  owner?: string[];
  createdBy?: number[];
  dateFrom?: string;
  dateTo?: string;
  releasedFrom?: string;
  releasedTo?: string;
  priorityMin?: number;
  priorityMax?: number;
  sortBy?: "priority" | "createdAt" | "releasedAt" | "myCoins" | "description";
  order?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

/** Which layout the Opportunities tab is showing. Persisted in saved-view state. */
export enum RoadmapBoardLayout {
  TABLE = "table",
  MONTH_BOARD = "month-board",
}

export interface RoadmapMonthLane {
  /** 'YYYY-MM', or null for the Unscheduled lane. */
  month: string | null;
  items: RoadmapOpportunity[];
  /** True lane size, which is NOT items.length when laneLimit truncated it. */
  total: number;
}

export interface RoadmapBoardResponse {
  /** One entry per month in the window, INCLUDING empty months — a gap in a plan is information. */
  months: RoadmapMonthLane[];
  unscheduled: RoadmapMonthLane;
  /** Earliest/latest month holding anything at all. Unfiltered, so the window arrows don't flicker. */
  bounds: { earliest: string | null; latest: string | null };
  from: string;
  to: string;
  maxScore: number;
  periodKey: string;
  /** True when the board hit its global row bound and some lanes are incomplete. */
  truncated: boolean;
}

/** The board read. Same filters as the table, windowed by month instead of paginated. */
export type RoadmapBoardQuery = Omit<
  RoadmapOpportunitiesQuery,
  "sortBy" | "order" | "limit" | "offset"
> & {
  from?: string;
  to?: string;
  laneLimit?: number;
};

export interface RoadmapBoardMoveResponse {
  opportunityId: string;
  plannedMonth: string | null;
  effectiveMonth: string | null;
  /** The ids actually rewritten — shorter than what was sent if the drag was stale. */
  reordered: string[];
}

export interface RoadmapCoinBudget {
  periodKey: string;
  coinsPerMonth: number;
  used: number;
  remaining: number;
}

/**
 * Returned by PUT /allocations. Carries BOTH the opportunity aggregate and the budget so an
 * optimistic client reconciles in one round-trip instead of refetching the list (which would
 * stomp an in-flight coin edit).
 */
export interface SetAllocationResponse {
  opportunityId: string;
  periodKey: string;
  coins: number;
  priorityScore: number;
  budget: RoadmapCoinBudget;
}

export interface RoadmapFacets {
  creators: RoadmapUserRef[];
  goals: string[];
  owners: string[];
}

export interface RoadmapTaxonomyItem {
  id: string;
  name: string;
  position: number;
}

export interface RoadmapComment {
  id: string;
  opportunityId: string;
  body: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapInterviewNote {
  id: string;
  title: string;
  interviewee: string | null;
  transcript: string | null;
  summary: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapReleaseNote {
  id: string;
  title: string | null;
  content: string;
  /** Denormalised snapshot of what the notes were generated from; not a join. */
  opportunityIds: string[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A saved filter/sort snapshot.
 *
 * `goalFilter` and `ownerFilter` hold NAMES, not ids — which is why the backend keeps text
 * foreign keys with ON UPDATE CASCADE. Switching either side to uuids silently breaks every
 * migrated view.
 *
 * Key ORDER is not preserved by Postgres jsonb, so the dirty check must compare a canonically
 * key-ordered serialisation (see utils/views.ts). Comparing raw JSON.stringify output makes
 * every saved view look permanently dirty.
 */
export interface RoadmapViewState {
  searchQuery?: string;
  typeFilter?: string[];
  stageFilter?: string[];
  /** New filter, absent on every view saved before it existed — treat undefined as "no filter". */
  sourceFilter?: string[];
  goalFilter?: string[];
  ownerFilter?: string[];
  creatorFilter?: string[];
  dateFrom?: string;
  dateTo?: string;
  releasedFrom?: string;
  releasedTo?: string;
  priorityMin?: string;
  priorityMax?: string;
  sort?: { field: string; dir: "asc" | "desc" };
  /**
   * Which layout the view opens in. Absent on every view migrated from the standalone app and on
   * everything saved before month boards existed, which is why readers must default it to TABLE
   * rather than treat undefined as a distinct third state.
   */
  layout?: RoadmapBoardLayout;
}

export interface RoadmapSavedView {
  id: string;
  name: string;
  state: RoadmapViewState;
  pinned: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapDuplicateMatch {
  id: string;
  description: string;
  productGoal: string;
  stage: RoadmapOpportunityStage;
  reason: string;
  similarity: number;
}

export interface RoadmapListEnvelope<T> {
  items: T[];
  count: number;
}

/** An Ally super-admin who may be assigned as an opportunity owner. */
export interface RoadmapEligibleOwner {
  id: number;
  name: string;
  email: string;
}
