import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreateRoleplayRehearsalInput,
  CreateRoleplaySessionInput,
  CreateRoleplaySessionResponse,
  CreateRoleplaySpecInput,
  GetRoleplayCopilotMessagesParams,
  GetRoleplayCopilotMessagesResponse,
  GetRoleplaySpecsResponse,
  PublishRoleplayVersionInput,
  RoleplayCopilotSession,
  RoleplayCritiqueProposal,
  RoleplayCritiqueResponse,
  RoleplayDirectorTurnPayload,
  RoleplayImprovementDiff,
  RoleplayImprovementRun,
  RoleplayImprovementRunDetail,
  RoleplayRehearsal,
  RoleplayRehearsalComparisonResponse,
  RoleplayRehearsalTranscript,
  RoleplaySpecDetail,
  RoleplaySpecListItem,
  RoleplaySpecVersionSummary,
  SaveRoleplayDraftInput,
  SaveRoleplayDraftResponse,
  StartImprovementRunInput,
  UpdateRoleplaySpecInput,
} from "@src/types/roleplayStudio";

import { baseAPI } from "./baseApi";

/** Raw transcript row as stored: entry fields camelCase, nested turns snake_case. */
interface RawRehearsalTranscriptRow extends Omit<RoleplayRehearsalTranscript, "transcript"> {
  transcript?: Array<{
    role: string;
    content: string;
    turn_index?: number;
    turnIndex?: number;
    state_id?: string;
    stateId?: string;
    stage_direction?: string;
    stageDirection?: string;
  }>;
}

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

    /** 409 = version has no completed rehearsal; retry with { force: true }. */
    publishRoleplayVersion: builder.mutation<
      RoleplaySpecVersionSummary,
      PublishRoleplayVersionInput
    >({
      query: ({ specId, versionId, force }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.PUBLISH_VERSION(specId, versionId),
        method: HttpMethod.POST,
        body: force ? { force } : {},
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

    /** Persist accepted suggest_test_cases cards (also wires spec.agentTestCaseIds). */
    acceptCopilotTestCases: builder.mutation<
      { testCaseIds: string[]; specVersionId: string },
      {
        sessionId: string;
        testCases: Array<{
          suggestionId?: string;
          title: string;
          category: string;
          description?: string;
          condition?: string;
          test?: string;
        }>;
      }
    >({
      query: ({ sessionId, testCases }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.COPILOT_SESSION_TEST_CASES(sessionId),
        method: HttpMethod.POST,
        body: { testCases },
      }),
      invalidatesTags: [TAG_TYPES.AGENT_TEST_CASES],
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

    // ----- rehearsals -----
    createRoleplayRehearsal: builder.mutation<RoleplayRehearsal, CreateRoleplayRehearsalInput>({
      query: ({
        specId,
        versionId,
        traineeProfiles,
        turnsPerProfile,
        agentTestCaseIds,
        languageId,
      }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CREATE_REHEARSALS(specId, versionId),
        method: HttpMethod.POST,
        body: {
          traineeProfiles,
          turnsPerProfile,
          // Optional keys are omitted (not sent as undefined/null) so the BE
          // DTO defaults apply.
          ...(agentTestCaseIds !== undefined ? { agentTestCaseIds } : {}),
          ...(languageId !== undefined ? { languageId } : {}),
        },
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_REHEARSALS],
    }),

    getRoleplayRehearsal: builder.query<RoleplayRehearsal, string>({
      query: rehearsalId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.REHEARSAL_BY_ID(rehearsalId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, rehearsalId) => [
        { type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: rehearsalId },
      ],
    }),

    // Transcripts live on a dedicated endpoint (NOT on the rehearsal entity
    // that getRoleplayRehearsal returns). Turns are stored snake_case verbatim
    // from ai-learn; camelize them here so the viewer's turnIndex/stateId/
    // stageDirection reads resolve.
    getRoleplayRehearsalTranscripts: builder.query<RoleplayRehearsalTranscript[], string>({
      query: rehearsalId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.REHEARSAL_TRANSCRIPTS(rehearsalId),
        method: HttpMethod.GET,
      }),
      transformResponse: (rows: RawRehearsalTranscriptRow[]) =>
        (Array.isArray(rows) ? rows : []).map(row => ({
          ...row,
          transcript: (row.transcript ?? []).map(turn => ({
            role: turn.role,
            content: turn.content,
            turnIndex: turn.turn_index ?? turn.turnIndex ?? 0,
            stateId: turn.state_id ?? turn.stateId,
            stageDirection: turn.stage_direction ?? turn.stageDirection,
          })),
        })),
      providesTags: (_result, _error, rehearsalId) => [
        { type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: rehearsalId },
      ],
    }),

    getRoleplayRehearsalsBySpec: builder.query<RoleplayRehearsal[], string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.REHEARSALS_BY_SPEC(specId),
        method: HttpMethod.GET,
      }),
      transformResponse: (response: RoleplayRehearsal[] | { data: RoleplayRehearsal[] }) =>
        Array.isArray(response) ? response : (response?.data ?? []),
      providesTags: [TAG_TYPES.ROLEPLAY_REHEARSALS],
    }),

    cancelRoleplayRehearsal: builder.mutation<void, string>({
      query: rehearsalId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CANCEL_REHEARSAL(rehearsalId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, rehearsalId) => [
        TAG_TYPES.ROLEPLAY_REHEARSALS,
        { type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: rehearsalId },
      ],
    }),

    critiqueRoleplayRehearsal: builder.mutation<RoleplayCritiqueResponse, string>({
      query: rehearsalId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CRITIQUE_REHEARSAL(rehearsalId),
        method: HttpMethod.POST,
      }),
    }),

    /** Records the trainer's accept/reject decision on a persisted proposal. */
    updateCritiqueProposalStatus: builder.mutation<
      RoleplayCritiqueProposal,
      { proposalId: string; status: "applied" | "rejected"; appliedInVersionId?: string }
    >({
      query: ({ proposalId, ...body }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CRITIQUE_PROPOSAL(proposalId),
        method: HttpMethod.PATCH,
        body,
      }),
    }),

    /** Score deltas vs another run (?against=<rehearsalId>|previous). */
    getRoleplayRehearsalComparison: builder.query<
      RoleplayRehearsalComparisonResponse,
      { rehearsalId: string; against?: string }
    >({
      query: ({ rehearsalId, against = "previous" }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.REHEARSAL_COMPARISON(rehearsalId),
        method: HttpMethod.GET,
        params: { against },
      }),
      providesTags: (_result, _error, { rehearsalId }) => [
        { type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: rehearsalId },
      ],
    }),

    // ----- auto-improve -----
    startImprovementRun: builder.mutation<RoleplayImprovementRun, StartImprovementRunInput>({
      query: ({ specId, versionId, ...body }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CREATE_IMPROVEMENT_RUN(specId, versionId),
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_IMPROVEMENTS],
    }),

    getImprovementRunsBySpec: builder.query<RoleplayImprovementRun[], string>({
      query: specId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.IMPROVEMENT_RUNS_BY_SPEC(specId),
        method: HttpMethod.GET,
      }),
      transformResponse: (
        response: RoleplayImprovementRun[] | { data: RoleplayImprovementRun[] },
      ) => (Array.isArray(response) ? response : (response?.data ?? [])),
      providesTags: [TAG_TYPES.ROLEPLAY_IMPROVEMENTS],
    }),

    getImprovementRun: builder.query<RoleplayImprovementRunDetail, string>({
      query: runId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.IMPROVEMENT_RUN_BY_ID(runId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, runId) => [
        { type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: runId },
      ],
    }),

    getImprovementRunDiff: builder.query<RoleplayImprovementDiff, string>({
      query: runId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.IMPROVEMENT_RUN_DIFF(runId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, runId) => [
        { type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: runId },
      ],
    }),

    acceptImprovementRun: builder.mutation<
      RoleplayImprovementRun,
      { runId: string; expectedDraftUpdatedAt?: string }
    >({
      query: ({ runId, expectedDraftUpdatedAt }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.ACCEPT_IMPROVEMENT_RUN(runId),
        method: HttpMethod.POST,
        body: expectedDraftUpdatedAt ? { expectedDraftUpdatedAt } : {},
      }),
      invalidatesTags: (_result, _error, { runId }) => [
        TAG_TYPES.ROLEPLAY_IMPROVEMENTS,
        { type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: runId },
        TAG_TYPES.ROLEPLAY_SPECS,
        TAG_TYPES.ROLEPLAY_SPEC_VERSIONS,
      ],
    }),

    discardImprovementRun: builder.mutation<RoleplayImprovementRun, string>({
      query: runId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.DISCARD_IMPROVEMENT_RUN(runId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, runId) => [
        TAG_TYPES.ROLEPLAY_IMPROVEMENTS,
        { type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: runId },
      ],
    }),

    cancelImprovementRun: builder.mutation<void, string>({
      query: runId => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CANCEL_IMPROVEMENT_RUN(runId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: (_result, _error, runId) => [
        TAG_TYPES.ROLEPLAY_IMPROVEMENTS,
        { type: TAG_TYPES.ROLEPLAY_IMPROVEMENTS, id: runId },
      ],
    }),

    // ----- live sessions / preview -----
    createRoleplaySession: builder.mutation<
      CreateRoleplaySessionResponse,
      CreateRoleplaySessionInput
    >({
      query: ({ specId, versionId }) => ({
        url: ApiEndpoints.ROLEPLAY_STUDIO.CREATE_SESSION(specId, versionId),
        method: HttpMethod.POST,
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
  useAcceptCopilotTestCasesMutation,
  useGetRoleplayCopilotMessagesQuery,
  useLazyGetRoleplayCopilotMessagesQuery,
  useCreateRoleplayRehearsalMutation,
  useGetRoleplayRehearsalQuery,
  useLazyGetRoleplayRehearsalQuery,
  useGetRoleplayRehearsalTranscriptsQuery,
  useGetRoleplayRehearsalsBySpecQuery,
  useCancelRoleplayRehearsalMutation,
  useCritiqueRoleplayRehearsalMutation,
  useUpdateCritiqueProposalStatusMutation,
  useGetRoleplayRehearsalComparisonQuery,
  useStartImprovementRunMutation,
  useGetImprovementRunsBySpecQuery,
  useGetImprovementRunQuery,
  useGetImprovementRunDiffQuery,
  useAcceptImprovementRunMutation,
  useDiscardImprovementRunMutation,
  useCancelImprovementRunMutation,
  useCreateRoleplaySessionMutation,
  useGetRoleplayDirectorEventsQuery,
  useGetRoleplayRubricScoresQuery,
} = roleplayStudioAPI;

export { roleplayStudioAPI };
