import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { BugHunterSettings, BugHuntRunDetail, ListBugHuntRunsResponse } from "@types";

import { baseAPI } from "./baseApi";

/**
 * Bug Hunter admin surface: the kill switch and run history/detail. The
 * live event stream (SSE) is NOT an RTK Query endpoint — see
 * `useBugHuntStream` — because RTK Query's cache model doesn't fit a
 * long-lived server-push connection.
 */
export const bugHunterAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getBugHunterSettings: builder.query<BugHunterSettings, void>({
      query: () => ({
        url: ApiEndpoints.BUG_HUNTER.SETTINGS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.BUG_HUNTER_SETTINGS],
    }),

    updateBugHunterSettings: builder.mutation<BugHunterSettings, { enabled: boolean }>({
      query: body => ({
        url: ApiEndpoints.BUG_HUNTER.SETTINGS,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.BUG_HUNTER_SETTINGS],
    }),

    getBugHuntRuns: builder.query<ListBugHuntRunsResponse, void>({
      query: () => ({
        url: ApiEndpoints.BUG_HUNTER.RUNS,
        method: HttpMethod.GET,
      }),
      providesTags: [{ type: TAG_TYPES.BUG_HUNTER_RUNS, id: "LIST" }],
    }),

    getBugHuntRun: builder.query<BugHuntRunDetail, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.RUN_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, id) => [{ type: TAG_TYPES.BUG_HUNTER_RUNS, id }],
    }),
  }),
});

export const {
  useGetBugHunterSettingsQuery,
  useUpdateBugHunterSettingsMutation,
  useGetBugHuntRunsQuery,
  useGetBugHuntRunQuery,
} = bugHunterAPI;
