import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { GetReviewsInput, GetReviewsResponse } from "@types";

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
    }),
    getReviewDetailsWithMessages: builder.query({
      query: ({ id, offset, limit, sortBy }) => ({
        url: ApiEndpoints.REVIEWS.GET_REVIEW_DETAILS_AND_MESSAGES(id),
        method: HttpMethod.GET,
        params: { offset, limit, sortOrder: "ASC", sortBy },
      }),
      providesTags: [TAG_TYPES.REVIEW],
      transformResponse: (response: any) => response.data,
    }),
    createReview: builder.mutation({
      query: ({ scenarioSessionId }) => ({
        url: ApiEndpoints.REVIEWS.CREATE_REVIEW,
        method: HttpMethod.POST,
        body: { scenarioSessionId },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY],
    }),
    updateReview: builder.mutation({
      query: ({ id, status }) => ({
        url: ApiEndpoints.REVIEWS.UPDATE_REVIEW(id),
        method: HttpMethod.PATCH,
        body: { status },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_SUMMARY],
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useGetReviewDetailsWithMessagesQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
} = reviewsAPI;
