import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreatePathBody,
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
            status: SimulationStatus.PUBLISHED,
            isGlobal: true,
            totalScenarios: 12,
            updatedAt: "2024-01-15T10:30:00Z",
          },
          {
            id: 2,
            title: "Mental Health Support",
            description: "Comprehensive training for mental health support scenarios",
            coverImageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
            status: SimulationStatus.PUBLISHED,
            isGlobal: false,
            totalScenarios: 8,
            updatedAt: "2024-01-14T14:20:00Z",
          },
          {
            id: 3,
            title: "Substance Abuse Counseling",
            description: "Practice scenarios for substance abuse counseling and support",
            coverImageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400",
            status: SimulationStatus.DRAFT,
            isGlobal: true,
            totalScenarios: 6,
            updatedAt: "2024-01-13T09:15:00Z",
          },
          {
            id: 4,
            title: "Domestic Violence Support",
            description: "Training for handling domestic violence support calls",
            coverImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
            status: SimulationStatus.PUBLISHED,
            isGlobal: true,
            totalScenarios: 10,
            updatedAt: "2024-01-12T16:45:00Z",
          },
          {
            id: 5,
            title: "Youth Counseling",
            description: "Specialized scenarios for youth and adolescent counseling",
            coverImageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400",
            status: SimulationStatus.ARCHIVED,
            isGlobal: false,
            totalScenarios: 5,
            updatedAt: "2024-01-10T11:30:00Z",
          },
          {
            id: 6,
            title: "Suicide Prevention",
            description: "Critical training for suicide prevention and intervention",
            coverImageUrl: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400",
            status: SimulationStatus.PUBLISHED,
            isGlobal: true,
            totalScenarios: 15,
            updatedAt: "2024-01-09T13:00:00Z",
          },
          {
            id: 7,
            title: "Grief Counseling",
            description: "Learn to provide support for individuals experiencing grief and loss",
            coverImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
            status: SimulationStatus.DRAFT,
            isGlobal: false,
            totalScenarios: 7,
            updatedAt: "2024-01-08T10:20:00Z",
          },
          {
            id: 8,
            title: "LGBTQ+ Support",
            description: "Inclusive support scenarios for LGBTQ+ community",
            coverImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            status: SimulationStatus.PUBLISHED,
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
            id: 1,
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
        const response = dummyData.find(item => item.id === Number(id));
        return { data: response };
      },
    }),

    createSimulationPath: builder.mutation<{ success: boolean }, CreatePathBody>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATHS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    updateSimulationPathById: builder.mutation<
      { success: boolean },
      { id: string; data: Partial<CreatePathBody> }
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
