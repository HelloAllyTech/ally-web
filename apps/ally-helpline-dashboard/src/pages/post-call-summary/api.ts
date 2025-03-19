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
    enhanceContent: builder.mutation({
      query: ({ content }) => ({
        url: "/chats/enhance",
        method: "POST",
        body: { content },
      }),
    }),
  }),
});

export const {
  useGetCallSummaryQuery,
  useUpdateCallSummaryMutation,
  useEnhanceContentMutation,
} = callSummaryAPI;
