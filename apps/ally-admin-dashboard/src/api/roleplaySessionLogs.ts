import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  RoleplaySessionLogDetail,
  RoleplaySessionLogsParams,
  RoleplaySessionLogsResponse,
  StartV2VTestParams,
  StartV2VTestResponse,
} from "@types";

const roleplaySessionLogsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getRoleplaySessionLogs: builder.query<RoleplaySessionLogsResponse, RoleplaySessionLogsParams>({
      query: params => ({
        url: ApiEndpoints.ROLEPLAY_SESSION_LOGS.LIST,
        params,
      }),
      providesTags: [TAG_TYPES.ROLEPLAY_SESSION_LOGS],
    }),

    getRoleplaySessionLog: builder.query<RoleplaySessionLogDetail, string>({
      query: id => ({
        url: ApiEndpoints.ROLEPLAY_SESSION_LOGS.BY_ID(id),
      }),
      providesTags: [TAG_TYPES.ROLEPLAY_SESSION_LOGS],
    }),

    // Superadmin: start an AI-vs-AI V2V test session (the simulated user plays
    // the counselor side). The run lands in the logs list like a real session.
    startV2VTest: builder.mutation<StartV2VTestResponse, StartV2VTestParams>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.START_V2V_TEST,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.ROLEPLAY_SESSION_LOGS],
    }),
  }),
});

export const {
  useGetRoleplaySessionLogsQuery,
  useGetRoleplaySessionLogQuery,
  useStartV2VTestMutation,
} = roleplaySessionLogsAPI;
