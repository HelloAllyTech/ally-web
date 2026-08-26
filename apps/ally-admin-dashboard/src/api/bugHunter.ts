import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  BugFinding,
  BugFindingDetail,
  BugFindingRef,
  BugFindingStage,
  BugHunterMode,
  BugHunterNotification,
  ListBugHunterNotificationsResponse,
  BugHunterSettings,
  BugHuntRun,
  BugHuntRunDetail,
  ListBugFindingsQuery,
  ListBugFindingsResponse,
  ListBugHuntRunsResponse,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Bug Hunter admin surface: the kill switch, the comprehensive findings
 * table, and run history/detail.
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

    /**
     * Ask Bug Hunter to sweep a repo now. Returns the opened run, or
     * `{skipped:true}` when the kill switch is off — the backend records a
     * `skipped_disabled` run in that case, so an off-duty press still leaves an
     * audit trail rather than appearing to do nothing.
     */
    triggerBugHuntSweep: builder.mutation<
      BugHuntRun | { skipped: true; reason: string },
      { repo: string; deep?: boolean }
    >({
      query: body => ({
        url: ApiEndpoints.BUG_HUNTER.RUNS_TRIGGER,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [{ type: TAG_TYPES.BUG_HUNTER_RUNS, id: "LIST" }],
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

    /**
     * Start a fix session for one bug. `repo` is only sent when the finding
     * doesn't already have one — the usual case for a bug a human reported as
     * free text, where the admin picks the codebase in the confirm dialog.
     */
    startBugFixSession: builder.mutation<BugFinding, { id: string; repo?: string }>({
      query: ({ id, repo }) => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_FIX_SESSION(id),
        method: HttpMethod.POST,
        body: repo ? { repo } : {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
        // A fix session opens a bug_hunt_runs row, so run history is stale too.
        { type: TAG_TYPES.BUG_HUNTER_RUNS, id: "LIST" },
      ],
    }),

    /**
     * The manual kill switch for a fix session that's clearly stuck or
     * looping: cancels the actual GitHub Actions run — real compute/token
     * savings, not just a status change — and lands the finding at
     * CANCELLED. Only valid from QUEUED or FIXING; the backend 403s
     * otherwise, which is why the button gates on the same condition.
     */
    cancelBugFixSession: builder.mutation<BugFinding, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_CANCEL_FIX_SESSION(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),

    /**
     * Promote a merged fix to production. The response only confirms the
     * release was *dispatched* — the outcome lands minutes later, reconciled
     * from the GitHub run, so the UI must not present this as "released".
     */
    releaseBugFinding: builder.mutation<BugFinding, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_RELEASE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),

    /**
     * Bug Hunter's inbox. This is the ONLY channel it speaks on — escalations,
     * run summaries and release outcomes used to go to Slack and now land here.
     */
    getBugHunterNotifications: builder.query<
      ListBugHunterNotificationsResponse,
      { unreadOnly?: boolean } | void
    >({
      query: params => ({
        url: ApiEndpoints.BUG_HUNTER.NOTIFICATIONS,
        method: HttpMethod.GET,
        params: params || undefined,
      }),
      providesTags: [{ type: TAG_TYPES.BUG_HUNTER_NOTIFICATIONS, id: "LIST" }],
    }),

    markBugHunterNotificationRead: builder.mutation<BugHunterNotification, string>({
      query: id => ({
        url: ApiEndpoints.BUG_HUNTER.NOTIFICATION_READ(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [{ type: TAG_TYPES.BUG_HUNTER_NOTIFICATIONS, id: "LIST" }],
    }),

    markAllBugHunterNotificationsRead: builder.mutation<{ unreadCount: number }, void>({
      query: () => ({
        url: ApiEndpoints.BUG_HUNTER.NOTIFICATIONS_READ_ALL,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [{ type: TAG_TYPES.BUG_HUNTER_NOTIFICATIONS, id: "LIST" }],
    }),

    /**
     * Rewrite the bug's description before putting Bug Hunter on it. This text
     * is the fix agent's entire brief — see ally-be's `buildFixSessionPrompt`
     * — so an edit here changes what the NEXT session is asked to fix, and
     * nothing about the bug's status.
     */
    editBugFindingDescription: builder.mutation<BugFinding, { id: string; description: string }>({
      query: ({ id, description }) => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_DESCRIPTION(id),
        method: HttpMethod.PATCH,
        body: { description },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
        // The table's row shows the title, not the description — but the
        // duplicate-title grouping and the drawer both read the list cache,
        // and a row whose drawer disagrees with it reads as a bug.
        { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
      ],
    }),

    /**
     * Resolve a roadmap opportunity id to the bug it became, for the roadmap's
     * deep-link redirect. See ally-be's `getFindingByReportedBug`.
     */
    getBugFindingByReportedBug: builder.query<BugFindingRef, string>({
      query: opportunityId => ({
        url: ApiEndpoints.BUG_HUNTER.FINDING_BY_REPORTED_BUG(opportunityId),
      }),
    }),

    /**
     * Pin the coarse roadmap stage by hand, or (with `stage: null`) hand it back
     * to being derived from the pipeline status.
     *
     * For the bug fixed OUTSIDE Bug Hunter — a hand-written PR, a config change,
     * a fix that rode along with unrelated work — where the pipeline never moved
     * and the status therefore still reads NEW. Pinning sticks: later transitions
     * no longer move the stage.
     */
    setBugFindingStage: builder.mutation<BugFinding, { id: string; stage: BugFindingStage | null }>(
      {
        query: ({ id, stage }) => ({
          url: ApiEndpoints.BUG_HUNTER.FINDING_STAGE(id),
          method: HttpMethod.PATCH,
          body: { stage },
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id },
          // The stage renders in the table row as well as the drawer, so the list
          // cache has to go too — a row still reading "New" behind a drawer saying
          // "Released" is exactly the kind of disagreement that reads as a bug.
          { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
        ],
      },
    ),

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
  useTriggerBugHuntSweepMutation,
  useGetBugHuntRunQuery,
  useGetBugFindingsQuery,
  useGetBugFindingQuery,
  useApproveBugFindingMutation,
  useRejectBugFindingMutation,
  useAnswerBugFindingMutation,
  useEditBugFindingDescriptionMutation,
  useSetBugFindingStageMutation,
  useGetBugFindingByReportedBugQuery,
  useStartBugFixSessionMutation,
  useCancelBugFixSessionMutation,
  useReleaseBugFindingMutation,
  useGetBugHunterNotificationsQuery,
  useMarkBugHunterNotificationReadMutation,
  useMarkAllBugHunterNotificationsReadMutation,
} = bugHunterAPI;
