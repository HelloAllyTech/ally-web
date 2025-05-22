import { baseAPI } from "@/api/baseAPI";

const callSummaryAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getCallSummary: builder.query({
      query: (chatId) => `/chats/${chatId}`,
      providesTags: ["CallSummary"],
    }),
    updateCallSummary: builder.mutation({
      query: ({ chatId, data }) => ({
        url: `/chats/${chatId}/call-details`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["CallSummary"],
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
