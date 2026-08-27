/**
 * User preferences APIs
 */
import { ApiEndpoints, HttpMethod } from "@constants";
import { UserPreferences } from "@types";

import { baseAPI } from "./baseAPI";

// Exported (not just its generated hooks) so callers that need a typed
// `baseAPI.util.updateQueryData("getUserPreferences", ...)` — e.g. an
// optimistic cache patch ahead of the mutation actually resolving — have an
// api reference TypeScript knows these two endpoints are injected on.
// Mirrors ally-admin-dashboard's `authAPI` export in api/auth.ts.
export const userAPI = baseAPI.injectEndpoints({
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
} = userAPI;
