import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { GetReviewsInput, GetReviewsResponse, GetReviewThreadsResponse } from "@types";

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
      providesTags: [TAG_TYPES.REVIEW],
      transformResponse: (response: any) => response.data,
    }),
    /**
     * Creates a new review.
     * @param {string} scenarioSessionId - The ID of the scenario session
     * @returns {Promise<Review>} Review data
     */
    createReview: builder.mutation({
      query: ({ scenarioSessionId }) => ({
        url: ApiEndpoints.REVIEWS.CREATE_REVIEW,
        method: HttpMethod.POST,
        body: { scenarioSessionId },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY, TAG_TYPES.REVIEW],
    }),
    /**
     * Updates a review.
     * @param {string} id - The ID of the review
     * @param {string} status - The status of the review
     * @returns {Promise<Review>} Review data
     */
    updateReview: builder.mutation({
      query: ({ id, status }) => ({
        url: ApiEndpoints.REVIEWS.UPDATE_REVIEW(id),
        method: HttpMethod.PATCH,
        body: { status },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY],
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
      invalidatesTags: [TAG_TYPES.REVIEW],
    }),
    getReviewThreads: builder.query<GetReviewThreadsResponse, { id: string }>({
      query: ({ id }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_THREADS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.REVIEW],
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
} = reviewsAPI;
