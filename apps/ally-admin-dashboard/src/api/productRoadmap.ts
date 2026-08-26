import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  RoadmapBoardMoveResponse,
  RoadmapBoardQuery,
  RoadmapBoardResponse,
  RoadmapBugReportBody,
  RoadmapBugReportResponse,
  RoadmapCoinBudget,
  RoadmapComment,
  RoadmapDuplicateMatch,
  RoadmapFacets,
  RoadmapInterviewNote,
  RoadmapListEnvelope,
  RoadmapOpportunitiesQuery,
  RoadmapOpportunitiesResponse,
  RoadmapOpportunity,
  RoadmapReleaseNote,
  RoadmapSavedView,
  RoadmapEligibleOwner,
  RoadmapTaxonomyItem,
  RoadmapViewState,
  SetAllocationResponse,
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
        ...[...(result?.months ?? []), ...(result?.unscheduled ? [result.unscheduled] : [])]
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
        month: string | null;
        orderedIds: string[];
        /**
         * The board query args to patch. Must be the SAME memoised object the board subscription
         * uses, or updateQueryData targets a cache entry nobody is rendering — the trap documented
         * on useAllocateCoins.
         */
        boardArgs: RoadmapBoardQuery;
      }
    >({
      query: ({ opportunityId, month, orderedIds }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.BOARD_LANE,
        method: HttpMethod.PUT,
        body: { opportunityId, month, orderedIds },
      }),
      onQueryStarted: async (
        { opportunityId, month, orderedIds, boardArgs },
        { dispatch, queryFulfilled },
      ) => {
        const patch = dispatch(
          productRoadmapAPI.util.updateQueryData("getRoadmapBoard", boardArgs, draft => {
            const lanes = [...draft.months, draft.unscheduled];
            const source = lanes.find(lane => lane.items.some(o => o.id === opportunityId));
            const destination = lanes.find(lane => lane.month === month);
            // A drop into a lane outside the current window has nothing to patch — the server
            // still performs it, and the card correctly disappears on the next read.
            if (!source || !destination) return;

            const moving = source.items.find(o => o.id === opportunityId);
            if (!moving) return;

            if (source !== destination) {
              source.items = source.items.filter(o => o.id !== opportunityId);
              source.total = Math.max(0, source.total - 1);
              destination.total += 1;
              // plannedMonth is the field that actually moved; effectiveMonth follows it because
              // a draggable card is by definition not pinned.
              moving.plannedMonth = month;
              moving.effectiveMonth = month;
            }

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
          }),
        );

        try {
          const { data } = await queryFulfilled;
          if (data.reordered.length !== orderedIds.length) {
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

    getRoadmapCoinBudget: builder.query<RoadmapCoinBudget, void>({
      query: () => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.COIN_BUDGET,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET],
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
      { description: string; type: string; productGoal: string }
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
      // Deleting returns coins to their owners, so the budget changes too.
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    /**
     * Set the caller's coins on one opportunity.
     *
     * ⚠️ DELIBERATELY NO invalidatesTags. Invalidating the list here would refetch on every
     * coin click and stomp the optimistic patch mid-interaction — the reconciliation in
     * useAllocateCoins uses this response instead. Only split/merge/delete invalidate.
     */
    setRoadmapAllocation: builder.mutation<
      SetAllocationResponse,
      { opportunityId: string; coins: number }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.ALLOCATIONS,
        method: HttpMethod.PUT,
        body,
      }),
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
      // Split moves coins across rows, so both the list and every budget change.
      invalidatesTags: [
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
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
        TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
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
    getRoadmapReleaseNotes: builder.query<
      RoadmapListEnvelope<RoadmapReleaseNote>,
      { limit?: number; offset?: number } | void
    >({
      query: params => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.RELEASE_NOTES,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [TAG_TYPES.PRODUCT_ROADMAP_RELEASE_NOTES],
    }),

    createRoadmapReleaseNote: builder.mutation<
      RoadmapReleaseNote,
      { title?: string | null; content: string; opportunityIds: string[] }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.RELEASE_NOTES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_RELEASE_NOTES],
    }),

    updateRoadmapReleaseNote: builder.mutation<
      RoadmapReleaseNote,
      { id: string; body: Partial<RoadmapReleaseNote> }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.RELEASE_NOTE_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_RELEASE_NOTES],
    }),

    deleteRoadmapReleaseNote: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.RELEASE_NOTE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.PRODUCT_ROADMAP_RELEASE_NOTES],
    }),

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
    roadmapAiReview: builder.mutation<
      { suggestions: { issue: string; tip: string }[] },
      { description: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_REVIEW,
        method: HttpMethod.POST,
        body,
      }),
    }),

    roadmapAiEnhance: builder.mutation<{ enhanced: string }, { description: string }>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_ENHANCE,
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

    roadmapAiReleaseNotes: builder.mutation<{ text: string }, { opportunityIds: string[] }>({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_RELEASE_NOTES,
        method: HttpMethod.POST,
        body,
      }),
    }),

    roadmapAiGenerateClaudePrompt: builder.mutation<
      { text: string },
      { description: string; prd?: string }
    >({
      query: body => ({
        url: ApiEndpoints.PRODUCT_ROADMAP.AI_GENERATE_CLAUDE_PROMPT,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const {
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapBoardQuery,
  useMoveRoadmapOpportunityMutation,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapCoinBudgetQuery,
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
  useGetRoadmapReleaseNotesQuery,
  useCreateRoadmapReleaseNoteMutation,
  useUpdateRoadmapReleaseNoteMutation,
  useDeleteRoadmapReleaseNoteMutation,
  useGetRoadmapSavedViewsQuery,
  useGetRoadmapViewOrderQuery,
  useCreateRoadmapSavedViewMutation,
  useUpdateRoadmapSavedViewMutation,
  usePinRoadmapSavedViewMutation,
  useDeleteRoadmapSavedViewMutation,
  useSetRoadmapViewOrderMutation,
  useRoadmapAiReviewMutation,
  useRoadmapAiEnhanceMutation,
  useRoadmapAiDuplicatesMutation,
  useRoadmapAiClassifyMutation,
  useRoadmapAiSummariseMutation,
  useRoadmapAiReleaseNotesMutation,
  useRoadmapAiGenerateClaudePromptMutation,
} = productRoadmapAPI;
