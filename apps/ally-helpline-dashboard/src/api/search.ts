import { GetSearchResultsRequest, GetSearchResultsResponse } from "@/types/search";

import { baseAPI } from "./baseAPI";

const searchAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCategories: builder.query<string[], void>({
      query: () => ({
        url: "/reference-document/categories",
        method: "GET",
      }),
    }),
    getSearchResults: builder.mutation<GetSearchResultsResponse, GetSearchResultsRequest>({
      query: body => ({
        url: "/reference-document/search",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useGetSearchResultsMutation, useGetCategoriesQuery } = searchAPI;
