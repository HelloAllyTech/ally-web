import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  BuilderArchivedSessionsPage,
  BuilderBudgetState,
  BuilderBuildEvent,
  BuilderBuildRun,
  BuilderExemplar,
  BuilderLesson,
  BuilderLessonStatus,
  BuilderNotification,
  BuilderPendingQuestion,
  BuilderPrdVersion,
  BuilderPullRequest,
  BuilderReport,
  BuilderRepoCommand,
  BuilderRepoMapSummary,
  BuilderRunStatus,
  BuilderScoreboard,
  BuilderSession,
  BuilderSessionDetail,
  BuilderSessionStatus,
  BuilderSettings,
  CreateBuilderSessionRequest,
  PatchBuilderLessonRequest,
  PatchBuilderPrdRequest,
  PatchBuilderPrdResponse,
  UpdateBuilderSessionRequest,
} from "@types";

import { baseAPI } from "./baseApi";

/**
 * Builder admin surface: sessions, the living PRD, and the reference data the
 * interview reads.
 *
 * The interview turn itself is NOT here — it is an SSE stream driven by
 * `useBuilderStream` (RTK Query cannot consume one). Anything that turn
 * changes server-side is picked up by invalidating BUILDER_SESSION when the
 * stream finishes.
 */
export const builderAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getBuilderSessions: builder.query<BuilderSession[], { status?: BuilderSessionStatus[] } | void>(
      {
        query: params => ({
          url: ApiEndpoints.BUILDER.SESSIONS,
          method: HttpMethod.GET,
          params: params && params.status?.length ? { status: params.status } : undefined,
        }),
        providesTags: [TAG_TYPES.BUILDER_SESSIONS],
      },
    ),

    /**
     * The archived-only view: a distinct query, not a param on
     * `getBuilderSessions` above — its response is paginated and shaped
     * differently ({ sessions, totalCount } vs a plain array), and a response
     * shape that depends on a param breaks at the type level for every future
     * caller of the plain list.
     */
    getArchivedBuilderSessions: builder.query<
      BuilderArchivedSessionsPage,
      { status?: BuilderSessionStatus[]; limit: number; offset: number }
    >({
      query: ({ status, limit, offset }) => ({
        url: ApiEndpoints.BUILDER.SESSIONS,
        method: HttpMethod.GET,
        params: { archived: true, limit, offset, ...(status?.length ? { status } : {}) },
      }),
      providesTags: [TAG_TYPES.BUILDER_SESSIONS],
    }),

    getBuilderSession: builder.query<BuilderSessionDetail, string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_SESSION, id }],
    }),

    createBuilderSession: builder.mutation<BuilderSession, CreateBuilderSessionRequest>({
      query: body => ({
        url: ApiEndpoints.BUILDER.SESSIONS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.BUILDER_SESSIONS],
    }),

    updateBuilderSession: builder.mutation<BuilderSession, UpdateBuilderSessionRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.BUILDER.SESSION_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    cancelBuilderSession: builder.mutation<BuilderSession, string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_CANCEL(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    archiveBuilderSession: builder.mutation<BuilderSession, string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_ARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    unarchiveBuilderSession: builder.mutation<BuilderSession, string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_UNARCHIVE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (result, error, id) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    /**
     * An admin's own section edit. Invalidates the version list as well as the
     * session, because every accepted patch appends a snapshot.
     */
    patchBuilderPrd: builder.mutation<PatchBuilderPrdResponse, PatchBuilderPrdRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.BUILDER.SESSION_PRD(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        { type: TAG_TYPES.BUILDER_PRD_VERSIONS, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    getBuilderPrdVersions: builder.query<BuilderPrdVersion[], string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_PRD_VERSIONS(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_PRD_VERSIONS, id }],
    }),

    getBuilderRepoCommands: builder.query<{ repos: BuilderRepoCommand[] }, void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.REPO_COMMANDS,
        method: HttpMethod.GET,
      }),
    }),

    getBuilderRepoMaps: builder.query<{ maps: BuilderRepoMapSummary[] }, void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.REPO_MAPS,
        method: HttpMethod.GET,
      }),
    }),

    /* ── Builds ─────────────────────────────────────────────────────────── */

    startBuilderBuild: builder.mutation<
      BuilderBuildRun,
      {
        id: string;
        engine?: string;
        /** The coder tier. Planner and verifier are overridden separately below. */
        model?: string;
        plannerModel?: string;
        verifierModel?: string;
        budgetUsd?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.BUILDER.SESSION_START_BUILD(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    /**
     * Live spend, the ceiling, and whether a run is parked on it.
     *
     * Untagged: the page polls it while a build runs, and hanging it off
     * BUILDER_SESSION would make every unrelated invalidation refetch it —
     * and, worse, would not refresh it between invalidations, which is exactly
     * when the number moves.
     */
    getBuilderSessionBudget: builder.query<BuilderBudgetState, string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_BUDGET(id),
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Raise the ceiling. Invalidates the session so the header's spend figure
     * and the start-build dialog's seed both follow, and the budget query is
     * refetched by the component that made the raise.
     */
    raiseBuilderSessionBudget: builder.mutation<
      BuilderBudgetState & { released: boolean },
      { id: string; budgetUsd: number }
    >({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.BUILDER.SESSION_BUDGET(id),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    getBuilderRuns: builder.query<BuilderBuildRun[], string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_RUNS(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_SESSION, id }],
    }),

    /**
     * The feed's polling fallback. Cursor-paged rather than tag-invalidated:
     * the socket pushes the same rows, and a cache tag would make every push
     * refetch the whole run.
     */
    getBuilderRunEvents: builder.query<
      { events: BuilderBuildEvent[]; lastSeq: number; runStatus: BuilderRunStatus },
      { runId: string; afterSeq: number }
    >({
      query: ({ runId, afterSeq }) => ({
        url: ApiEndpoints.BUILDER.RUN_EVENTS(runId),
        method: HttpMethod.GET,
        params: { afterSeq },
      }),
    }),

    getBuilderPendingQuestions: builder.query<BuilderPendingQuestion[], string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_QUESTIONS(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_SESSION, id }],
    }),

    answerBuilderQuestion: builder.mutation<
      { resumed: boolean; runId: string | null },
      { id: string; questionId: string; message: string; answer?: Record<string, unknown> }
    >({
      query: ({ id, questionId, ...body }) => ({
        url: ApiEndpoints.BUILDER.ANSWER_QUESTION(id, questionId),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: TAG_TYPES.BUILDER_SESSION, id },
        TAG_TYPES.BUILDER_SESSIONS,
      ],
    }),

    getBuilderPullRequests: builder.query<BuilderPullRequest[], string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_PULL_REQUESTS(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_SESSION, id }],
    }),

    getBuilderReports: builder.query<BuilderReport[], string>({
      query: id => ({
        url: ApiEndpoints.BUILDER.SESSION_REPORTS(id),
        method: HttpMethod.GET,
      }),
      providesTags: (result, error, id) => [{ type: TAG_TYPES.BUILDER_SESSION, id }],
    }),

    getBuilderSettings: builder.query<BuilderSettings, void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.SETTINGS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.BUILDER_SETTINGS],
    }),

    updateBuilderSettings: builder.mutation<
      BuilderSettings,
      {
        enabled?: boolean;
        maxConcurrentBuilds?: number;
        defaultBudgetUsd?: number;
        // Empty string, not undefined, is how a tier is cleared back to the
        // platform default — the backend maps "" to null (see the DTO).
        plannerModel?: string;
        coderModel?: string;
        verifierModel?: string;
      }
    >({
      query: body => ({
        url: ApiEndpoints.BUILDER.SETTINGS,
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.BUILDER_SETTINGS],
    }),

    getBuilderNotifications: builder.query<
      { notifications: BuilderNotification[]; unread: number },
      void
    >({
      query: () => ({
        url: ApiEndpoints.BUILDER.NOTIFICATIONS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.BUILDER_NOTIFICATIONS],
    }),

    markBuilderNotificationsRead: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.NOTIFICATIONS_READ_ALL,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.BUILDER_NOTIFICATIONS],
    }),

    /* ── Scoreboard ───────────────────────────────────────────────────── */

    getBuilderScoreboard: builder.query<BuilderScoreboard, { windowDays?: number } | void>({
      query: params => ({
        url: ApiEndpoints.BUILDER.SCOREBOARD,
        method: HttpMethod.GET,
        params: params && params.windowDays ? { windowDays: params.windowDays } : undefined,
      }),
    }),

    /* ── Knowledge: lessons + exemplars ──────────────────────────────────
     * No polling here — a curated list only changes on an admin's own edit
     * or a "Consolidate now" run, both of which already invalidate the tag,
     * unlike the build surfaces above where the agent moves on its own. */

    getBuilderLessons: builder.query<
      BuilderLesson[],
      { status?: BuilderLessonStatus; category?: string; repo?: string } | void
    >({
      query: params => ({
        url: ApiEndpoints.BUILDER.LESSONS,
        method: HttpMethod.GET,
        params: params
          ? {
              ...(params.status ? { status: params.status } : {}),
              ...(params.category ? { category: params.category } : {}),
              ...(params.repo ? { repo: params.repo } : {}),
            }
          : undefined,
      }),
      providesTags: [TAG_TYPES.BUILDER_LESSONS],
    }),

    patchBuilderLesson: builder.mutation<BuilderLesson, PatchBuilderLessonRequest>({
      query: ({ id, ...body }) => ({
        url: ApiEndpoints.BUILDER.LESSON_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.BUILDER_LESSONS],
    }),

    consolidateBuilderLessons: builder.mutation<{ ok: boolean }, void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.LESSONS_CONSOLIDATE,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.BUILDER_LESSONS],
    }),

    getBuilderExemplars: builder.query<BuilderExemplar[], void>({
      query: () => ({
        url: ApiEndpoints.BUILDER.EXEMPLARS,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.BUILDER_EXEMPLARS],
    }),
  }),
});

