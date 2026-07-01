/**
 * Learn module APIs
 *
 * This module provides all Learn/Training related endpoints including:
 * - Scenarios catalog (list and detail)
 * - Simulation room lifecycle (list, create, delete)
 */
import { ApiEndpoints, HttpMethod } from "@constants";
import { UserPreferences } from "@types";

import { baseAPI } from "./baseAPI";

const learnAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get user preferences
     * @returns {Promise<{ data: UserPreferences }>} User preferences
     */
    getUserPreferences: builder.query<{ data: UserPreferences }, void>({
      query: () => ({
        url: ApiEndpoints.USER.GET_USER_PREFERENCES,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Update user's preferences
     * @param {object} preferences - Any user preferences object (e.g., { default_language_id: 12 })
     * @returns {Promise<{ success: boolean }>} Success status
     */
    updateUserPreferences: builder.mutation<{ success: boolean }, Record<string, any>>({
      query: preferences => ({
        url: ApiEndpoints.USER.UPDATE_USER_PREFERENCES,
        method: HttpMethod.POST,
        body: preferences,
      }),
    }),
  }),
});

export const {
  useGetUserPreferencesQuery,
  useLazyGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} = learnAPI;
