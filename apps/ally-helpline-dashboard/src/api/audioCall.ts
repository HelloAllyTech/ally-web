import { baseAPI } from "@/api/baseAPI";
import { Chat, GetWaitingClientsResponse } from "@/types/message";

const audioCallAPI = baseAPI.injectEndpoints({
  endpoints: (builder) => ({
    getWaitingClients: builder.query<GetWaitingClientsResponse, void>({
      query: () => "/users/waiting-list",
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
  useAcceptCallMutation,
  useLazyGetCounsellorChatQuery,
  useLazyGetClientChatQuery,
  useEndCallMutation,
} = audioCallAPI;
