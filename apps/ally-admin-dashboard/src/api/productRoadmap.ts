import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
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
  }),
});

export const {
  useGetRoadmapOpportunitiesQuery,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapCoinBudgetQuery,
  useGetRoadmapFacetsQuery,
  useCreateRoadmapOpportunityMutation,
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
  useGetRoadmapOwnersQuery,
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
} = productRoadmapAPI;
