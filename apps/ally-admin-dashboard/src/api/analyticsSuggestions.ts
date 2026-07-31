import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  AcceptAnalyticsSuggestionRequest,
  AcceptAnalyticsSuggestionResponse,
  AnalyticsSuggestion,
  AnalyticsSuggestionStatusFilter,
  AnalyticsSuggestionsResponse,
  GenerateAnalyticsSuggestionsRequest,
  GenerateAnalyticsSuggestionsResponse,
  RejectAnalyticsSuggestionRequest,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Analytics Suggestions endpoints.
 *
 * Unlike the rest of the analytics slice — read-only aggregates with no tags —
 * this is a queue that mutates, so every endpoint participates in invalidation.
 * Accept invalidates the ROADMAP's tags as well as its own: filing an opportunity
 * from here must refresh the board and its facet counts, or a reviewer who
 * switches tabs sees a roadmap that is missing the item they just filed.
 */
export const analyticsSuggestionsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getAnalyticsSuggestions: builder.query<
      AnalyticsSuggestionsResponse,
      { status?: AnalyticsSuggestionStatusFilter }
    >({
      query: ({ status } = {}) => ({
        url: ApiEndpoints.ANALYTICS_SUGGESTIONS.LIST,
        method: HttpMethod.GET,
        // Omitted rather than sent empty: RTK keys the cache on the arg object, so
        // an explicit `undefined` would fragment it across identical requests.
        params: status ? { status } : {},
      }),
      providesTags: [{ type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" }],
    }),

    /**
     * One Generate run. Slow by nature (up to ~2 minutes: it reads fifteen
     * analytics sections, then drafts), so callers must show a bounded progress
     * narrative rather than an open-ended spinner.
     */
    generateAnalyticsSuggestions: builder.mutation<
      GenerateAnalyticsSuggestionsResponse,
      GenerateAnalyticsSuggestionsRequest
    >({
      query: body => ({
        url: ApiEndpoints.ANALYTICS_SUGGESTIONS.GENERATE,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [{ type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" }],
    }),

    acceptAnalyticsSuggestion: builder.mutation<
      AcceptAnalyticsSuggestionResponse,
      { id: string; body: AcceptAnalyticsSuggestionRequest }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.ANALYTICS_SUGGESTIONS.ACCEPT(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [
        { type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" },
        { type: TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES, id: "LIST" },
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
      ],
    }),

    rejectAnalyticsSuggestion: builder.mutation<
      AnalyticsSuggestion,
      { id: string; body: RejectAnalyticsSuggestionRequest }
    >({
      query: ({ id, body }) => ({
        url: ApiEndpoints.ANALYTICS_SUGGESTIONS.REJECT(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [{ type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" }],
    }),
  }),
});

export const {
  useGetAnalyticsSuggestionsQuery,
  useGenerateAnalyticsSuggestionsMutation,
  useAcceptAnalyticsSuggestionMutation,
  useRejectAnalyticsSuggestionMutation,
} = analyticsSuggestionsAPI;
