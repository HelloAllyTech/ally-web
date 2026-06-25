import { baseAPI } from "@api";
import { ApiEndpoints, TAG_TYPES } from "@constants";
import {
  RoleplaySessionLogDetail,
  RoleplaySessionLogsParams,
  RoleplaySessionLogsResponse,
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
  }),
});

export const { useGetRoleplaySessionLogsQuery, useGetRoleplaySessionLogQuery } =
  roleplaySessionLogsAPI;
