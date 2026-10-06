/**
 * Text helpline — listener / supervisor endpoints (user JWT), ally-be
 * docs/text-helpline.md §5.3. Every route except `enabled` sits behind a
 * helpline permission AND the tenant's TEXT_HELPLINE_ENABLED toggle on the
 * server, which answers 403 `HELPLINE_DISABLED` when the toggle is off.
 *
 * The talker page does NOT use this slice: `baseAPI` logs the user out on a
 * 401, which would bounce an anonymous talker to /login. See helplineGuest.ts.
 *
 * Real-time updates are folded into these cache entries by
 * HelplineRealtimeProvider via `updateQueryData`, which can only patch an
 * entry that already holds data — so every screen here renders from a query
 * it owns, never from a patch alone.
 */
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import type {
  AckRiskFlagBody,
  ChatDetailDto,
  ChatListParams,
  ChatListResponse,
  CopilotFeedbackBody,
  HelplineMeDto,
  HelplinePresence,
  LobbyDto,
  RiskFlagDto,
  StaffMessageDto,
  SummaryDto,
  UpdateHelplineProfileBody,
} from "@types";

import { baseAPI } from "./baseAPI";

export const helplineAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /** Nav gate: any authenticated user, no helpline permission needed, never 403s. */
    getHelplineEnabled: builder.query<boolean, void>({
      query: () => ApiEndpoints.HELPLINE.ENABLED,
      transformResponse: (response: { enabled?: boolean } | null) => Boolean(response?.enabled),
    }),

    getHelplineMe: builder.query<HelplineMeDto, void>({
      query: () => ApiEndpoints.HELPLINE.ME,
      providesTags: [TAG_TYPES.HELPLINE_ME],
    }),

    updateHelplineProfile: builder.mutation<HelplineMeDto, UpdateHelplineProfileBody>({
      query: body => ({
        url: ApiEndpoints.HELPLINE.ME_PROFILE,
        method: HttpMethod.PUT,
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(helplineAPI.util.upsertQueryData("getHelplineMe", undefined, data));
        } catch {
          // The caller shows the error; the cached profile is still the server's.
        }
      },
    }),

    setHelplinePresence: builder.mutation<
      HelplineMeDto,
      { status: Exclude<HelplinePresence, "OFFLINE"> }
    >({
      query: body => ({
        url: ApiEndpoints.HELPLINE.ME_PRESENCE,
        method: HttpMethod.PUT,
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(helplineAPI.util.upsertQueryData("getHelplineMe", undefined, data));
        } catch {
          // Presence is driven by local state in the switch, which rolls back.
        }
      },
    }),

    getHelplineLobby: builder.query<LobbyDto, void>({
      query: () => ApiEndpoints.HELPLINE.LOBBY,
      providesTags: [TAG_TYPES.HELPLINE_LOBBY],
    }),

    /** 409 HELPLINE_ALREADY_CLAIMED · HELPLINE_AT_CAPACITY · HELPLINE_NOT_AVAILABLE. */
    claimHelplineChat: builder.mutation<ChatDetailDto, string>({
      query: chatId => ({
        url: ApiEndpoints.HELPLINE.CHAT_CLAIM(chatId),
        method: HttpMethod.POST,
      }),
      async onQueryStarted(chatId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Seed the chat view so it opens on the claimed chat without a second round trip.
          dispatch(helplineAPI.util.upsertQueryData("getHelplineChat", chatId, data));
        } catch {
          // Handled by the caller (toast + lobby refresh).
        }
      },
      invalidatesTags: [TAG_TYPES.HELPLINE_LOBBY, TAG_TYPES.HELPLINE_ME],
    }),

    getHelplineChat: builder.query<ChatDetailDto, string>({
      query: chatId => ApiEndpoints.HELPLINE.CHAT(chatId),
      providesTags: (_result, _error, chatId) => [{ type: TAG_TYPES.HELPLINE_CHAT, id: chatId }],
    }),

    getHelplineChatMessages: builder.query<
      { messages: StaffMessageDto[] },
      { chatId: string; afterId?: number }
    >({
      query: ({ chatId, afterId }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_MESSAGES(chatId),
        params: afterId !== undefined ? { afterId } : undefined,
      }),
      keepUnusedDataFor: 0,
    }),

    endHelplineChat: builder.mutation<ChatDetailDto, string>({
      query: chatId => ({
        url: ApiEndpoints.HELPLINE.CHAT_END(chatId),
        method: HttpMethod.POST,
      }),
      async onQueryStarted(chatId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(helplineAPI.util.upsertQueryData("getHelplineChat", chatId, data));
        } catch {
          // Handled by the caller.
        }
      },
      invalidatesTags: [TAG_TYPES.HELPLINE_LOBBY, TAG_TYPES.HELPLINE_ME, TAG_TYPES.HELPLINE_CHATS],
    }),

    saveHelplineSummary: builder.mutation<
      SummaryDto,
      { chatId: string; fields: Record<string, string> }
    >({
      query: ({ chatId, fields }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_SUMMARY(chatId),
        method: HttpMethod.PUT,
        body: { fields },
      }),
      async onQueryStarted({ chatId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            helplineAPI.util.updateQueryData("getHelplineChat", chatId, draft => {
              draft.summaries.final = data;
            }),
          );
        } catch {
          // Handled by the caller.
        }
      },
    }),

    getHelplineChats: builder.query<ChatListResponse, ChatListParams>({
      query: params => ({ url: ApiEndpoints.HELPLINE.CHATS, params }),
      providesTags: [TAG_TYPES.HELPLINE_CHATS],
    }),

    ackHelplineRiskFlag: builder.mutation<
      RiskFlagDto,
      { chatId: string; flagId: string; body: AckRiskFlagBody }
    >({
      query: ({ chatId, flagId, body }) => ({
        url: ApiEndpoints.HELPLINE.RISK_FLAG_ACK(chatId, flagId),
        method: HttpMethod.POST,
        body,
      }),
      async onQueryStarted({ chatId, flagId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            helplineAPI.util.updateQueryData("getHelplineChat", chatId, draft => {
              const index = draft.riskFlags.findIndex(flag => flag.id === flagId);
              if (index >= 0) draft.riskFlags[index] = data;
              else draft.riskFlags.push(data);
            }),
          );
        } catch {
          // Handled by the caller; the banner stays up until the server accepts.
        }
      },
    }),

    sendHelplineCopilotFeedback: builder.mutation<
      void,
      { chatId: string; body: CopilotFeedbackBody }
    >({
      query: ({ chatId, body }) => ({
        url: ApiEndpoints.HELPLINE.COPILOT_FEEDBACK(chatId),
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const {
  useGetHelplineEnabledQuery,
  useGetHelplineMeQuery,
  useUpdateHelplineProfileMutation,
  useSetHelplinePresenceMutation,
  useGetHelplineLobbyQuery,
  useClaimHelplineChatMutation,
  useGetHelplineChatQuery,
  useLazyGetHelplineChatMessagesQuery,
  useEndHelplineChatMutation,
  useSaveHelplineSummaryMutation,
  useGetHelplineChatsQuery,
  useAckHelplineRiskFlagMutation,
  useSendHelplineCopilotFeedbackMutation,
} = helplineAPI;
