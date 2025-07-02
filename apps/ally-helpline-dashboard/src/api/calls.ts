import { baseAPI } from "@/api/baseAPI";
import {
  GetCallLogsInput,
  GetCallLogsResponse,
  GetCounselorsResponse,
  GetTagsResponse,
  GetCounselorsInput,
  GetTagsInput,
} from "@/types/calls";

const callsAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCallLogs: builder.query<GetCallLogsResponse, GetCallLogsInput>({
      query: params => ({
        url: "/chats/call-logs",
        params,
      }),
      providesTags: ["CallLogs"],
    }),
    getAdminCallLogs: builder.query<GetCallLogsResponse, GetCallLogsInput>({
      query: params => ({
        url: "/chats/call-logs-summary",
        params,
      }),
      providesTags: ["CallLogs"],
    }),
    getCounselors: builder.query<GetCounselorsResponse, GetCounselorsInput>({
      query: params => ({
        url: "/chats/counselors",
        params,
      }),
      providesTags: ["Counselors"],
    }),
    getTags: builder.query<GetTagsResponse, GetTagsInput>({
      query: params => ({
        url: "/chats/tags",
        params,
      }),
      providesTags: ["Tags"],
    }),
  }),
});

export const {
  useGetCallLogsQuery,
  useGetAdminCallLogsQuery,
  useGetCounselorsQuery,
  useGetTagsQuery,
} = callsAPI;
