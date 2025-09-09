/**
 * Learn module APIs
 *
 * This module provides all Learn/Training related endpoints including:
 * - Scenarios catalog (list and detail)
 * - Simulation room lifecycle (list, create, delete)
 */
import { ApiEndpoints, HttpMethod } from "@constants";
import {
  EndSimulationInput,
  EndSimulationResponse,
  GetAdminScenarioSessionsInput,
  GetAdminScenarioSessionsResponse,
  GetScenarioInput,
  GetScenarioResponse,
  GetScenarioSessionsInput,
  GetScenarioSessionsResponse,
  GetScenariosResponse,
  StartSimulationInput,
  StartSimulationResponse,
} from "@types";

import { baseAPI } from "./baseAPI";

const learnAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get all scenarios available in the Learn catalog.
     * @returns {Promise<GetScenariosResponse>} List of scenarios
     */
    getScenarios: builder.query<GetScenariosResponse, void>({
      query: () => ({
        url: ApiEndpoints.LEARN.GET_SCENARIOS,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Get details for a specific scenario by id.
     * @param {GetScenarioInput} params - Request params
     * @param {string} params.scenarioId - Scenario identifier
     * @returns {Promise<GetScenarioResponse>} Scenario details
     */
    getScenario: builder.query<GetScenarioResponse, GetScenarioInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO(params.scenarioId),
        method: HttpMethod.GET,
        params,
      }),
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
    }),

    /**
     * End an existing simulation.
     * @param {EndSimulationInput} params - End simulation payload
     * @param {string} params.sessionId - Session identifier
     * @returns {Promise<EndSimulationResponse>} End simulation response
     */
    endSimulation: builder.mutation<EndSimulationResponse, EndSimulationInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.END_SIMULATION(params.sessionId),
        method: HttpMethod.POST,
      }),
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
    getScenarioSessions: builder.query<GetScenarioSessionsResponse, GetScenarioSessionsInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_SESSIONS,
        method: HttpMethod.GET,
        params,
      }),
    }),

    /**
     * List scenario session logs for admins across counselors.
     * @param {GetAdminScenarioSessionsInput} params - Query parameters
     * @param {number} [params.limit] - Page size
     * @param {number} [params.offset] - Offset for pagination
     * @param {string} [params.sortBy] - Field to sort by
     * @param {"ASC"|"DESC"} [params.order] - Sort order
     * @returns {Promise<GetAdminScenarioSessionsResponse>} Admin sessions list
     */
    getAdminScenarioSessions: builder.query<
      GetAdminScenarioSessionsResponse,
      GetAdminScenarioSessionsInput
    >({
      query: params => ({
        url: ApiEndpoints.LEARN.GET_ADMIN_SCENARIO_SESSIONS,
        method: HttpMethod.GET,
        params,
      }),
    }),

    /**
     * Get aggregated summary for a single scenario session.
     * @returns {Promise<void>} Summary payload
     */
    getScenarioSessionSummary: builder.query<void, void>({
      query: () => ({
        url: ApiEndpoints.LEARN.GET_SCENARIO_SESSION_SUMMARY,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Submit feedback for a scenario session.
     * @returns {Promise<void>} No content
     */
    submitSessionFeedback: builder.mutation<void, void>({
      query: () => ({
        url: ApiEndpoints.LEARN.SUBMIT_SCENARIO_SESSION_FEEDBACK,
        method: HttpMethod.POST,
      }),
    }),
  }),
});

export const {
  useEndSimulationMutation,
  useGetScenarioQuery,
  useGetScenariosQuery,
  useStartSimulationMutation,
  useGetScenarioSessionsQuery,
  useGetAdminScenarioSessionsQuery,
  useGetScenarioSessionSummaryQuery,
  useSubmitSessionFeedbackMutation,
} = learnAPI;
