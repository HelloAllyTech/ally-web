import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  CreatePathInput,
  CreatePathResponse,
  GetPathByIdResponse,
  GetScenarioPathsQueryParams,
  GetScenarioPathsResponse,
} from "@types";

const simulationPathApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getScenarioPaths: builder.query<GetScenarioPathsResponse, GetScenarioPathsQueryParams>({
      query: (params: GetScenarioPathsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATHS,
        method: HttpMethod.GET,
        params,
      }),

      providesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    getScenarioPathById: builder.query<GetPathByIdResponse, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATH_BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),

    createSimulationPath: builder.mutation<CreatePathResponse, CreatePathInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATHS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    updateSimulationPathById: builder.mutation<
      { success: boolean },
      { id: number | string; data: Partial<CreatePathInput> }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATH_BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    deleteScenarioPathById: builder.mutation<void, number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PATH_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    duplicateScenarioPath: builder.mutation<{ success: boolean }, string | number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DUPLICATE_SCENARIO_PATH(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_PATHS],
    }),

    getScenarioCases: builder.query<GetScenarioPathsResponse, GetScenarioPathsQueryParams>({
      query: (params: GetScenarioPathsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_CASES,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    deleteScenarioCaseById: builder.mutation<void, number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_CASE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    updateSimulationCaseById: builder.mutation<
      { success: boolean },
      { id: number | string; data: Partial<CreatePathInput> }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_CASE_BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    duplicateScenarioCase: builder.mutation<{ success: boolean }, string | number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DUPLICATE_SCENARIO_CASE(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    createSimulationCase: builder.mutation<CreatePathResponse, CreatePathInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_CASES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION_CASES],
    }),

    getScenarioCaseById: builder.query<GetPathByIdResponse, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_CASE_BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),
  }),
});

export const {
  useGetScenarioPathsQuery,
  useDeleteScenarioPathByIdMutation,
  useLazyGetScenarioPathByIdQuery,
  useCreateSimulationPathMutation,
  useUpdateSimulationPathByIdMutation,
  useDuplicateScenarioPathMutation,
  useGetScenarioCasesQuery,
  useDeleteScenarioCaseByIdMutation,
  useUpdateSimulationCaseByIdMutation,
  useDuplicateScenarioCaseMutation,
  useCreateSimulationCaseMutation,
  useLazyGetScenarioCaseByIdQuery,
} = simulationPathApi;
