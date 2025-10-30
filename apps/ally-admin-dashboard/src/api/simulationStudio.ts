import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  SessionEvent,
  GetSessionEventsQuery,
  SessionEventResponse,
  GetSimulationsQueryParams,
  GetSimulationsResponse,
  CreateSimulationInput,
  CreateSimulationResponse,
  GetSimulationByIdResponse,
  UpdateSimulationByIdInput,
  UpdateSimulationByIdResponse,
  GetCoverImageUrlRequest,
  GetCoverImageUrlResponse,
  DeleteCoverImageRequest,
  ScenarioVoice,
} from "@types";

import { baseAPI } from "./baseApi";

const simulationStudioAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get all simulations available in the Simulation Studio.
     * @returns {Promise<GetSimulationsResponse>} List of simulations
     */
    getSimulations: builder.query<GetSimulationsResponse, GetSimulationsQueryParams>({
      query: (params: GetSimulationsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_SIMULATIONS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get simulation by Id
     */
    getAdminSimulationById: builder.query<GetSimulationByIdResponse, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_ADMIN_SIMULATION_BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Create a new simulation.
     */
    createSimulation: builder.mutation<CreateSimulationResponse, CreateSimulationInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CREATE_SIMULATION,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Update simulation.
     */
    updateSimulationById: builder.mutation<UpdateSimulationByIdResponse, UpdateSimulationByIdInput>(
      {
        query: ({ id, simulation: body }) => ({
          url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_SIMULATION_BY_ID(id),
          method: HttpMethod.PUT,
          body,
        }),
        invalidatesTags: [TAG_TYPES.SIMULATION],
      },
    ),

    /**
     * Delete simulation by Id.
     */
    deleteSimulationById: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SIMULATION_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get custom events for a simulation.
     */
    getSessionEvents: builder.query<SessionEventResponse, GetSessionEventsQuery>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Create Session Event
     */
    createSessionEvent: builder.mutation<void, { event: SessionEvent }>({
      query: ({ event }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.POST,
        body: event,
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Create Session Events (bulk)
     */
    createSessionEvents: builder.mutation<Array<{ id?: string }>, { events: SessionEvent[] }>({
      query: ({ events }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.POST,
        body: { events },
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Update Events
     */
    updateSessionEvent: builder.mutation<void, { id: string; event: SessionEvent }>({
      query: ({ id, event }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_SESSION_EVENT(id),
        method: HttpMethod.PUT,
        body: event,
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Delete Session Events
     */
    deleteSessionEvents: builder.mutation<void, { eventIds: string[] }>({
      query: ({ eventIds }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_SESSION_EVENTS,
        method: HttpMethod.DELETE,
        body: { eventIds },
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Get presigned URL for S3 upload
     */
    getCoverImageUrl: builder.mutation<GetCoverImageUrlResponse, GetCoverImageUrlRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_COVER_IMAGE_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover image from S3
     */
    deleteCoverImage: builder.mutation<void, DeleteCoverImageRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_COVER_IMAGE,
        method: HttpMethod.DELETE,
        body,
      }),
    }),

    /**
     * Get all scenario voices
     */
    getScenarioVoices: builder.query<ScenarioVoice[], void>({
      query: () => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VOICES,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Map scenario events
     */
    mapScenarioEvents: builder.mutation<void, { scenarioId: number; events: any[] }>({
      query: ({ scenarioId, events }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.MAP_SCENARIO_EVENTS,
        method: HttpMethod.POST,
        body: { scenarioId, events },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION, TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Map scenario events
     */
    getMappedScenarioEvents: builder.query<{ data: any[] }, { id: string }>({
      query: ({ id }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_MAPPED_SCENARIO_EVENTS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Delete scenario events
     */
    deleteScenarioEvents: builder.mutation<void, { scenarioId: number; eventIds: string[] }>({
      query: ({ scenarioId, eventIds }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_EVENTS,
        method: HttpMethod.DELETE,
        body: { scenarioId, eventIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION, TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Get scenario preview
     */
    scenarioPreview: builder.mutation<any, { scenarioId: number }>({
      query: ({ scenarioId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PREVIEW,
        method: HttpMethod.POST,
        body: { scenarioId },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * End scenario preview
     */
    endScenarioPreview: builder.mutation<void, { roomName: string }>({
      query: ({ roomName }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.END_SCENARIO_PREVIEW(roomName),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),
  }),
});

export const {
  useGetSimulationsQuery,
  useLazyGetAdminSimulationByIdQuery,
  useCreateSimulationMutation,
  useUpdateSimulationByIdMutation,
  useDeleteSimulationByIdMutation,
  useGetSessionEventsQuery,
  useLazyGetSessionEventsQuery,
  useCreateSessionEventMutation,
  useCreateSessionEventsMutation,
  useUpdateSessionEventMutation,
  useDeleteSessionEventsMutation,
  useGetCoverImageUrlMutation,
  useDeleteCoverImageMutation,
  useGetScenarioVoicesQuery,
  useScenarioPreviewMutation,
  useEndScenarioPreviewMutation,
  useMapScenarioEventsMutation,
  useDeleteScenarioEventsMutation,
  useGetMappedScenarioEventsQuery,
} = simulationStudioAPI;
