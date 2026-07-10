import { ApiEndpoints, HttpMethod } from "@constants";
import { GetPracticeStreakQueryParams, PracticeStreakResponse } from "@types";

import { baseAPI } from "./baseAPI";

const practiceStreakAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getPracticeStreak: builder.query<PracticeStreakResponse, GetPracticeStreakQueryParams>({
      query: (params: GetPracticeStreakQueryParams) => ({
        url: ApiEndpoints.PRACTICE_STREAK.GET_PRACTICE_STREAK,
        method: HttpMethod.GET,
        params,
      }),
    }),
  }),
});

export const { useGetPracticeStreakQuery } = practiceStreakAPI;
