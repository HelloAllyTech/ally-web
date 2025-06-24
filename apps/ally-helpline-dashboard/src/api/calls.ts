import { baseAPI } from "@/api/baseAPI";
import { GetCallLogsInput, GetCallLogsResponse } from "@/types/calls";

const callsAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getCallLogs: builder.query<GetCallLogsResponse, GetCallLogsInput>({
      query: ({ limit, offset }) => ({
        url: "/chats/call-logs",
        params: { limit, offset },
      }),
      providesTags: ["CallLogs"],
    }),
  }),
});

export const { useGetCallLogsQuery } = callsAPI;
