import { baseAPI } from "@/api/baseAPI";

const callsAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getCallLogs: builder.query({
      query: () => "/chats/call-logs",
    }),
  }),
});

export const { useGetCallLogsQuery } = callsAPI;
