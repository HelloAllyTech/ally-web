/**
 * Learn module APIs
 *
 * This module provides all Learn/Training related endpoints including:
 * - Scenarios catalog (list and detail)
 * - Simulation room lifecycle (list, create, delete)
 */
import { ApiEndpoints, HttpMethod } from "@constants";
import {
  CreateRoomInput,
  CreateRoomResponse,
  DeleteRoomInput,
  GetScenarioInput,
  GetScenarioResponse,
  GetScenariosResponse,
  ListRoomsResponse,
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
        url: ApiEndpoints.LEARN.SCENARIOS,
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
        url: ApiEndpoints.LEARN.SCENARIO(params.scenarioId),
        method: HttpMethod.GET,
        params,
      }),
    }),
    /**
     * List active simulation rooms.
     * @returns {Promise<ListRoomsResponse>} Rooms list
     */
    listRooms: builder.query<ListRoomsResponse, void>({
      query: () => ({
        url: ApiEndpoints.LEARN.ROOM,
        method: HttpMethod.GET,
      }),
    }),
    /**
     * Create a new simulation room.
     * @param {CreateRoomInput} params - Create room payload
     * @returns {Promise<CreateRoomResponse>} Created room info
     */
    createRoom: builder.mutation<CreateRoomResponse, CreateRoomInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.ROOM,
        method: HttpMethod.POST,
        body: params,
      }),
    }),
    /**
     * Delete an existing simulation room.
     * @param {DeleteRoomInput} params - Delete room payload
     * @param {string} params.roomId - Room identifier
     * @returns {Promise<void>} No content
     */
    deleteRoom: builder.mutation<void, DeleteRoomInput>({
      query: params => ({
        url: ApiEndpoints.LEARN.DELETE_ROOM(params.roomId),
        method: HttpMethod.DELETE,
        body: params,
      }),
    }),
  }),
});

export const {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useGetScenarioQuery,
  useGetScenariosQuery,
} = learnAPI;
