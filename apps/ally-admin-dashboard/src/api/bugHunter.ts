import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  BugFindingDetail,
  BugHunterMode,
  BugHunterSettings,
  BugHuntRunDetail,
  ListBugFindingsQuery,
  ListBugFindingsResponse,
  ListBugHuntRunsResponse,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Bug Hunter admin surface: the kill switch, the comprehensive findings
 * table, and run history/detail. The live event stream (SSE) is NOT an RTK
 * Query endpoint — see `useBugHuntStream` — because RTK Query's cache model
 * doesn't fit a long-lived server-push connection.
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

    updateBugHunterSettings: builder.mutation<BugHunterSettings, { mode: BugHunterMode }>({
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

    getBugFindings: builder.query<ListBugFindingsResponse, ListBugFindingsQuery | void>({
      query: query => ({
        url: ApiEndpoints.BUG_HUNTER.FINDINGS,
        method: HttpMethod.GET,
        params: query || undefined,
      }),
      providesTags: [{ type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" }],
    }),

    getBugFinding: builder.query<BugFindingDetail, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, id) => [{ type: TAG_TYPES.BUG_HUNTER_FINDINGS, id }],
    }),

    approveBugFinding: builder.mutation<BugFindingDetail, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_APPROVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),

    rejectBugFinding: builder.mutation<BugFindingDetail, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_REJECT(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),

    answerBugFinding: builder.mutation<BugFindingDetail, { id: string; answer: string }>({
      query: ({ id, answer }) => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_ANSWER(id),
        method: HttpMethod.POST,
        body: { answer },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetBugHunterSettingsQuery,
  useUpdateBugHunterSettingsMutation,
  useGetBugHuntRunsQuery,
  useGetBugHuntRunQuery,
  useGetBugFindingsQuery,
  useGetBugFindingQuery,
  useApproveBugFindingMutation,
  useRejectBugFindingMutation,
  useAnswerBugFindingMutation,
} = bugHunterAPI;
