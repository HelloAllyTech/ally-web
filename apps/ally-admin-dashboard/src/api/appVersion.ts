import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { MinimumAppVersionResponse, UpdateMinimumAppVersionRequest } from "@types";

/**
 * The mobile force-update threshold — see MinimumAppVersionResponse's own doc
 * comment. The two GET endpoints are public/no-auth on the backend (clients
 * read them on every launch), but the PUT is gated behind edit:global-settings
 * the same as everywhere else this setting is touched.
 */
const appVersionAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getMinimumIosVersion: builder.query<MinimumAppVersionResponse, void>({
      query: () => ({ url: ApiEndpoints.APP_VERSION.IOS }),
      providesTags: [TAG_TYPES.MIN_APP_VERSION],
    }),

    getMinimumAndroidVersion: builder.query<MinimumAppVersionResponse, void>({
      query: () => ({ url: ApiEndpoints.APP_VERSION.ANDROID }),
      providesTags: [TAG_TYPES.MIN_APP_VERSION],
    }),

    // Real-production, immediately-effective action — see the confirmation
    // copy in MobileReleases.tsx for the actual safety framing shown to the
    // operator. Re-fetches both minimum-version reads on success so the
    // admin page reflects the new threshold without a manual refresh.
    updateMinimumAppVersion: builder.mutation<void, UpdateMinimumAppVersionRequest>({
      query: body => ({
        url: ApiEndpoints.APP_VERSION.UPDATE,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.MIN_APP_VERSION],
    }),
  }),
});

export const {
  useGetMinimumIosVersionQuery,
  useGetMinimumAndroidVersionQuery,
  useUpdateMinimumAppVersionMutation,
} = appVersionAPI;
