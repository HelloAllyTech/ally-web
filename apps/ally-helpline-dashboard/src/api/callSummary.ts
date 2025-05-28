import { baseAPI } from "@/api/baseAPI";
import { EnhanceContentRequest, EnhanceContentResponse, SummaryFieldKey } from "@/types/summary";

const callSummaryAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getSummaryFields: builder.query<SummaryFieldKey[], void>({
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
    enhanceContent: builder.mutation<EnhanceContentResponse, EnhanceContentRequest>({
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
