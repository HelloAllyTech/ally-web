import { baseAPI } from "@/api/baseAPI";
import { GetCallLogsInput, GetCallLogsResponse } from "@/types/calls";

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
  }),
});

export const { useGetCallLogsQuery, useGetAdminCallLogsQuery } = callsAPI;
