import { baseAPI } from "@/api/baseAPI";
import { Chat, GetWaitingClientsResponse } from "@/types/message";

const audioCallAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
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
} = audioCallAPI;

export default audioCallAPI;