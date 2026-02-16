import { baseAPI } from "@src/api/baseApi";
import { ApiEndpoints } from "@src/constants";
import { GetUserBadgesResponse } from "@src/types/userBages";

const userBadgesAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getUserBadges: builder.query<GetUserBadgesResponse, void>({
      query: () => ({
        url: ApiEndpoints.USER_BADGES.GET_BADGES,
      }),
    }),
  }),
});

export const { useGetUserBadgesQuery } = userBadgesAPI;
