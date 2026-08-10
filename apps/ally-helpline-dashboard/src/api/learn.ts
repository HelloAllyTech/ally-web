/**
 * Learn module APIs
 *
 * This module provides all Learn/Training related endpoints including:
 * - Scenarios catalog (list and detail)
 * - Simulation room lifecycle (list, create, delete)
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  EndSimulationInput,
  EndSimulationResponse,
  GetAdminSimulationLogsInput,
  GetAdminSimulationLogsResponse,
  GetScenarioInput,
  GetSimulationLogsInput,
  GetSimulationLogsResponse,
  GetSimulationSummaryInput,
  StartSimulationInput,
  StartSimulationResponse,
  Scenario,
  GetSimulationSummaryResponse,
  GetSimulationTranscriptResponse,
  GetSimulationTranscriptRequest,
  SubmitSimulationFeedbackRequest,
  SubmitSimulationFeedbackResponse,
  GetScenarioPathwaysResponse,
  ScenarioPathwayDetails,
  GetUpComingSimulationResponse,
  LanguageOption,
  ScenarioCaseDetails,
  GetScenarioCasesResponse,
  pageType,
  GetSimulationChecklistResponse,
  GetSimulationSkillsResponse,
  GetChatHistoryResponse,
  PresignedUrlResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const learnAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get all scenarios available in the Learn catalog.
     * @returns {Promise<GetScenariosResponse>} List of scenarios
     */
    getScenarios: builder.query<
      { data: Scenario[] },
      { isPrivate: boolean; languageCode?: string }
    >({
      query: ({ isPrivate, languageCode }) => ({
        url: isPrivate
          ? ApiEndpoints.LEARN.GET_SCENARIOS_PRIVATE
          : ApiEndpoints.LEARN.GET_SCENARIOS,
        method: HttpMethod.GET,
        params: { languageCode },
      }),
    }),

    /**
     * Get details for a specific scenario by id.
     * @param {GetScenarioInput} params - Request params
     * @param {string} params.scenarioId - Scenario identifier
     * @returns {Promise<GetScenarioResponse>} Scenario details
     */
    getScenario: builder.query<Scenario, GetScenarioInput>({
      query: ({ scenarioId, isPrivate, languageCode }) => ({
        url: isPrivate
          ? ApiEndpoints.LEARN.GET_SCENARIO(scenarioId)
          : ApiEndpoints.LEARN.GET_SCENARIO_PUBLIC(scenarioId),
        method: HttpMethod.GET,
        params: { scenarioId, languageCode },
      }),
    }),

    /**
     * Get all scenario pathways (playlists of scenarios).
     * @returns {Promise<GetScenarioPathwaysResponse>} List of scenario pathways
     */
    getScenarioPathways: builder.query<
      GetScenarioPathwaysResponse,
      { offset?: number; limit?: number; languageCode?: string }
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_PATHWAYS,
        method: HttpMethod.GET,
        params,
      }),
    }),

    /**
     * Get details for a specific scenario pathway by id.
     * @param {string} pathwayId - Pathway identifier
     * @returns {Promise<ScenarioPathwayDetails>} Pathway details with scenarios
     */
    getScenarioPathwayDetails: builder.query<
      ScenarioPathwayDetails,
      { pathwayId: string; languageCode?: string }
    >({
      query: ({ pathwayId, languageCode }) => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_PATHWAY_DETAILS(pathwayId),
        method: HttpMethod.GET,
        params: { languageCode },
      }),
      providesTags: [TAG_TYPES.SCENARIO_PATHWAY_DETAILS],
    }),

    /**
     * Start a new simulation.
     * @param {StartSimulationInput} params - Start simulation payload
     * @returns {Promise<StartSimulationResponse>} Started simulation info
     */
    startSimulation: builder.mutation<StartSimulationResponse, StartSimulationInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.START_SIMULATION,
        method: HttpMethod.POST,
        body: params,
      }),
      invalidatesTags: ["SimulationLogs"],
    }),

    /**
     * End an existing simulation.
     * @param {EndSimulationInput} params - End simulation payload
     * @param {string} params.sessionId - Session identifier
     * @returns {Promise<EndSimulationResponse>} End simulation response
     */
    endSimulation: builder.mutation<EndSimulationResponse, EndSimulationInput>({
      query: ({ sessionId, languageCode }) => ({
        url: ApiEndpoints.LEARN.END_SIMULATION(sessionId),
        method: HttpMethod.POST,
        body: { enableRecommendations: true, languageCode },
      }),
      // The streak is written asynchronously off the session-end event, not by
      // this request, so this invalidation alone can refetch before the write
      // lands. It is one of several refresh triggers, not the only one — see
      // usePracticeStreakSummary and usePostSessionStreak.
      invalidatesTags: [
        TAG_TYPES.SIMULATION_LOGS,
        TAG_TYPES.SIMULATION_CREDITS,
        TAG_TYPES.PRACTICE_STREAK,
      ],
    }),

    /**
     * List scenario session logs for the current user.
     * @param {GetScenarioSessionsInput} params - Query parameters
     * @param {string[]} params.statuses - Session status filters
     * @param {number} [params.limit] - Page size
     * @param {number} [params.offset] - Offset for pagination
     * @param {string} [params.sortBy] - Field to sort by
     * @param {"ASC"|"DESC"} [params.order] - Sort order
     * @returns {Promise<GetScenarioSessionsResponse>} Sessions list
     */
    getSimulationLogs: builder.query<GetSimulationLogsResponse, GetSimulationLogsInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.GET_SIMULATION_LOGS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: ["SimulationLogs"],
    }),

    /**
     * List scenario session logs for admins across counselors.
     * @param {GetAdminSimulationLogsInput} params - Query parameters
     * @param {number} [params.limit] - Page size
     * @param {number} [params.offset] - Offset for pagination
     * @param {string} [params.sortBy] - Field to sort by
     * @param {"ASC"|"DESC"} [params.order] - Sort order
     * @returns {Promise<GetAdminSimulationLogsResponse>} Admin sessions list
     */
    getAdminSimulationLogs: builder.query<
      GetAdminSimulationLogsResponse,
      GetAdminSimulationLogsInput
    >({
      query: params => ({
        url: ApiEndpoints.LEARN.GET_ADMIN_SIMULATION_LOGS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SIMULATION_LOGS],
    }),

    /**
     * Get aggregated summary for a single scenario session.
     * @returns {Promise<void>} Summary payload
     */
    getSimulationSummary: builder.query<GetSimulationSummaryResponse, GetSimulationSummaryInput>({
      query: ({ sessionId, languageCode }) => ({
        url: ApiEndpoints.LEARN.GET_SIMULATION_SUMMARY(sessionId),
        method: HttpMethod.GET,
        params: { enableRecommendations: true, languageCode },
      }),
      providesTags: [TAG_TYPES.SIMULATION_SUMMARY],
    }),

    /**
     * Submit feedback for a scenario session.
     * @returns {Promise<void>} No content
     */
    submitSimulationFeedback: builder.mutation<
      SubmitSimulationFeedbackResponse,
      SubmitSimulationFeedbackRequest
    >({
      query: ({ sessionId, sessionFeedback }) => ({
        url: ApiEndpoints.LEARN.SUBMIT_SIMULATION_FEEDBACK(sessionId),
        method: HttpMethod.POST,
        body: sessionFeedback,
      }),
    }),

    /**
     * Retrieves the transcript data for a specific simulation session
     * with pagination and sorting options.
     * @param {GetSimulationTranscriptRequest} data - Simulation transcript request parameters
     * @returns {Promise<GetSimulationTranscriptResponse>} Simulation transcript data
     */
    getSimulationTranscript: builder.query<
      GetSimulationTranscriptResponse,
      GetSimulationTranscriptRequest
    >({
      query: ({ sessionId, offset, limit, sortBy, languageCode }) => ({
        url: ApiEndpoints.LEARN.GET_SIMULATION_TRANSCRIPT(sessionId),
        params: { offset, limit, sortOrder: "ASC", sortBy, includeTags: true, languageCode },
      }),
    }),
    getUpComingSimulation: builder.query<
      GetUpComingSimulationResponse,
      { sessionId: string; type: string }
    >({
      query: ({ sessionId, type }) => ({
        url:
          type === pageType.CASE
            ? ApiEndpoints.LEARN.GET_UP_COMING_CASE_SIMULATION(sessionId)
            : ApiEndpoints.LEARN.GET_UP_COMING_SIMULATION(sessionId),
        method: HttpMethod.GET,
      }),
      keepUnusedDataFor: 60 * 60,
    }),

    /**
     * Get all available languages for scenarios
     * @param {Record<string, any>} [params] - Optional query parameters (e.g., { active: true, hasVoices: true })
     * @returns {Promise<LanguageOption[]>} List of available languages with their codes and labels
     */
    getAvailableLanguages: builder.query<LanguageOption[], Record<string, any>>({
      query: (params = {}) => ({
        url: ApiEndpoints.LEARN.GET_AVAILABLE_LANGUAGES,
        method: HttpMethod.GET,
        params,
      }),
    }),
    startPathwaySimulation: builder.mutation<void, { pathwayId: string }>({
      query: ({ pathwayId }) => ({
        url: ApiEndpoints.LEARN.START_PATHWAY_SIMULATION(pathwayId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_PATHWAY_DETAILS],
    }),
    getScenarioSessionByPathItem: builder.query<
      {
        id: string;
      },
      { pathSessionItemId: string }
    >({
      query: ({ pathSessionItemId }) => ({
        url: ApiEndpoints.LEARN.SCENARIO_SESSION_BY_PATH_ITEM(pathSessionItemId),
        method: HttpMethod.GET,
      }),
    }),
    /**
     * Get all scenario cases.
     * @param {Record<string, any>} [params] - Optional query parameters (e.g., { offset: number, limit: number })
     * @returns {Promise<ScenarioCaseDetails[]>} List of scenario cases
     */
    getScenarioCases: builder.query<
      GetScenarioCasesResponse,
      { offset?: number; limit?: number; languageCode?: string }
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_CASES,
        method: HttpMethod.GET,
        params,
      }),
    }),
    /**
     * Get details for a specific case by id.
     * @param {string} caseId - Case identifier
     * @returns {Promise<ScenarioCaseDetails>} Case details
     */
    getScenarioCaseDetails: builder.query<
      ScenarioCaseDetails,
      { caseId: string; languageCode?: string }
    >({
      query: ({ caseId, languageCode }) => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_CASE_DETAILS(caseId),
        method: HttpMethod.GET,
        params: { languageCode },
      }),
      providesTags: [TAG_TYPES.SCENARIO_CASE_DETAILS],
    }),
    /**
     * Get details for a specific case session by id.
     * @param {string} caseSessionItemId - Case session identifier
     * @returns {Promise<ScenarioCaseSessionDetails>} Case session details
     */
    getScenarioSessionByCaseItem: builder.query<
      {
        id: string;
      },
      { caseSessionItemId: string }
    >({
      query: ({ caseSessionItemId }) => ({
        url: ApiEndpoints.LEARN.SCENARIO_SESSION_BY_CASE_ITEM(caseSessionItemId),
        method: HttpMethod.GET,
      }),
    }),
    /**
     * Start a new case simulation.
     * @param {string} caseId - Case identifier
     * @returns {Promise<void>} Started case simulation info
     */
    startCaseSimulation: builder.mutation<void, { caseId: string }>({
      query: ({ caseId }) => ({
        url: ApiEndpoints.LEARN.START_CASE_SIMULATION(caseId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_CASE_DETAILS],
    }),
    /**
     * Get checklist for a scenario session.
     * @param {string} sessionId - Session identifier
     * @returns {Promise<GetSimulationChecklistResponse>} Checklist data with overall score and items
     */
    getSimulationChecklist: builder.query<
      GetSimulationChecklistResponse,
      { sessionId: string; languageCode?: string }
    >({
      query: ({ sessionId, languageCode }) => ({
        url: ApiEndpoints.LEARN.GET_SIMULATION_CHECKLIST(sessionId),
        method: HttpMethod.GET,
        params: { languageCode },
      }),
    }),
    /**
     * Get skills and emotional movements for a scenario session.
     * @param {string} sessionId - Session identifier
     * @returns {Promise<GetSimulationSkillsResponse>} Skills coverage and emotional movement data
     */
    getSimulationSkills: builder.query<GetSimulationSkillsResponse, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: ApiEndpoints.LEARN.GET_SIMULATION_SKILLS(sessionId),
      }),
    }),
    getChatHistory: builder.query<GetChatHistoryResponse[], { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: ApiEndpoints.LEARN.CHAT_HISTORY(sessionId),
        method: HttpMethod.GET,
      }),
    }),
    getAudioUrl: builder.query<PresignedUrlResponse, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: ApiEndpoints.LEARN.GET_AUDIO_URL(sessionId),
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const {
  useLazyGetUpComingSimulationQuery,
  useEndSimulationMutation,
  useGetScenarioQuery,
  useGetScenariosQuery,
  useGetScenarioPathwaysQuery,
  useGetScenarioCasesQuery,
  useGetScenarioPathwayDetailsQuery,
  useStartSimulationMutation,
  useGetSimulationLogsQuery,
  useGetAdminSimulationLogsQuery,
  useGetSimulationSummaryQuery,
  useLazyGetSimulationSummaryQuery,
  useSubmitSimulationFeedbackMutation,
  useGetSimulationTranscriptQuery,
  useStartPathwaySimulationMutation,
  useLazyGetScenarioSessionByPathItemQuery,
  useGetAvailableLanguagesQuery,
  useGetScenarioCaseDetailsQuery,
  useLazyGetScenarioSessionByCaseItemQuery,
  useStartCaseSimulationMutation,
  useGetSimulationChecklistQuery,
  useGetSimulationSkillsQuery,
  useGetChatHistoryQuery,
  useGetAudioUrlQuery,
  useLazyGetAudioUrlQuery,
} = learnAPI;
