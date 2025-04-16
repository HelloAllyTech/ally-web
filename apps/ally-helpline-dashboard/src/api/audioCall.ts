import { baseAPI } from "@/api/baseAPI";
import { GetWaitingClientsResponse } from "@/types/message";

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
  }),
});

export const { useGetWaitingClientsQuery, useAcceptCallMutation } = audioCallAPI;