import { ApiEndpoints, HttpMethod } from "@constants";
import { getCurrentUser, getLeaderBoardList, GetLeaderBoardQueryParams } from "@types";

import { baseAPI } from "./baseAPI";

const leaderBoardAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getLeaderBoardList: builder.query<getLeaderBoardList, GetLeaderBoardQueryParams>({
      query: (params: GetLeaderBoardQueryParams) => ({
        url: ApiEndpoints.LEADERBOARD.GET_LEADERBOARD,
        method: HttpMethod.GET,
        params,
      }),
    }),

    getCurrentUser: builder.query<getCurrentUser, { window?: string }>({
      query: (params: { window?: string }) => ({
        url: ApiEndpoints.LEADERBOARD.GET_CURRENT_USER,
        method: HttpMethod.GET,
        params,
      }),
    }),
  }),
});

export const { useGetLeaderBoardListQuery, useGetCurrentUserQuery } = leaderBoardAPI;
