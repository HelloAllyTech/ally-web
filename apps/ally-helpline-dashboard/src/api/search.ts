import { GetSearchResultsRequest, GetSearchResultsResponse } from "@/types/search";

import { baseAPI } from "./baseAPI";

const searchAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getSearchResults: builder.mutation<GetSearchResultsResponse, GetSearchResultsRequest>({
      query: (body) => ({
        url: `/reference-document/search`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetSearchResultsMutation } = searchAPI;