import { baseAPI } from "@/api/baseAPI";

const callSummaryAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getCallSummary: builder.query({
      query: (chatId) => `/chats/${chatId}`,
    }),
    updateCallSummary: builder.mutation({
      query: ({ chatId, data }) => ({
        url: `/chats/${chatId}/update-call-details`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useGetCallSummaryQuery, useUpdateCallSummaryMutation } = callSummaryAPI;
