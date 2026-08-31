import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  RoadmapBoardMoveResponse,
  RoadmapBoardQuery,
  RoadmapBoardResponse,
  RoadmapBugReportBody,
  RoadmapBugReportResponse,
  RoadmapVoteBudget,
  RoadmapComment,
  RoadmapDuplicateMatch,
  RoadmapFacets,
  RoadmapInterviewNote,
  RoadmapListEnvelope,
  RoadmapOpportunitiesQuery,
  RoadmapOpportunitiesResponse,
  RoadmapOpportunity,
  RoadmapSavedView,
  RoadmapEligibleOwner,
  RoadmapOpportunityEffort,
  RoadmapReadinessChecklist,
  RoadmapReadinessReport,
  RoadmapTaxonomyItem,
  RoadmapViewState,
  SetAllocationResponse,
  RoadmapBuilderSessionHandle,
  RoadmapBoardGroupBy,
  RoadmapOpportunityStage,
} from "@types";

import { baseAPI } from "./baseApi";

export const productRoadmapAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    // ── the board ─────────────────────────────────────────────────────────────
    getRoadmapOpportunities: builder.query<RoadmapOpportunitiesResponse, RoadmapOpportunitiesQuery>(
      {
        query: params => ({
          url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITIES,
          method: HttpMethod.GET,
          params,
        }),
        providesTags: result => [
          { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
          ...(result?.items ?? []).map(o => ({
            type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
            id: o.id,
          })),
        ],
      },
    ),

    /**
     * The month board.
     *
     * Provides the SAME `{ id: "LIST" }` tag as the table, deliberately: every mutation that
     * already invalidates the list (create, update, delete, split, merge) must refresh the board
     * too, and giving the board its own tag would mean auditing all of them and forgetting one.
     */
    getRoadmapBoard: builder.query<RoadmapBoardResponse, RoadmapBoardQuery>({
      query: params => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.BOARD,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: result => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        ...(result?.lanes ?? [])
          .flatMap(lane => lane.items)
          .map(o => ({ type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: o.id })),
      ],
    }),

    /**
     * Drop a card into a month lane.
     *
     * ⚠️ NO invalidatesTags, for the same reason as setRoadmapAllocation: invalidating would
     * refetch the whole board on every drag and repaint under the user's cursor. The optimistic
     * patch below IS the update, and it applies exactly what the server is about to do.
     *
     * The one case that does refetch is a STALE drag — when the server reports having reordered
     * fewer ids than we sent, somebody else moved a card out of this lane while ours was in the
     * air, so our optimistic order is genuinely wrong and guessing again would be worse than
     * a refetch. Everyone else's board is refreshed by the socket's ROADMAP_INVALIDATED('board').
     */
    moveRoadmapOpportunity: builder.mutation<
      RoadmapBoardMoveResponse,
      {
        opportunityId: string;
        /** Which grouping the drag happened on — decides which field the server writes. */
        groupBy: RoadmapBoardGroupBy;
        /** Destination lane value: a month key, or a stage / goal / owner. */
        lane: string | null;
        /** Month only; omitted on the other groupings, which have no hand-ordering. */
        orderedIds?: string[];
        /**
         * The board query args to patch. Must be the SAME memoised object the board subscription
         * uses, or updateQueryData targets a cache entry nobody is rendering — the trap documented
         * on useSetVotes.
         */
        boardArgs: RoadmapBoardQuery;
      }
    >({
      query: ({ opportunityId, groupBy, lane, orderedIds }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.BOARD_LANE,
        method: HttpMethod.PUT,
        body: { opportunityId, groupBy, lane, orderedIds },
      }),
      onQueryStarted: async (
        { opportunityId, groupBy, lane, orderedIds, boardArgs },
        { dispatch, queryFulfilled },
      ) => {
        const patch = dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapBoard", boardArgs, draft => {
            const lanes = draft.lanes;
            const source = lanes.find(lane => lane.items.some(o => o.id === opportunityId));
            const destination = lanes.find(l => l.key === lane);
            // A drop into a lane outside the current window has nothing to patch — the server
            // still performs it, and the card correctly disappears on the next read.
            if (!source || !destination) return;

            const moving = source.items.find(o => o.id === opportunityId);
            if (!moving) return;

            if (source !== destination) {
              source.items = source.items.filter(o => o.id !== opportunityId);
              source.total = Math.max(0, source.total - 1);
              destination.total += 1;
              // Patch the field the drop actually wrote. Guessing wrong here is not cosmetic:
              // the card would sit in the new lane showing the old value until the next read.
              if (groupBy === RoadmapBoardGroupBy.MONTH) {
                // plannedMonth is what moved; effectiveMonth follows it because a draggable card
                // is by definition not pinned.
                moving.plannedMonth = lane;
                moving.effectiveMonth = lane;
              } else if (groupBy === RoadmapBoardGroupBy.STAGE) {
                moving.stage = lane as RoadmapOpportunityStage;
              } else if (groupBy === RoadmapBoardGroupBy.PRODUCT_GOAL) {
                // productGoal is non-nullable on the wire, unlike owner below — "" is its
                // catch-all-lane value, so the null lane key must coerce to "" rather than be
                // skipped, or the card keeps showing its old goal until the next real fetch.
                moving.productGoal = lane ?? "";
              } else {
                moving.owner = lane;
              }
              destination.items = [moving, ...destination.items];
            }

            // Hand-ordering is a month-board concept; the other lanes are ordered by priority and
            // the server ignores orderedIds there, so applying one would show an order that
            // vanishes on the next fetch.
            if (groupBy === RoadmapBoardGroupBy.MONTH && orderedIds) {
              const byId = new Map(destination.items.map(o => [o.id, o]));
              byId.set(moving.id, moving);
              const reordered = orderedIds
                .map(id => byId.get(id))
                .filter((o): o is NonNullable<typeof o> => !!o);
              // Anything the client's order didn't mention stays, after the ordered block — a lane
              // truncated by laneLimit holds cards this drag never knew about.
              const untouched = destination.items.filter(o => !orderedIds.includes(o.id));
              destination.items = [...reordered, ...untouched];
              destination.items.forEach((o, index) => {
                o.boardPosition = index;
              });
            }
          }),
        );

        try {
          const { data } = await queryFulfilled;
          if (orderedIds && data.reordered.length !== orderedIds.length) {
            dispatch(
              productRoadmapAPI.util.invalidateTags([
                { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
              ]),
            );
          }
        } catch {
          // Covers the 422 on a pinned card as well as a network failure: either way the board
          // must snap back to what the server still believes.
          patch.undo();
        }
      },
    }),

    /** For the ?opportunity=<id> deep link, where the row may not be on the current page. */
    getRoadmapOpportunity: builder.query<RoadmapOpportunity, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: (_r, _e, id) => [{ type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id }],
    }),

    getRoadmapVoteBudget: builder.query<RoadmapVoteBudget, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VOTE_BUDGET,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_VOTE_BUDGET],
    }),

    getRoadmapFacets: builder.query<RoadmapFacets, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.FACETS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_FACETS],
    }),

    createRoadmapOpportunity: builder.mutation<
      RoadmapOpportunity,
      {
        description: string;
        type: string;
        productGoal: string;
        effort?: RoadmapOpportunityEffort | null;
        /**
         * Only sent by a filer who can manage the roadmap — the drawer hides the picker from
         * everyone else, and the backend answers 403 rather than filing unassigned if it
         * arrives from someone without edit:admin:product-roadmap.
         */
        ownerUserId?: number | null;
      }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITIES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    /**
     * File a bug from the roadmap's "Report a bug" button.
     *
     * Invalidates the Bug Hunter findings list and NOT the roadmap board, which is the
     * whole point: a bug lands in Bug Hunter's table and never appears on the board, so
     * invalidating the board would refetch a list that provably cannot have changed, and
     * failing to invalidate the findings list would leave a triager staring at a table
     * missing the row they just filed.
     */
    createRoadmapBugReport: builder.mutation<RoadmapBugReportResponse, RoadmapBugReportBody>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.BUG_REPORTS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [{ type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" }],
    }),

    updateRoadmapOpportunity: builder.mutation<
      RoadmapOpportunity,
      { id: string; body: Partial<RoadmapOpportunity> }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id },
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    deleteRoadmapOpportunity: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      // Deleting returns votes to their owners, so the budget changes too.
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_VOTE_BUDGET,
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    /**
     * Set the caller's votes on one opportunity.
     *
     * INVALIDATES THE LIST — a reversal of the earlier "never invalidate on a vote" rule, and
     * worth explaining because the reasoning behind that rule stopped holding.
     *
     * It used to be true that this response contained everything a vote changed: the row's total
     * and the caller's balance, both patched optimistically and then reconciled from here. Since
     * `queueRank` moved into ally-be, that is no longer true. A vote changes the rank of EVERY
     * card below the one voted on, and it can change the list's ORDER — neither of which this
     * single-row response can express and neither of which a client can derive, because the
     * queue extends past the loaded page.
     *
     * Symptom without this: the count moved instantly while the rank and position did not, so a
     * card showing 48 votes sat below one showing 47 until something else happened to refetch.
     *
     * The optimistic patch in useSetVotes still runs and still owns the instant feedback; this
     * only makes the correction prompt instead of eventual. The vote control debounces, so the
     * refetch fires once per settled interaction rather than once per tap.
     */
    setRoadmapAllocation: builder.mutation<
      SetAllocationResponse,
      { opportunityId: string; votes: number }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.ALLOCATIONS,
        method: HttpMethod.PUT,
        body,
      }),
      // The LIST tag is shared by the table, the list feed and the board (see getRoadmapBoard),
      // so all three pick up the new ranks and ordering from one invalidation.
      invalidatesTags: [{ type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" }],
    }),

    splitRoadmapOpportunity: builder.mutation<
      { partIds: string[] },
      { id: string; parts: { id?: string; description: string; weight: number }[] }
    >({
      query: ({ id, parts }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_SPLIT(id),
        method: HttpMethod.POST,
        body: { parts },
      }),
      // Split moves votes across rows, so both the list and every budget change.
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_VOTE_BUDGET,
      ],
    }),

    mergeRoadmapOpportunities: builder.mutation<
      { primaryId: string },
      { primaryId: string; sourceIds: string[]; description?: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_MERGE,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_VOTE_BUDGET,
      ],
    }),

    // ── comments ──────────────────────────────────────────────────────────────
    getRoadmapComments: builder.query<RoadmapComment[], string>({
      query: opportunityId => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_COMMENTS(opportunityId),
        method: HttpMethod.GET,
      }),
      providesTags: (_r, _e, opportunityId) => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_COMMENTS, id: opportunityId },
      ],
    }),

    createRoadmapComment: builder.mutation<RoadmapComment, { opportunityId: string; body: string }>(
      {
        query: ({ opportunityId, body }) => ({
          url: ApiEndpoints.PRODUCT_ROADMAP.OPPORTUNITY_COMMENTS(opportunityId),
          method: HttpMethod.POST,
          body: { body },
        }),
        invalidatesTags: (_r, _e, { opportunityId }) => [
          { type: TAG_TYPES.PRODUCT_ROADMAP_COMMENTS, id: opportunityId },
          { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: opportunityId },
        ],
      },
    ),

    updateRoadmapComment: builder.mutation<
      RoadmapComment,
      { id: string; opportunityId: string; body: string }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.COMMENT_BY_ID(id),
        method: HttpMethod.PATCH,
        body: { body },
      }),
      invalidatesTags: (_r, _e, { opportunityId }) => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_COMMENTS, id: opportunityId },
      ],
    }),

    deleteRoadmapComment: builder.mutation<void, { id: string; opportunityId: string }>({
      query: ({ id }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.COMMENT_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: (_r, _e, { opportunityId }) => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_COMMENTS, id: opportunityId },
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: opportunityId },
      ],
    }),

    // ── taxonomy ──────────────────────────────────────────────────────────────
    getRoadmapProductGoals: builder.query<RoadmapTaxonomyItem[], void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.PRODUCT_GOALS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_GOALS],
    }),

    getRoadmapOwners: builder.query<RoadmapTaxonomyItem[], void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OWNERS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_OWNERS],
    }),

    /**
     * The owner picker's options: Ally super-admin users.
     *
     * Separate from getRoadmapOwners, which lists the LEGACY free-text taxonomy still referenced by
     * migrated rows. New assignments must come from this list — the backend rejects anyone else
     * with a 422.
     */
    getRoadmapEligibleOwners: builder.query<RoadmapEligibleOwner[], void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OWNERS_ELIGIBLE,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_OWNERS],
    }),

    /** How many opportunities each goal is on — shown before a delete un-assigns them. */
    getRoadmapProductGoalUsage: builder.query<Record<string, number>, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.PRODUCT_GOALS_USAGE,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_GOALS],
    }),

    createRoadmapProductGoal: builder.mutation<RoadmapTaxonomyItem, { name: string }>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.PRODUCT_GOALS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_GOALS],
    }),

    renameRoadmapProductGoal: builder.mutation<RoadmapTaxonomyItem, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.PRODUCT_GOAL_BY_ID(id),
        method: HttpMethod.PATCH,
        body: { name },
      }),
      // A rename cascades to every opportunity via the FK, so the whole list is stale.
      invalidatesTags: [
        TAG_TYPES.PRODUCT_ROADMAP_GOALS,
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    deleteRoadmapProductGoal: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.PRODUCT_GOAL_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_GOALS],
    }),

    createRoadmapOwner: builder.mutation<RoadmapTaxonomyItem, { name: string }>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OWNERS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_OWNERS],
    }),

    renameRoadmapOwner: builder.mutation<RoadmapTaxonomyItem, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OWNER_BY_ID(id),
        method: HttpMethod.PATCH,
        body: { name },
      }),
      invalidatesTags: [
        TAG_TYPES.PRODUCT_ROADMAP_OWNERS,
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    deleteRoadmapOwner: builder.mutation<{ unassigned: number }, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.OWNER_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [
        TAG_TYPES.PRODUCT_ROADMAP_OWNERS,
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
      ],
    }),

    // ── interview notes ───────────────────────────────────────────────────────
    getRoadmapInterviewNotes: builder.query<
      RoadmapListEnvelope<RoadmapInterviewNote>,
      { search?: string; limit?: number; offset?: number } | void
    >({
      query: params => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.INTERVIEW_NOTES,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_INTERVIEWS],
    }),

    createRoadmapInterviewNote: builder.mutation<
      RoadmapInterviewNote,
      Partial<RoadmapInterviewNote>
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.INTERVIEW_NOTES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_INTERVIEWS],
    }),

    updateRoadmapInterviewNote: builder.mutation<
      RoadmapInterviewNote,
      { id: string; body: Partial<RoadmapInterviewNote> }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.INTERVIEW_NOTE_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_INTERVIEWS],
    }),

    deleteRoadmapInterviewNote: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.INTERVIEW_NOTE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_INTERVIEWS],
    }),

    // ── release notes ─────────────────────────────────────────────────────────
    // ── saved views ───────────────────────────────────────────────────────────
    getRoadmapSavedViews: builder.query<RoadmapSavedView[], void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEWS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS],
    }),

    getRoadmapViewOrder: builder.query<{ viewIds: string[] }, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEW_TAB_ORDER,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_VIEW_ORDER],
    }),

    createRoadmapSavedView: builder.mutation<
      RoadmapSavedView,
      { name: string; state: RoadmapViewState }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEWS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS],
    }),

    updateRoadmapSavedView: builder.mutation<
      RoadmapSavedView,
      { id: string; name?: string; state?: RoadmapViewState }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEW_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS],
    }),

    /** Separate from update because pinning requires EDIT_PRODUCT_ROADMAP. */
    pinRoadmapSavedView: builder.mutation<RoadmapSavedView, { id: string; pinned: boolean }>({
      query: ({ id, pinned }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEW_PIN(id),
        method: HttpMethod.PUT,
        body: { pinned },
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS],
    }),

    deleteRoadmapSavedView: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEW_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_SAVED_VIEWS],
    }),

    setRoadmapViewOrder: builder.mutation<{ viewIds: string[] }, string[]>({
      query: viewIds => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.VIEW_TAB_ORDER,
        method: HttpMethod.PUT,
        body: { viewIds },
      }),
      // No invalidation: the caller patches the cache optimistically and rolls back on failure.
    }),

    // ── AI helpers. None of these carry tags — they are pure compute. ─────────

    /**
     * The readiness checklist. A query, not a constant in this bundle: the server owns the
     * list so that editing it there is the whole change.
     */
    getRoadmapReadinessCriteria: builder.query<RoadmapReadinessChecklist, void>({
      query: () => ({ url: ApiEndpoints.PRODUCT_ROADMAP.AI_READINESS_CRITERIA }),
    }),

    /** Grade a draft against that checklist. Every item must pass before filing is allowed. */
    checkRoadmapReadiness: builder.mutation<
      RoadmapReadinessReport,
      { description: string; productGoal?: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_READINESS,
        method: HttpMethod.POST,
        body,
      }),
    }),

    roadmapAiDuplicates: builder.mutation<
      { matches: RoadmapDuplicateMatch[] },
      { description: string; productGoal?: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_DUPLICATES,
        method: HttpMethod.POST,
        body,
      }),
    }),

    roadmapAiClassify: builder.mutation<
      { category: string | null; confidence: number; rationale: string },
      { description: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_CLASSIFY,
        method: HttpMethod.POST,
        body,
      }),
    }),

    roadmapAiSummarise: builder.mutation<{ text: string }, { transcript: string }>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_SUMMARISE,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Open (or resume) the Builder session for an opportunity.
     *
     * REPLACES roadmapAiGenerateClaudePrompt, which produced a block of text a human then
     * pasted into a terminal themselves. Idempotent server-side, so this is safe to fire on
     * every press of the button.
     *
     * Invalidates the opportunity so the drawer's button flips from "Open" to "Resume" without
     * a manual refetch — `builderSessionId` is on the opportunity, not on the session.
     */
    openRoadmapBuilderSession: builder.mutation<
      RoadmapBuilderSessionHandle,
      { opportunityId: string }
    >({
      query: ({ opportunityId }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.BUILDER_SESSION(opportunityId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, { opportunityId }) => [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: opportunityId },
      ],
    }),
  }),
});

