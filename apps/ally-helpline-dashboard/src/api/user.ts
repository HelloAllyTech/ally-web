/**
 * User preferences APIs
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
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
      providesTags: [TAG_TYPES.USER_PREFERENCES],
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
      // The read is cached for the session, so without this a saved
      // preference (e.g. the org-metrics block order) stayed invisible to
      // anything that remounted and re-read it — see the note on
      // SCRIBE_VOICE_NOTE_ENABLED in baseAPI.ts for the same trap.
      invalidatesTags: [TAG_TYPES.USER_PREFERENCES],
    }),
  }),
});

export const {
  useGetUserPreferencesQuery,
  useLazyGetUserPreferencesQuery,
  useUpdateUserPreferencesMutation,
} = userAPI;
