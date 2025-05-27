import { baseAPI } from "@/api/baseAPI";

const callSummaryAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getSummaryFields: builder.query<string[], void>({
      query: () => "/settings/summary-fields",
    }),
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
  useGetSummaryFieldsQuery,
  useGetCallSummaryQuery,
  useUpdateCallSummaryMutation,
  useEnhanceContentMutation,
} = callSummaryAPI;
