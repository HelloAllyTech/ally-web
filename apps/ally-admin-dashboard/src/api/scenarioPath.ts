import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreatePathInput,
  GetPathByIdResponse,
  GetScenarioPathsQueryParams,
  GetScenarioPathsResponse,
  SimulationStatus,
} from "@types";

const simulationPathApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get all scenario paths
     * TODO: Replace with actual API call when backend is ready
     */
    getScenarioPaths: builder.query<GetScenarioPathsResponse, GetScenarioPathsQueryParams>({
      query: (params: GetScenarioPathsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATHS,
        method: HttpMethod.GET,
        params,
      }),

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

    getScenarioPathById: builder.query<GetPathByIdResponse, string>({
      // query: () => ({
      //   url: ApiEndpoints.SIMULATION_STUDIO.GET_SCENARIO_PATH,
      //   method: HttpMethod.GET,
      // }),
      // providesTags: [TAG_TYPES.SIMULATION_PATHS],

      queryFn: async id => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate dummy data
        const dummyData = [
          {
            id: "ba219a0d-2627-4715-a65a-2b99c3f21cca",
            title: "Crisis Intervention Pathway",
            description:
              "Learn essential crisis intervention techniques and de-escalation strategies",
            coverImageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400",
            isGlobal: true,
            status: SimulationStatus.PUBLISHED,
            scenarios: [
              {
                scenarioId: 1,
                minimumScore: 75,
                messageTitle: "Learn to handle high-stress emergency communications effectively.",
                feedback: "sample data",
                order: 1,
                coverImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
                title: "Emergency Response Scenario",
                description:
                  "Test your crisis management and quick decision-making skills in an emergency call simulation.",
              },
              {
                scenarioId: 2,
                minimumScore: 80,
                message: "Learn to handle high-stress emergency communications effectively.",
                order: 1,
                messageTitle: "Learn to handle high-stress emergency communications effectively.",
                feedback: "sample data",
                coverImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
                title: "Domestic Violence Support",
                description:
                  "Test your crisis management and quick decision-making skills in an emergency call simulation.",
              },
            ],
          },
          {
            id: 2,
            title: "Mental Health Support",
            description: "Comprehensive training for mental health support scenarios",
            coverImageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
            isGlobal: true,
            status: SimulationStatus.PUBLISHED,
            scenarios: [
              {
                scenarioId: 1,
                minimumScore: 75,
                messageTitle: "Learn to handle high-stress emergency communications effectively.",
                feedback: "sample data",
                order: 1,
                coverImageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400",
                title: "Emergency Response Scenario",
                description:
                  "Test your crisis management and quick decision-making skills in an emergency call simulation.",
              },
            ],
          },
        ];
        const response = dummyData.find(item => item.id === id);
        return { data: response };
      },
    }),

    createSimulationPath: builder.mutation<{ success: boolean }, CreatePathInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATHS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    updateSimulationPathById: builder.mutation<
      { success: boolean },
      { id: string; data: Partial<CreatePathInput> }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATH_BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
    }),
  }),
});

export const {
  useGetScenarioPathsQuery,
  useDeleteScenarioPathByIdMutation,
  useGetScenarioPathByIdQuery,
  useCreateSimulationPathMutation,
  useUpdateSimulationPathByIdMutation,
} = simulationPathApi;
