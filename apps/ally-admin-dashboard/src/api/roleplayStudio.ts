import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateRoleplaySessionInput,
  CreateRoleplaySessionResponse,
  CreateRoleplaySpecInput,
  GetRoleplayCopilotMessagesParams,
  GetRoleplayCopilotMessagesResponse,
  GetRoleplaySpecsResponse,
  GetRoleplayTestReportsParams,
  GetRoleplayTestReportsResponse,
  PublishRoleplayVersionInput,
  RoleplayCopilotSession,
  RoleplayDirectorTurnPayload,
  RoleplaySpecDetail,
  RoleplaySpecListItem,
  RoleplaySpecVersionSummary,
  RoleplayTestReportDetail,
  RoleplayTestReportListItem,
  RoleplayTestRun,
  SaveRoleplayDraftInput,
  SaveRoleplayDraftResponse,
  StartRoleplayTestRunInput,
  StartRoleplayTestRunResponse,
  UpdateRoleplaySpecInput,
} from "@src/types/roleplayStudio";

import { baseAPI } from "./baseApi";

/**
 * Roleplay Studio v2 endpoints (controller prefix `v1/roleplay-studio`).
 * The copilot's SSE stream is NOT here — RTK Query doesn't stream; see
 * hooks/useCopilotStream.ts which shares the same bearer/refresh flow.
 */
const roleplayStudioAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    // ----- spec CRUD -----
    getRoleplaySpecs: builder.query<GetRoleplaySpecsResponse, void>({
      query: () => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPECS,
        method: HttpMethod.GET,
      }),
      // Tolerate both a bare array and a { data, total } envelope.
      transformResponse: (response: RoleplaySpecListItem[] | GetRoleplaySpecsResponse) =>
        Array.isArray(response) ? { data: response } : response,
      providesTags: [TAG_TYPES.ROLEPLAY_SPECS],
    }),

    createRoleplaySpec: builder.mutation<RoleplaySpecDetail, CreateRoleplaySpecInput>({
      query: body => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPECS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_SPECS],
    }),

    getRoleplaySpecById: builder.query<RoleplaySpecDetail, string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPEC_BY_ID(specId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, specId) => [{ type: TAG_TYPES.ROLEPLAY_SPECS, id: specId }],
    }),

    updateRoleplaySpec: builder.mutation<RoleplaySpecDetail, UpdateRoleplaySpecInput>({
      query: ({ specId, ...body }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPEC_BY_ID(specId),
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: (_result, _error, { specId }) => [
        TAG_TYPES.ROLEPLAY_SPECS,
        { type: TAG_TYPES.ROLEPLAY_SPECS, id: specId },
      ],
    }),

    deleteRoleplaySpec: builder.mutation<void, string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPEC_BY_ID(specId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_SPECS],
    }),

    // ----- versions / draft persistence -----
    /**
     * Draft autosave. Deliberately does NOT invalidate the spec detail tag —
     * a refetch would clobber in-flight local edits. 409 (stale
     * expectedUpdatedAt) is handled by the autosave hook (refetch + toast).
     */
    saveRoleplayDraft: builder.mutation<SaveRoleplayDraftResponse, SaveRoleplayDraftInput>({
      query: ({ specId, spec, expectedUpdatedAt }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SAVE_DRAFT(specId),
        method: HttpMethod.PUT,
        body: { spec, expectedUpdatedAt },
      }),
      // Server returns { spec, specVersionId, validation } — the hook needs the
      // fresh concurrency token and the id of the snapshot this save produced.
      transformResponse: (raw: {
        spec?: { updatedAt?: string };
        specVersionId?: string;
        updatedAt?: string;
      }): SaveRoleplayDraftResponse => ({
        updatedAt: raw.spec?.updatedAt ?? raw.updatedAt ?? "",
        versionId: raw.specVersionId,
      }),
    }),

    getRoleplaySpecVersions: builder.query<RoleplaySpecVersionSummary[], string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPEC_VERSIONS(specId),
        method: HttpMethod.GET,
      }),
      transformResponse: (
        response: RoleplaySpecVersionSummary[] | { data: RoleplaySpecVersionSummary[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
      providesTags: [TAG_TYPES.ROLEPLAY_SPEC_VERSIONS],
    }),

    createRoleplaySpecVersion: builder.mutation<RoleplaySpecVersionSummary, string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SPEC_VERSIONS(specId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_SPEC_VERSIONS, TAG_TYPES.ROLEPLAY_SPECS],
    }),

    publishRoleplayVersion: builder.mutation<
      RoleplaySpecVersionSummary,
      PublishRoleplayVersionInput
    >({
      query: ({ specId, versionId }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.PUBLISH_VERSION(specId, versionId),
        method: HttpMethod.POST,
        body: {},
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_SPEC_VERSIONS, TAG_TYPES.ROLEPLAY_SPECS],
    }),

    // ----- copilot sessions (non-streaming surface) -----
    createRoleplayCopilotSession: builder.mutation<RoleplayCopilotSession, string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CREATE_COPILOT_SESSION,
        method: HttpMethod.POST,
        body: { specId },
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_COPILOT_SESSIONS],
    }),

    getRoleplayCopilotSession: builder.query<RoleplayCopilotSession, string>({
      query: sessionId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.COPILOT_SESSION(sessionId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, sessionId) => [
        { type: TAG_TYPES.ROLEPLAY_COPILOT_SESSIONS, id: sessionId },
      ],
    }),

    /** The caller's ACTIVE sessions for a spec, newest first — cross-browser resume. */
    getRoleplayCopilotSessionsBySpec: builder.query<RoleplayCopilotSession[], string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.COPILOT_SESSIONS,
        method: HttpMethod.GET,
        params: { specId },
      }),
      transformResponse: (
        response: RoleplayCopilotSession[] | { data: RoleplayCopilotSession[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
      providesTags: [TAG_TYPES.ROLEPLAY_COPILOT_SESSIONS],
    }),

    getRoleplayCopilotMessages: builder.query<
      GetRoleplayCopilotMessagesResponse,
      GetRoleplayCopilotMessagesParams
    >({
      query: ({ sessionId, ...params }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.COPILOT_SESSION_MESSAGES(sessionId),
        method: HttpMethod.GET,
        params,
      }),
    }),

    // ----- live sessions / preview -----
    createRoleplaySession: builder.mutation<
      CreateRoleplaySessionResponse,
      CreateRoleplaySessionInput
    >({
      query: ({ specId, versionId, languageId }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CREATE_SESSION(specId, versionId),
        method: HttpMethod.POST,
        ...(languageId !== undefined ? { body: { languageId } } : {}),
      }),
    }),

    getRoleplayDirectorEvents: builder.query<RoleplayDirectorTurnPayload[], string>({
      query: sessionId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SESSION_DIRECTOR_EVENTS(sessionId),
        method: HttpMethod.GET,
      }),
      transformResponse: (
        response: RoleplayDirectorTurnPayload[] | { data: RoleplayDirectorTurnPayload[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
    }),

    getRoleplayRubricScores: builder.query<Record<string, number>, string>({
      query: sessionId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.SESSION_RUBRIC_SCORES(sessionId),
        method: HttpMethod.GET,
      }),
    }),

    // ----- Improve: test runs + test reports -----
    startRoleplayTestRun: builder.mutation<StartRoleplayTestRunResponse, StartRoleplayTestRunInput>(
      {
        query: ({ specId, ...body }) => ({
          url: ApiEndpoints.ROLEPLAY_STUDIO.TEST_RUNS(specId),
          method: HttpMethod.POST,
          body,
        }),
        invalidatesTags: [TAG_TYPES.ROLEPLAY_TEST_REPORTS],
      },
    ),

    /**
     * Cheap per-spec report list for the Improve drawer. The drawer polls this
     * (4s) while any run/report is non-terminal — polling options live at the
     * call site, not here.
     */
    getRoleplayTestReports: builder.query<
      GetRoleplayTestReportsResponse,
      GetRoleplayTestReportsParams
    >({
      query: ({ specId, ...params }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.TEST_REPORTS(specId),
        method: HttpMethod.GET,
        params,
      }),
      // Tolerate both a bare array and a { data, count } envelope.
      transformResponse: (
        response: RoleplayTestReportListItem[] | GetRoleplayTestReportsResponse,
      ) => (Array.isArray(response) ? { data: response } : response),
      providesTags: [TAG_TYPES.ROLEPLAY_TEST_REPORTS],
    }),

    /** Full report row (markdown, judge dims, transcript) — fetched on expand. */
    getRoleplayTestReport: builder.query<RoleplayTestReportDetail, string>({
      query: reportId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.TEST_REPORT_BY_ID(reportId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, reportId) => [
        { type: TAG_TYPES.ROLEPLAY_TEST_REPORTS, id: reportId },
      ],
    }),

    cancelRoleplayTestRun: builder.mutation<RoleplayTestRun, string>({
      query: runId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.TEST_RUN_CANCEL(runId),
        method: HttpMethod.POST,
        body: {},
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_TEST_REPORTS],
    }),
  }),
});

export const {
  useGetRoleplaySpecsQuery,
  useCreateRoleplaySpecMutation,
  useGetRoleplaySpecByIdQuery,
  useLazyGetRoleplaySpecByIdQuery,
  useUpdateRoleplaySpecMutation,
  useDeleteRoleplaySpecMutation,
  useSaveRoleplayDraftMutation,
  useGetRoleplaySpecVersionsQuery,
  useCreateRoleplaySpecVersionMutation,
  usePublishRoleplayVersionMutation,
  useCreateRoleplayCopilotSessionMutation,
  useGetRoleplayCopilotSessionQuery,
  useLazyGetRoleplayCopilotSessionQuery,
  useLazyGetRoleplayCopilotSessionsBySpecQuery,
  useGetRoleplayCopilotMessagesQuery,
  useLazyGetRoleplayCopilotMessagesQuery,
  useCreateRoleplaySessionMutation,
  useGetRoleplayDirectorEventsQuery,
  useGetRoleplayRubricScoresQuery,
  useStartRoleplayTestRunMutation,
  useGetRoleplayTestReportsQuery,
  useGetRoleplayTestReportQuery,
  useCancelRoleplayTestRunMutation,
} = roleplayStudioAPI;

export { roleplayStudioAPI };
