import { baseAPI } from "@/api/baseAPI";

const callsAPI = baseAPI.injectEndpoints({
    endpoints: (builder) => ({
        getCallLogs: builder.query({
            query: () => 'api/v1/chats/call-logs',
        })
    })
})

export const { useGetCallLogsQuery } = callsAPI;