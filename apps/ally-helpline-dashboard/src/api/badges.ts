import { ApiEndpoints } from "@constants";
import { AchievementItemDataResponse, GetMyBadgesResponse, ViewedStatus } from "@types";

import { baseAPI } from "./baseAPI";

export interface GetMyBadgesParams {
  viewedStatus?: ViewedStatus;
}

const badgesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Retrieves available badges grouped by category.
     * @returns {Promise<AchievementItemDataResponse[]>} Badges grouped by category
     */
    getAvailableBadges: builder.query<AchievementItemDataResponse[], void>({
      query: () => ({
        url: ApiEndpoints.BADGES.GET_AVAILABLE_BADGES,
      }),
    }),

    /**
     * Retrieves user's earned badges with optional filter.
     * @param {GetMyBadgesParams} params - Query parameters for filtering
     * @returns {Promise<GetMyBadgesResponse>} User's earned badges
     */
    getMyBadges: builder.query<GetMyBadgesResponse, GetMyBadgesParams>({
      query: params => ({
        url: ApiEndpoints.BADGES.GET_MY_BADGES,
        params,
      }),
    }),
  }),
});

export const { useGetAvailableBadgesQuery, useGetMyBadgesQuery } = badgesAPI;
