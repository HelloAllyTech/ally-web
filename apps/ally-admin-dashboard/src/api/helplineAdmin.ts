import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { HelplineAdminSettingsDto, UpdateHelplineAdminSettingsBody } from "@types";

/**
 * Text helpline org settings (platform admin only).
 *
 * Both routes answer with the full `HelplineAdminSettingsDto`, so a successful PUT writes that
 * straight into the GET's cache entry (`upsertQueryData` — unlike an optimistic patch it creates the
 * entry if nobody has read it yet). The tag invalidation stays as the backstop that re-reads the
 * server's view. The Text helpline tab keeps its own local copy of the form and the enable switch, so
 * nothing on screen depends on this cache moving first.
 */
export const helplineAdminAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getHelplineAdminSettings: builder.query<HelplineAdminSettingsDto, string>({
      query: tenantId => ({
        url: ApiEndpoints.HELPLINE_ADMIN.SETTINGS,
        method: HttpMethod.GET,
        params: { tenantId },
      }),
      providesTags: (_result, _error, tenantId) => [
        { type: TAG_TYPES.HELPLINE_ADMIN_SETTINGS, id: tenantId },
      ],
    }),

    updateHelplineAdminSettings: builder.mutation<
      HelplineAdminSettingsDto,
      UpdateHelplineAdminSettingsBody
    >({
      query: body => ({
        url: ApiEndpoints.HELPLINE_ADMIN.SETTINGS,
        method: HttpMethod.PUT,
        body,
      }),
      async onQueryStarted({ tenantId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            helplineAdminAPI.util.upsertQueryData("getHelplineAdminSettings", tenantId, data),
          );
        } catch {
          // The caller's `.unwrap()` surfaces the failure; there is nothing to write back.
        }
      },
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: TAG_TYPES.HELPLINE_ADMIN_SETTINGS, id: tenantId },
      ],
    }),
  }),
});

export const { useGetHelplineAdminSettingsQuery, useUpdateHelplineAdminSettingsMutation } =
  helplineAdminAPI;
