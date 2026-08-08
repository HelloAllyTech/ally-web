import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  GetPracticeStreakQueryParams,
  PracticeStreakResponse,
  PracticeStreakSummary,
} from "@types";

import { baseAPI } from "./baseAPI";

const practiceStreakAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPracticeStreak: builder.query<PracticeStreakResponse, GetPracticeStreakQueryParams>({
      query: (params: GetPracticeStreakQueryParams) => ({
        url: ApiEndpoints.PRACTICE_STREAK.GET_PRACTICE_STREAK,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.PRACTICE_STREAK],
    }),

    /**
     * Streak state without the heatmap cells.
     *
     * Takes no argument (`void`, not `{}`) on purpose: RTK Query keys the cache
     * by (endpoint, serialized args), so every subscriber across the app shares
     * one cache entry and one in-flight request. That is what stops a persistent
     * nav indicator from firing its own query on every route.
     */
    getPracticeStreakSummary: builder.query<PracticeStreakSummary, void>({
      query: () => ({
        url: ApiEndpoints.PRACTICE_STREAK.GET_PRACTICE_STREAK_SUMMARY,
        method: HttpMethod.GET,
      }),
      // Same tag as the full endpoint, so one invalidation refreshes both and
      // the surfaces can never disagree with each other.
      providesTags: [TAG_TYPES.PRACTICE_STREAK],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetPracticeStreakQuery, useGetPracticeStreakSummaryQuery } = practiceStreakAPI;
