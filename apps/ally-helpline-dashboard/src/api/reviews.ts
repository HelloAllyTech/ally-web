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
  ShareForReviewsScribeInput,
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
     * Retrieves paginated scribe reviews with sorting options.
     * @param {GetReviewsInput} params - Query parameters for pagination and sorting
     * @returns {Promise<GetReviewsResponse>} Paginated scribe reviews data
     */
    getScribeReviews: builder.query<GetReviewsResponse, GetReviewsInput>({
      query: params => ({
        url: ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEWS,
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
      query: ({ id, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_BY_ID(id)
          : ApiEndpoints.REVIEWS.GET_REVIEW_BY_ID(id),
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
      query: ({ id, offset, limit, sortBy, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_DETAILS_AND_MESSAGES(id)
          : ApiEndpoints.REVIEWS.GET_REVIEW_DETAILS_AND_MESSAGES(id),
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
      query: ({ note, status }) => ({
        url: ApiEndpoints.REVIEWS.CREATE_REVIEW,
        method: HttpMethod.POST,
        body: { note, status },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY, TAG_TYPES.REVIEW],
    }),
    /**
     * Updates a review.
     * @param {string} id - The ID of the review
     * @param {string} status - The status of the review
     * @returns {Promise<Review>} Review data
     */
    updateReview: builder.mutation<void, ShareForReviewsInput>({
      query: ({ scenarioSessionId, note, status }) => ({
        url: ApiEndpoints.REVIEWS.UPDATE_REVIEW(scenarioSessionId),
        method: HttpMethod.PATCH,
        body: { note, status },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY, TAG_TYPES.REVIEW],
    }),

    createScribeReview: builder.mutation<void, ShareForReviewsScribeInput>({
      query: body => ({
        url: ApiEndpoints.REVIEWS.CREATE_SCRIBE_REVIEW,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CALL_SUMMARY, TAG_TYPES.REVIEW],
    }),

    updateScribeReview: builder.mutation<void, ShareForReviewsScribeInput>({
      query: ({ scribeSessionId, note, status }) => ({
        url: ApiEndpoints.REVIEWS.UPDATE_SCRIBE_REVIEW(scribeSessionId),
        method: HttpMethod.PATCH,
        body: { note, status },
      }),
      invalidatesTags: [TAG_TYPES.CALL_SUMMARY, TAG_TYPES.REVIEW],
    }),
    /**
     * Creates a new comment for a review.
     * @param {string} reviewId - The ID of the review
     * @param {object} body - The body of the comment containing threadId, parentCommentId, messageId, content, and selection
     * @returns {Promise<ReviewComment>} Comment data
     */
    createComment: builder.mutation({
      query: ({ reviewId, body, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.CREATE_SCRIBE_COMMENT(reviewId)
          : ApiEndpoints.REVIEWS.CREATE_COMMENT(reviewId),
        method: HttpMethod.POST,
        body,
      }),
    }),
    getReviewThreads: builder.query<
      GetReviewThreadsResponse,
      { id: string; limit?: number; offset?: number; isScribe?: boolean }
    >({
      query: ({ id, limit, offset, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_THREADS(id)
          : ApiEndpoints.REVIEWS.GET_REVIEW_THREADS(id),
        method: HttpMethod.GET,
        params: { limit, offset },
      }),
      providesTags: [TAG_TYPES.REVIEW],
    }),
    getReviewThreadComments: builder.query<
      { data: CommentItem[]; count: number },
      { id: string; limit: number; offset: number; isScribe?: boolean }
    >({
      query: ({ id, limit, offset, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_THREAD_COMMENTS(id)
          : ApiEndpoints.REVIEWS.GET_REVIEW_THREAD_COMMENTS(id),
        method: HttpMethod.GET,
        params: { limit, offset, order: "DESC", sortBy: "createdAt" },
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
    }),
    addReaction: builder.mutation<
      boolean,
      { id: string; reaction: ReactionInput; isScribe?: boolean }
    >({
      query: ({ id, reaction, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.ADD_SCRIBE_REACTION(id)
          : ApiEndpoints.REVIEWS.ADD_REACTION(id),
        method: HttpMethod.POST,
        body: reaction,
      }),
      invalidatesTags: [TAG_TYPES.REVIEW],
    }),
    getReviewReactions: builder.query<GetReviewReactionsResponse, GetReviewsReactionsInput>({
      query: ({ reviewId, limit, offset, reaction, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_REACTIONS(reviewId)
          : ApiEndpoints.REVIEWS.GET_REVIEW_REACTIONS(reviewId),
        method: HttpMethod.GET,
        params: { limit, offset, reaction },
      }),
    }),
    getReviewReactionsCount: builder.query<
      Record<string, number>,
      { reviewId: string; isScribe?: boolean }
    >({
      query: ({ reviewId, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_REVIEW_REACTIONS_COUNT(reviewId)
          : ApiEndpoints.REVIEWS.GET_REVIEW_REACTIONS_COUNT(reviewId),
        method: HttpMethod.GET,
      }),
      transformResponse: (response: { reactions: Record<string, number> }) => response.reactions,
    }),
    addCommentReaction: builder.mutation<
      boolean,
      { commentId: string; reaction: ReactionInput; isScribe?: boolean }
    >({
      query: ({ commentId, reaction, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.ADD_SCRIBE_COMMENT_REACTION(commentId)
          : ApiEndpoints.REVIEWS.ADD_COMMENT_REACTION(commentId),
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
    toggleCommentVisibility: builder.mutation<
      void,
      { commentId: string; hidden: boolean; isScribe?: boolean }
    >({
      query: ({ commentId, hidden, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.TOGGLE_SCRIBE_COMMENT_VISIBILITY(commentId)
          : ApiEndpoints.REVIEWS.TOGGLE_COMMENT_VISIBILITY(commentId),
        method: HttpMethod.PATCH,
        body: { hidden },
      }),
    }),

    /**
     * Deletes a comment.
     * @param {string} commentId - The ID of the comment to delete
     * @returns {Promise<void>} Success response
     */
    deleteComment: builder.mutation<void, { commentId: string; isScribe?: boolean }>({
      query: ({ commentId, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.DELETE_SCRIBE_COMMENT(commentId)
          : ApiEndpoints.REVIEWS.DELETE_COMMENT(commentId),
        method: HttpMethod.DELETE,
      }),
    }),

    /**
     * Edits a comment.
     * @param {string} commentId - The ID of the comment to edit
     * @param {string} content - The updated content of the comment
     * @returns {Promise<void>} Success response
     */
    editComment: builder.mutation<void, { commentId: string; content: string; isScribe?: boolean }>(
      {
        query: ({ commentId, content, isScribe = false }) => ({
          url: isScribe
            ? ApiEndpoints.REVIEWS.EDIT_SCRIBE_COMMENT(commentId)
            : ApiEndpoints.REVIEWS.EDIT_COMMENT(commentId),
          method: HttpMethod.PATCH,
          body: { content },
        }),
      },
    ),

    getCommentReplies: builder.query({
      query: ({ commentId, limit, offset, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_COMMENT_REPLIES(commentId)
          : ApiEndpoints.REVIEWS.GET_COMMENT_REPLIES(commentId),
        method: HttpMethod.GET,
        params: { limit, offset, order: "DESC", sortBy: "createdAt" },
      }),
      forceRefetch: () => true,
      providesTags: [TAG_TYPES.REVIEW],
    }),
    getUnreadReviewCount: builder.query<{ count: number }, { isScribe?: boolean }>({
      query: (arg = { isScribe: false }) => {
        const { isScribe = false } = arg;
        return {
          url: isScribe
            ? ApiEndpoints.REVIEWS.GET_SCRIBE_UNREAD_COUNT
            : ApiEndpoints.REVIEWS.GET_UNREAD_COUNT,
        };
      },
      providesTags: [TAG_TYPES.UNREAD_REVIEW_COUNT],
    }),
    markReviewAsRead: builder.mutation<void, { id: string; isScribe?: boolean }>({
      query: ({ id, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.MARK_SCRIBE_READ(id)
          : ApiEndpoints.REVIEWS.MARK_READ(id),
        method: HttpMethod.PATCH,
      }),
      invalidatesTags: [TAG_TYPES.UNREAD_REVIEW_COUNT],
    }),
    getGeneralComments: builder.query<
      { data: CommentItem[]; count: number },
      { reviewId: string; limit: number; offset: number; isScribe?: boolean }
    >({
      query: ({ reviewId, limit, offset, isScribe = false }) => ({
        url: isScribe
          ? ApiEndpoints.REVIEWS.GET_SCRIBE_GENERAL_COMMENTS(reviewId)
          : ApiEndpoints.REVIEWS.GET_GENERAL_COMMENTS(reviewId),
        method: HttpMethod.GET,
        params: { limit, offset, order: "DESC", sortBy: "createdAt" },
      }),
      providesTags: [TAG_TYPES.GENERAL_COMMENTS],
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useGetScribeReviewsQuery,
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
  useGetUnreadReviewCountQuery,
  useMarkReviewAsReadMutation,
  useGetGeneralCommentsQuery,
  useLazyGetGeneralCommentsQuery,
  useCreateScribeReviewMutation,
  useUpdateScribeReviewMutation,
} = reviewsAPI;
