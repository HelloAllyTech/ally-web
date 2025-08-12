/**
 * This module provides all search-related API endpoints including:
 * - Search categories and filters
 * - Search results retrieval and processing
 * - Resource search functionality
 */

import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod } from "@constants";
import { GetSearchResultsRequest, GetSearchResultsResponse } from "@types";

const searchAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Retrieves the list of available search categories and filters
     * that can be used to narrow down search results.
     * @returns {Promise<string[]>} Array of available search categories
     */
    getCategories: builder.query<string[], void>({
      query: () => ({
        url: ApiEndpoints.SEARCH.GET_CATEGORIES,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Performs a search based on the provided criteria and returns
     * matching results with pagination and filtering options.
     * @param {GetSearchResultsRequest} body - Search criteria and parameters
     * @returns {Promise<GetSearchResultsResponse>} Search results with metadata
     */
    getSearchResults: builder.mutation<GetSearchResultsResponse, GetSearchResultsRequest>({
      query: body => ({
        url: ApiEndpoints.SEARCH.GET_SEARCH_RESULTS,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const { useGetSearchResultsMutation, useGetCategoriesQuery } = searchAPI;
