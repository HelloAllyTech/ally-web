import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { AchievementItemDataResponse, GetMyBadgesResponse, ViewedStatus } from "@types";

import { baseAPI } from "./baseAPI";

export interface GetMyBadgesParams {
  viewedStatus?: ViewedStatus;
}

export interface GetBadgesCountResponse {
  count: number;
}

export interface GetBadgesCountParams {
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
      providesTags: (result, error, params) => [
        {
          type: TAG_TYPES.BADGES,
          id: `LIST-${params.viewedStatus ?? ViewedStatus.VIEWED}`,
        },
      ],
    }),

    /**
     * Retrieves the count of badges for the current user.
     * @returns {Promise<number>} The count of badges
     */
    getBadgesCount: builder.query<GetBadgesCountResponse, GetBadgesCountParams>({
      query: params => ({
        url: ApiEndpoints.BADGES.GET_BADGES_COUNT,
        params,
      }),
      providesTags: (result, error, params) => [
        {
          type: TAG_TYPES.BADGES,
          id: `LIST-${params.viewedStatus ?? ViewedStatus.VIEWED}`,
        },
      ],
    }),

    /**
     * Updates the view status of a badge for the current user.
     * @param {string} badgeId - The ID of the badge to update
     * @returns {Promise<void>} The updated badge
     */
    updateBadgeViewStatus: builder.mutation<void, string>({
      query: badgeId => ({
        url: ApiEndpoints.BADGES.UPDATE_BADGE_VIEW_STATUS(badgeId),
        method: HttpMethod.PATCH,
      }),
      invalidatesTags: [
        {
          type: TAG_TYPES.BADGES,
          id: `LIST-${ViewedStatus.VIEWED}`,
        },
      ],
    }),
  }),
});

export const {
  useGetAvailableBadgesQuery,
  useGetMyBadgesQuery,
  useGetBadgesCountQuery,
  useUpdateBadgeViewStatusMutation,
} = badgesAPI;
