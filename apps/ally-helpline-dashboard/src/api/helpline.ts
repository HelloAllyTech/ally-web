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
  AlertSupervisorResponse,
  ChatDetailDto,
  ChatListParams,
  ChatListResponse,
  CopilotFeedbackBody,
  HelplineMeDto,
  HelplinePresence,
  LobbyDto,
  MonitorDto,
  QaDetailDto,
  QaListItemDto,
  QaListParams,
  RiskFlagDto,
  RiskFlagsParams,
  RiskFlagsResponse,
  StaffMessageDto,
  SummaryDto,
  TeamMemberDto,
  TransferBody,
  UpdateHelplineProfileBody,
  UpdateTeamMemberBody,
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
      // The outcome feeds the Monitor's open-flag counts and the calibration view.
      invalidatesTags: (_result, error) =>
        error ? [] : [TAG_TYPES.HELPLINE_MONITOR, TAG_TYPES.HELPLINE_RISK_FLAGS],
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

    // ─── Supervision (§5.3, §10) ─────────────────────────────────────────

    /** Listener of record (with edit:helpline:end) or a supervisor. */
    requestHelplineTransfer: builder.mutation<ChatDetailDto, { chatId: string } & TransferBody>({
      query: ({ chatId, targetListenerId }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_TRANSFER(chatId),
        method: HttpMethod.POST,
        body: targetListenerId !== undefined ? { targetListenerId } : {},
      }),
      async onQueryStarted({ chatId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(helplineAPI.util.upsertQueryData("getHelplineChat", chatId, data));
        } catch {
          // Handled by the caller.
        }
      },
      invalidatesTags: [TAG_TYPES.HELPLINE_LOBBY, TAG_TYPES.HELPLINE_MONITOR],
    }),

    /** Points a WAITING or transfer-pending chat at one listener, and alerts them. */
    assignHelplineChat: builder.mutation<ChatDetailDto, { chatId: string; listenerId: number }>({
      query: ({ chatId, listenerId }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_ASSIGN(chatId),
        method: HttpMethod.POST,
        body: { listenerId },
      }),
      invalidatesTags: [TAG_TYPES.HELPLINE_LOBBY, TAG_TYPES.HELPLINE_MONITOR],
    }),

    /** The supervisor becomes listener of record at once. */
    takeOverHelplineChat: builder.mutation<ChatDetailDto, string>({
      query: chatId => ({
        url: ApiEndpoints.HELPLINE.CHAT_TAKE_OVER(chatId),
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
      invalidatesTags: [
        TAG_TYPES.HELPLINE_LOBBY,
        TAG_TYPES.HELPLINE_ME,
        TAG_TYPES.HELPLINE_MONITOR,
      ],
    }),

    /** Staff-only; the server never puts a whisper in the talker room. */
    sendHelplineWhisper: builder.mutation<StaffMessageDto, { chatId: string; content: string }>({
      query: ({ chatId, content }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_WHISPER(chatId),
        method: HttpMethod.POST,
        body: { content },
      }),
      async onQueryStarted({ chatId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            helplineAPI.util.updateQueryData("getHelplineChat", chatId, draft => {
              // The WHISPER socket event may have delivered it first.
              if (!draft.messages.some(message => message.id === data.id)) {
                draft.messages.push(data);
                draft.messages.sort((a, b) => a.id - b.id);
              }
            }),
          );
        } catch {
          // Handled by the caller (the draft stays in the box).
        }
      },
    }),

    /** Ends the chat (TALKER_BLOCKED) and refuses new chats from this device/network for 24 h. */
    blockHelplineTalker: builder.mutation<
      void,
      { talkerId: string; chatId: string; reason?: string }
    >({
      query: ({ talkerId, reason }) => ({
        url: ApiEndpoints.HELPLINE.TALKER_BLOCK(talkerId),
        method: HttpMethod.POST,
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, error, { chatId }) =>
        error
          ? []
          : [
              { type: TAG_TYPES.HELPLINE_CHAT, id: chatId },
              TAG_TYPES.HELPLINE_LOBBY,
              TAG_TYPES.HELPLINE_MONITOR,
            ],
    }),

    /** The listener of record asks for a supervisor now (the checklist's "tell a supervisor"). */
    alertHelplineSupervisor: builder.mutation<
      AlertSupervisorResponse,
      { chatId: string; note?: string }
    >({
      query: ({ chatId, note }) => ({
        url: ApiEndpoints.HELPLINE.CHAT_ALERT_SUPERVISOR(chatId),
        method: HttpMethod.POST,
        body: note ? { note } : {},
      }),
    }),

    getHelplineMonitor: builder.query<MonitorDto, void>({
      query: () => ApiEndpoints.HELPLINE.MONITOR,
      providesTags: [TAG_TYPES.HELPLINE_MONITOR],
    }),

    getHelplineRiskFlags: builder.query<RiskFlagsResponse, RiskFlagsParams>({
      query: params => ({ url: ApiEndpoints.HELPLINE.RISK_FLAGS, params }),
      providesTags: [TAG_TYPES.HELPLINE_RISK_FLAGS],
    }),

    getHelplineQa: builder.query<{ items: QaListItemDto[]; total: number }, QaListParams>({
      query: params => ({ url: ApiEndpoints.HELPLINE.QA, params }),
      providesTags: [TAG_TYPES.HELPLINE_QA],
    }),

    /** The caller's own scored chats only — what a listener sees as "My feedback". */
    getMyHelplineQa: builder.query<{ items: QaListItemDto[] }, void>({
      query: () => ApiEndpoints.HELPLINE.QA_MINE,
      providesTags: [TAG_TYPES.HELPLINE_QA],
    }),

    getHelplineQaDetail: builder.query<QaDetailDto, string>({
      query: chatId => ApiEndpoints.HELPLINE.QA_DETAIL(chatId),
      providesTags: (_result, _error, chatId) => [{ type: TAG_TYPES.HELPLINE_QA, id: chatId }],
    }),

    getHelplineTeam: builder.query<{ items: TeamMemberDto[] }, string>({
      query: search => ({
        url: ApiEndpoints.HELPLINE.TEAM,
        params: search.trim() ? { search: search.trim() } : undefined,
      }),
      providesTags: [TAG_TYPES.HELPLINE_TEAM],
    }),

    /**
     * Grants/revokes exactly the two helpline groups. Optimistic: every cached
     * Team search shows the change at once and is rolled back if the server
     * refuses; on success the server's row replaces it.
     */
    updateHelplineTeamMember: builder.mutation<
      TeamMemberDto,
      { userId: number } & UpdateTeamMemberBody
    >({
      query: ({ userId, listener, supervisor }) => ({
        url: ApiEndpoints.HELPLINE.TEAM_MEMBER(userId),
        method: HttpMethod.PUT,
        body: { listener, supervisor },
      }),
      async onQueryStarted(
        { userId, listener, supervisor },
        { dispatch, getState, queryFulfilled },
      ) {
        const cached = helplineAPI.util
          .selectInvalidatedBy(getState(), [TAG_TYPES.HELPLINE_TEAM])
          .filter(entry => entry.endpointName === "getHelplineTeam");
        const patchMember = (recipe: (member: TeamMemberDto) => void) =>
          cached.map(({ originalArgs }) =>
            dispatch(
              helplineAPI.util.updateQueryData("getHelplineTeam", originalArgs, draft => {
                const member = draft.items.find(item => item.userId === userId);
                if (member) recipe(member);
              }),
            ),
          );
        const optimistic = patchMember(member => {
          member.isListener = listener;
          member.isSupervisor = supervisor;
        });
        try {
          const { data } = await queryFulfilled;
          patchMember(member => Object.assign(member, data));
        } catch {
          optimistic.forEach(patch => patch.undo());
        }
      },
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
  useRequestHelplineTransferMutation,
  useAssignHelplineChatMutation,
  useTakeOverHelplineChatMutation,
  useSendHelplineWhisperMutation,
  useBlockHelplineTalkerMutation,
  useAlertHelplineSupervisorMutation,
  useGetHelplineMonitorQuery,
  useGetHelplineRiskFlagsQuery,
  useGetHelplineQaQuery,
  useGetMyHelplineQaQuery,
  useGetHelplineQaDetailQuery,
  useGetHelplineTeamQuery,
  useUpdateHelplineTeamMemberMutation,
} = helplineAPI;
