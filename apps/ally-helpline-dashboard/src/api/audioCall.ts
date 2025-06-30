import { baseAPI } from "@/api/baseAPI";
import { GetWaitingClientsResponse } from "@/types/calls";
import { Chat, FeedbackInput, FeedbackResponse } from "@/types/message";

const audioCallAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getWaitingClients: builder.query<GetWaitingClientsResponse, void>({
      query: () => "/users/waiting-list",
    }),
    requestCall: builder.mutation<any, void>({
      query: () => ({
        url: "/chats/request",
        method: "POST",
      }),
    }),
    acceptCall: builder.mutation<any, { chatId: number }>({
      query: ({ chatId }) => ({
        url: `/chats/${chatId}/accept`,
        method: "POST",
      }),
    }),
    getCounsellorChat: builder.query<Chat, void>({
      query: () => "/chats/counsellor-chat",
    }),
    getClientChat: builder.query<Chat, void>({
      query: () => "/chats/my-chat",
    }),
    endCall: builder.mutation<any, { chatId: number }>({
      query: ({ chatId }) => ({
        url: `/chats/${chatId}/end`,
        method: "POST",
      }),
    }),
    addFeedback: builder.mutation<FeedbackResponse, { id: number; feedback: FeedbackInput }>({
      query: ({ id, feedback }) => ({
        url: `chats/messages/${id}/feedback`,
        method: "POST",
        body: feedback,
      }),
    }),
    updateFeedback: builder.mutation<
      FeedbackResponse,
      { feedbackId: number; feedback: FeedbackInput }
    >({
      query: ({ feedbackId, feedback }) => ({
        url: `chats/messages/feedback/${feedbackId}`,
        method: "PATCH",
        body: feedback,
      }),
    }),
    getNudgeStatus: builder.query<boolean, void>({
      query: () => "/settings/nudge-status",
    }),
  }),
});

export const {
  useGetWaitingClientsQuery,
  useRequestCallMutation,
  useAcceptCallMutation,
  useLazyGetCounsellorChatQuery,
  useGetClientChatQuery,
  useLazyGetClientChatQuery,
  useEndCallMutation,
  useAddFeedbackMutation,
  useUpdateFeedbackMutation,
  useGetNudgeStatusQuery,
} = audioCallAPI;

export default audioCallAPI;