export const {
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapBoardQuery,
  useMoveRoadmapOpportunityMutation,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapVoteBudgetQuery,
  useGetRoadmapFacetsQuery,
  useCreateRoadmapOpportunityMutation,
  useCreateRoadmapBugReportMutation,
  useUpdateRoadmapOpportunityMutation,
  useDeleteRoadmapOpportunityMutation,
  useSetRoadmapAllocationMutation,
  useSplitRoadmapOpportunityMutation,
  useMergeRoadmapOpportunitiesMutation,
  useGetRoadmapCommentsQuery,
  useCreateRoadmapCommentMutation,
  useUpdateRoadmapCommentMutation,
  useDeleteRoadmapCommentMutation,
  useGetRoadmapProductGoalsQuery,
  useGetRoadmapEligibleOwnersQuery,
  useGetRoadmapOwnersQuery,
  useGetRoadmapProductGoalUsageQuery,
  useCreateRoadmapProductGoalMutation,
  useRenameRoadmapProductGoalMutation,
  useDeleteRoadmapProductGoalMutation,
  useCreateRoadmapOwnerMutation,
  useRenameRoadmapOwnerMutation,
  useDeleteRoadmapOwnerMutation,
  useGetRoadmapInterviewNotesQuery,
  useCreateRoadmapInterviewNoteMutation,
  useUpdateRoadmapInterviewNoteMutation,
  useDeleteRoadmapInterviewNoteMutation,
  useGetRoadmapSavedViewsQuery,
  useGetRoadmapViewOrderQuery,
  useCreateRoadmapSavedViewMutation,
  useUpdateRoadmapSavedViewMutation,
  usePinRoadmapSavedViewMutation,
  useDeleteRoadmapSavedViewMutation,
  useSetRoadmapViewOrderMutation,
  useGetRoadmapReadinessCriteriaQuery,
  useCheckRoadmapReadinessMutation,
  useRoadmapAiDuplicatesMutation,
  useRoadmapAiClassifyMutation,
  useRoadmapAiSummariseMutation,
  useOpenRoadmapBuilderSessionMutation,
} = productRoadmapAPI;