export const {
  useGetBuilderSessionsQuery,
  useGetArchivedBuilderSessionsQuery,
  useGetBuilderSessionQuery,
  useCreateBuilderSessionMutation,
  useUpdateBuilderSessionMutation,
  useCancelBuilderSessionMutation,
  useArchiveBuilderSessionMutation,
  useUnarchiveBuilderSessionMutation,
  usePatchBuilderPrdMutation,
  useGetBuilderPrdVersionsQuery,
  useGetBuilderRepoCommandsQuery,
  useGetBuilderRepoMapsQuery,
  useStartBuilderBuildMutation,
  useGetBuilderSessionBudgetQuery,
  useRaiseBuilderSessionBudgetMutation,
  useGetBuilderRunsQuery,
  useLazyGetBuilderRunEventsQuery,
  useGetBuilderPendingQuestionsQuery,
  useAnswerBuilderQuestionMutation,
  useGetBuilderPullRequestsQuery,
  useGetBuilderReportsQuery,
  useGetBuilderSettingsQuery,
  useUpdateBuilderSettingsMutation,
  useGetBuilderNotificationsQuery,
  useMarkBuilderNotificationsReadMutation,
  useGetBuilderScoreboardQuery,
  useGetBuilderLessonsQuery,
  usePatchBuilderLessonMutation,
  useConsolidateBuilderLessonsMutation,
  useGetBuilderExemplarsQuery,
} = builderAPI;
