import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  GetReviewsInput,
  GetReviewsResponse,
  GetReviewThreadsResponse,
  ReactionInput,
  GetReviewReactionsResponse,
  GetReviewsReactionsInput,
  CommentItem,
  ShareForReviewsInput,
  UpdateReviewInput,
} from "@types";

import { baseAPI } from "./baseAPI";

const reviewsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Retrieves paginated reviews with sorting options.
     * @param {GetReviewsInput} params - Query parameters for pagination and sorting
     * @returns {Promise<GetReviewsResponse>} Paginated reviews data
     */
    getReviews: builder.query<GetReviewsResponse, GetReviewsInput>({
      query: params => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEWS,
        params,
      }),
      providesTags: [TAG_TYPES.REVIEW],
    }),
    /**
     * Retrieves a review by its ID.
     * @param {string} id - The ID of the review
     * @returns {Promise<Review>} Review data
     */
    getReviewById: builder.query({
      query: (id: string) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_BY_ID(id),
        method: HttpMethod.GET,
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
    }),
    /**
     * Retrieves the details and messages of a review.
     * @param {string} id - The ID of the review
     * @param {number} offset - The offset of the messages
     * @param {number} limit - The limit of the messages
     * @param {string} sortBy - The field to sort the messages by
     * @returns {Promise<ReviewDetailsWithMessages>} Review details and messages data
     */
    getReviewDetailsWithMessages: builder.query({
      query: ({ id, offset, limit, sortBy }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_DETAILS_AND_MESSAGES(id),
        method: HttpMethod.GET,
        params: { offset, limit, sortOrder: "ASC", sortBy },
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
      transformResponse: (response: any) => response.data,
    }),
    /**
     * Creates a new review.
     * @param {string} scenarioSessionId - The ID of the scenario session
     * @returns {Promise<Review>} Review data
     */
    createReview: builder.mutation<void, ShareForReviewsInput>({
      query: body => ({
        url: ApiEndpoints.REVIEWS.CREATE_REVIEW,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY, TAG_TYPES.REVIEW],
    }),
    /**
     * Updates a review.
     * @param {string} id - The ID of the review
     * @param {string} status - The status of the review
     * @returns {Promise<Review>} Review data
     */
    updateReview: builder.mutation<void, { id: string; updateReviewInput: UpdateReviewInput }>({
      query: ({ id, updateReviewInput: body }) => ({
        url: ApiEndpoints.REVIEWS.UPDATE_REVIEW(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY, TAG_TYPES.REVIEW],
    }),
    /**
     * Creates a new comment for a review.
     * @param {string} reviewId - The ID of the review
     * @param {object} body - The body of the comment containing threadId, parentCommentId, messageId, content, and selection
     * @returns {Promise<ReviewComment>} Comment data
     */
    createComment: builder.mutation({
      query: ({ reviewId, body }) => ({
        url: ApiEndpoints.REVIEWS.CREATE_COMMENT(reviewId),
        method: HttpMethod.POST,
        body,
      }),
    }),
    getReviewThreads: builder.query<
      GetReviewThreadsResponse,
      { id: string; limit?: number; offset?: number }
    >({
      query: ({ id, limit, offset }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_THREADS(id),
        method: HttpMethod.GET,
        params: { limit, offset },
      }),
      providesTags: [TAG_TYPES.REVIEW],
    }),
    getReviewThreadComments: builder.query<
      { data: CommentItem[]; count: number },
      { id: string; limit: number; offset: number }
    >({
      query: ({ id, limit, offset }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_THREAD_COMMENTS(id),
        method: HttpMethod.GET,
        params: { limit, offset },
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
    }),
    addReaction: builder.mutation<boolean, { id: string; reaction: ReactionInput }>({
      query: ({ id, reaction }) => ({
        url: ApiEndpoints.REVIEWS.ADD_REACTION(id),
        method: HttpMethod.POST,
        body: reaction,
      }),
      invalidatesTags: [TAG_TYPES.REVIEW],
    }),
    getReviewReactions: builder.query<GetReviewReactionsResponse, GetReviewsReactionsInput>({
      query: ({ reviewId, limit, offset, reaction }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_REACTIONS(reviewId),
        method: HttpMethod.GET,
        params: { limit, offset, reaction },
      }),
    }),
    getReviewReactionsCount: builder.query<Record<string, number>, { reviewId: string }>({
      query: ({ reviewId }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_REACTIONS_COUNT(reviewId),
        method: HttpMethod.GET,
      }),
      transformResponse: (response: { reactions: Record<string, number> }) => response.reactions,
    }),
    addCommentReaction: builder.mutation<boolean, { commentId: string; reaction: ReactionInput }>({
      query: ({ commentId, reaction }) => ({
        url: ApiEndpoints.REVIEWS.ADD_COMMENT_REACTION(commentId),
        method: HttpMethod.POST,
        body: reaction,
      }),
    }),
    /**
     * Toggles the visibility of a comment (hide/unhide).
     * @param {string} commentId - The ID of the comment
     * @param {boolean} hidden - Whether the comment should be hidden
     * @returns {Promise<void>} Success response
     */
    toggleCommentVisibility: builder.mutation<void, { commentId: string; hidden: boolean }>({
      query: ({ commentId, hidden }) => ({
        url: ApiEndpoints.REVIEWS.TOGGLE_COMMENT_VISIBILITY(commentId),
        method: HttpMethod.PATCH,
        body: { hidden },
      }),
    }),

    /**
     * Deletes a comment.
     * @param {string} commentId - The ID of the comment to delete
     * @returns {Promise<void>} Success response
     */
    deleteComment: builder.mutation<void, { commentId: string }>({
      query: ({ commentId }) => ({
        url: ApiEndpoints.REVIEWS.DELETE_COMMENT(commentId),
        method: HttpMethod.DELETE,
      }),
    }),

    /**
     * Edits a comment.
     * @param {string} commentId - The ID of the comment to edit
     * @param {string} content - The updated content of the comment
     * @returns {Promise<void>} Success response
     */
    editComment: builder.mutation<void, { commentId: string; content: string }>({
      query: ({ commentId, content }) => ({
        url: ApiEndpoints.REVIEWS.EDIT_COMMENT(commentId),
        method: HttpMethod.PATCH,
        body: { content },
      }),
    }),

    getCommentReplies: builder.query({
      query: ({ commentId, limit, offset }) => ({
        url: ApiEndpoints.REVIEWS.GET_COMMENT_REPLIES(commentId),
        method: HttpMethod.GET,
        params: { limit, offset },
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
    }),

    getGeneralComments: builder.query<
      { data: CommentItem[]; count: number },
      { reviewId: string; limit: number; offset: number }
    >({
      query: ({ reviewId, limit, offset }) => ({
        url: ApiEndpoints.REVIEWS.GET_GENERAL_COMMENTS(reviewId),
        method: HttpMethod.GET,
        params: { limit, offset },
      }),
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useGetReviewByIdQuery,
  useGetReviewDetailsWithMessagesQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useCreateCommentMutation,
  useGetReviewThreadsQuery,
  useLazyGetReviewThreadsQuery,
  useAddReactionMutation,
  useGetReviewReactionsQuery,
  useLazyGetReviewReactionsQuery,
  useGetReviewReactionsCountQuery,
  useAddCommentReactionMutation,
  useToggleCommentVisibilityMutation,
  useEditCommentMutation,
  useDeleteCommentMutation,
  useLazyGetCommentRepliesQuery,
  useGetReviewThreadCommentsQuery,
  useGetGeneralCommentsQuery,
  useLazyGetGeneralCommentsQuery,
} = reviewsAPI;
