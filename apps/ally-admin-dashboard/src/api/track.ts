import { ApiEndpoints } from "@constants";
import { baseAPI } from "./baseApi";

interface CompletedLearnersCountResponse {
  count: number;
}

interface CriteriaHistoryResponse {
  oldValue: any;
  newValue: any;
  updatedAt: string;
  updatedBy: {
    id: number;
    name: string;
  } | null;
}

export const trackAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCompletedLearnersCount: builder.query<CompletedLearnersCountResponse, string>({
      query: (itemId: string) => ({
        url: `${ApiEndpoints.TRACKS.ITEMS}/${itemId}/completed-learners-count`,
      }),
    }),
    getCriteriaHistory: builder.query<CriteriaHistoryResponse[], string>({
      query: (itemId: string) => ({
        url: `${ApiEndpoints.TRACKS.ITEMS}/${itemId}/criteria-history`,
      }),
    }),
  }),
});

export const { useGetCompletedLearnersCountQuery, useGetCriteriaHistoryQuery } = trackAPI;
