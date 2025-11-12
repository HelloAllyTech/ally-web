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
  GetCoverVideoUrlRequest,
  GetCoverVideoUrlResponse,
  DeleteCoverVideoRequest,
  ScenarioVoice,
  GetScenarioPathsQueryParams,
  GetScenarioPathsResponse,
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
     * Get presigned URL for cover video S3 upload
     */
    getCoverVideoUrl: builder.mutation<GetCoverVideoUrlResponse, GetCoverVideoUrlRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_COVER_VIDEO_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover video from S3
     */
    deleteCoverVideo: builder.mutation<void, DeleteCoverVideoRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_COVER_VIDEO,
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

    /**
     * Get all scenario paths
     * TODO: Replace with actual API call when backend is ready
     */
    getScenarioPaths: builder.query<GetScenarioPathsResponse, GetScenarioPathsQueryParams>({
      queryFn: async (params: GetScenarioPathsQueryParams) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate dummy data
        const dummyData = [
          {
            id: 1,
            title: "Crisis Intervention Pathway",
            description:
              "Learn essential crisis intervention techniques and de-escalation strategies",
            coverImageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400",
            status: "published" as const,
            isGlobal: true,
            totalScenarios: 12,
            updatedAt: "2024-01-15T10:30:00Z",
          },
          {
            id: 2,
            title: "Mental Health Support",
            description: "Comprehensive training for mental health support scenarios",
            coverImageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
            status: "published" as const,
            isGlobal: false,
            totalScenarios: 8,
            updatedAt: "2024-01-14T14:20:00Z",
          },
          {
            id: 3,
            title: "Substance Abuse Counseling",
            description: "Practice scenarios for substance abuse counseling and support",
            coverImageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400",
            status: "draft" as const,
            isGlobal: true,
            totalScenarios: 6,
            updatedAt: "2024-01-13T09:15:00Z",
          },
          {
            id: 4,
            title: "Domestic Violence Support",
            description: "Training for handling domestic violence support calls",
            coverImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
            status: "published" as const,
            isGlobal: true,
            totalScenarios: 10,
            updatedAt: "2024-01-12T16:45:00Z",
          },
          {
            id: 5,
            title: "Youth Counseling",
            description: "Specialized scenarios for youth and adolescent counseling",
            coverImageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400",
            status: "archived" as const,
            isGlobal: false,
            totalScenarios: 5,
            updatedAt: "2024-01-10T11:30:00Z",
          },
          {
            id: 6,
            title: "Suicide Prevention",
            description: "Critical training for suicide prevention and intervention",
            coverImageUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400",
            status: "published" as const,
            isGlobal: true,
            totalScenarios: 15,
            updatedAt: "2024-01-09T13:00:00Z",
          },
          {
            id: 7,
            title: "Grief Counseling",
            description: "Learn to provide support for individuals experiencing grief and loss",
            coverImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
            status: "draft" as const,
            isGlobal: false,
            totalScenarios: 7,
            updatedAt: "2024-01-08T10:20:00Z",
          },
          {
            id: 8,
            title: "LGBTQ+ Support",
            description: "Inclusive support scenarios for LGBTQ+ community",
            coverImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            status: "published" as const,
            isGlobal: true,
            totalScenarios: 9,
            updatedAt: "2024-01-07T15:40:00Z",
          },
        ];

        // Filter by status if provided
        let filteredData = dummyData;
        if (params.status) {
          filteredData = dummyData.filter(
            item => item.status.toLowerCase() === params.status?.toLowerCase(),
          );
        }

        // Apply search if provided
        if (params.search) {
          const searchLower = params.search.toLowerCase();
          filteredData = filteredData.filter(
            item =>
              item.title.toLowerCase().includes(searchLower) ||
              item.description.toLowerCase().includes(searchLower),
          );
        }

        // Apply pagination
        const offset = params.offset || 0;
        const limit = params.limit || 30;
        const paginatedData = filteredData.slice(offset, offset + limit);

        return { data: { data: paginatedData } };
      },
      providesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Delete scenario path by Id
     * TODO: Replace with actual API call when backend is ready
     */
    deleteScenarioPathById: builder.mutation<void, number>({
      queryFn: async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        return { data: undefined };
      },
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
  useGetCoverVideoUrlMutation,
  useDeleteCoverVideoMutation,
  useGetScenarioVoicesQuery,
  useScenarioPreviewMutation,
  useEndScenarioPreviewMutation,
  useMapScenarioEventsMutation,
  useDeleteScenarioEventsMutation,
  useGetMappedScenarioEventsQuery,
  useGetScenarioPathsQuery,
  useDeleteScenarioPathByIdMutation,
} = simulationStudioAPI;
