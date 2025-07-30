import { baseAPI } from "@/api/baseAPI";
import { CallType } from "@/constants/call";
import {
  GetCallLogsInput,
  GetCallLogsResponse,
  GetCounsellorsResponse,
  GetTagsResponse,
  GetCounsellorsInput,
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
    getCounsellors: builder.query<GetCounsellorsResponse, GetCounsellorsInput>({
      query: params => ({
        url: "/chats/counselors",
        params,
      }),
      providesTags: ["CallLogs"],
    }),
    getCallTags: builder.query<GetTagsResponse, GetTagsInput>({
      query: params => ({
        url: "/chats/tags",
        params,
      }),
      providesTags: ["CallLogs"],
    }),
    getChatTypes: builder.query<CallType[], void>({
      query: () => "/settings/chat-types",
    }),
  }),
});

export const {
  useGetCallLogsQuery,
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetChatTypesQuery,
} = callsAPI;
