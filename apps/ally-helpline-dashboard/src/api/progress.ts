import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { ProgressResponse, ProgressSummary } from "@types";

import { baseAPI } from "./baseAPI";

const progressAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Level state without the dashboard payload.
     *
     * Takes no argument (`void`, not `{}`) on purpose, the same way the streak summary
     * does: RTK Query keys the cache by (endpoint, serialized args), and `{}` is a fresh
     * object identity on every call site. `void` is what lets the nav indicator mount on
     * every route for one request rather than one per screen.
     */
    getProgressSummary: builder.query<ProgressSummary, void>({
      query: () => ({
        url: ApiEndpoints.PROGRESS.GET_PROGRESS_SUMMARY,
        method: HttpMethod.GET,
      }),
      // Shared with the full endpoint so one invalidation refreshes both and the nav
      // indicator can never disagree with the page it links to.
      providesTags: [TAG_TYPES.PROGRESS],
      keepUnusedDataFor: 300,
    }),

    getProgress: builder.query<ProgressResponse, void>({
      query: () => ({
        url: ApiEndpoints.PROGRESS.GET_PROGRESS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PROGRESS],
    }),

    /**
     * Own-org toggle — any authenticated user can read it, no permission required.
     * The nav has to ask before it knows whether to render the indicator at all.
     */
    getProgressEnabled: builder.query<boolean, void>({
      query: () => ({
        url: ApiEndpoints.PROGRESS.GET_PROGRESS_ENABLED,
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const { useGetProgressQuery, useGetProgressSummaryQuery, useGetProgressEnabledQuery } =
  progressAPI;
