import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useStore } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { helplineAPI } from "@api/helpline";
import { LOCAL_STORAGE_KEYS, TAG_TYPES } from "@constants";
import { HELPLINE_SOCKET_EVENTS, HELPLINE_TIMINGS } from "@constants/helpline";
import { Permissions } from "@constants/permissions";
import { HelplineSocketStatus, useHelplineSocket } from "@hooks/useHelplineSocket";
import { useUser } from "@hooks/useUser";
import type { AppDispatch, RootState } from "@store";
import type {
  ChatDetailDto,
  CopilotStatus,
  HelplineAlertPayload,
  HelplinePresence,
  QueueUpdatedPayload,
  RiskFlagDto,
  StaffChatDto,
  StaffMessageDto,
  SummaryDto,
  TransferEventPayload,
} from "@types";
import { createClientMessageId } from "@utils/helplineErrors";
import { hasPermissions } from "@utils/permission";

import {
  playAlertTone,
  playChime,
  showSupervisorAlertNotification,
  showWaitingNotification,
} from "../alerts";
import {
  alertKey,
  alertTarget,
  createAlertDeduper,
  isSupervisorAlertType,
} from "../supervisorAlerts";
import { lastMessageId, upsertRiskFlag, upsertStaffMessage } from "../utils";

export interface PendingStaffMessage {
  clientMessageId: string;
  chatId: string;
  content: string;
  createdAt: string;
  status: "pending" | "failed";
  failure?: string;
  suggestion?: { messageId: number; index: number };
}

interface HelplineRealtimeValue {
  connection: HelplineSocketStatus;
  typingByChat: Record<string, boolean>;
  pendingByChat: Record<string, PendingStaffMessage[]>;
  sendMessage: (
    chatId: string,
    content: string,
    suggestion?: { messageId: number; index: number },
  ) => void;
  retryMessage: (chatId: string, clientMessageId: string) => void;
  notifyTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  /** Register a chat the screen is showing; returns the cleanup. Joins its room and resyncs it. */
  watchChat: (chatId: string) => () => void;
  /** Pull anything missed since the last message we hold (SYNC_SINCE). */
  syncChat: (chatId: string) => Promise<void>;
}

const HelplineRealtimeContext = createContext<HelplineRealtimeValue | null>(null);

/** Ack errors worth resending automatically once the socket is back. */
const AUTO_RETRY_FAILURES = ["disconnected", "timeout"];

/**
 * The listener workspace's one staff socket, mounted once around every
 * /helpline route. It owns the connection, the presence heartbeat, typing
 * indicators and outgoing messages, and folds server events into the RTK Query
 * cache entries the screens render from.
 *
 * `updateQueryData` can only patch an entry that already holds data, so every
 * patch here is an optimisation on top of a query some screen owns — never
 * the only thing that moves the UI. Events for a chat nobody has loaded are
 * dropped; the screen fetches it fresh when it opens, then SYNC_SINCEs.
 */
export const HelplineRealtimeProvider: FC<{ children: ReactNode; enabled: boolean }> = ({
  children,
  enabled,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const navigate = useNavigate();
  const { permissions } = useUser();
  const isSupervisor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);
  const alertDeduper = useRef(createAlertDeduper());
  const monitorRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typingByChat, setTypingByChat] = useState<Record<string, boolean>>({});
  const [pendingByChat, setPendingByChat] = useState<Record<string, PendingStaffMessage[]>>({});
  const pendingRef = useRef(pendingByChat);
  pendingRef.current = pendingByChat;

  const watchedRef = useRef<Map<string, number>>(new Map());
  const knownWaitingRef = useRef<Set<string> | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Cache access ────────────────────────────────────────────────────────

  const selectChat = useCallback(
    (chatId: string): ChatDetailDto | undefined =>
      helplineAPI.endpoints.getHelplineChat.select(chatId)(store.getState()).data,
    [store],
  );
  const selectLobby = useCallback(
    () => helplineAPI.endpoints.getHelplineLobby.select()(store.getState()).data,
    [store],
  );
  const selectMe = useCallback(
    () => helplineAPI.endpoints.getHelplineMe.select()(store.getState()).data,
    [store],
  );

  const patchChat = useCallback(
    (chatId: string, recipe: (draft: ChatDetailDto) => void) => {
      dispatch(helplineAPI.util.updateQueryData("getHelplineChat", chatId, recipe));
    },
    [dispatch],
  );

  const setTyping = useCallback((chatId: string, typing: boolean) => {
    if (typingTimers.current[chatId]) clearTimeout(typingTimers.current[chatId]);
    delete typingTimers.current[chatId];
    setTypingByChat(current =>
      current[chatId] === typing ? current : { ...current, [chatId]: typing },
    );
    if (typing) {
      typingTimers.current[chatId] = setTimeout(
        () => setTypingByChat(current => ({ ...current, [chatId]: false })),
        HELPLINE_TIMINGS.TYPING_DISPLAY_MS,
      );
    }
  }, []);

  const removePending = useCallback((chatId: string, clientMessageId: string) => {
    setPendingByChat(current => ({
      ...current,
      [chatId]: (current[chatId] ?? []).filter(item => item.clientMessageId !== clientMessageId),
    }));
  }, []);

  const updatePending = useCallback(
    (chatId: string, clientMessageId: string, patch: Partial<PendingStaffMessage>) => {
      setPendingByChat(current => ({
        ...current,
        [chatId]: (current[chatId] ?? []).map(item =>
          item.clientMessageId === clientMessageId ? { ...item, ...patch } : item,
        ),
      }));
    },
    [],
  );

  /**
   * The Monitor polls every 15 s; socket events make it fresher. Bursts (a
   * queue update plus a chat update for one claim) coalesce into one refetch,
   * and only a mounted Monitor actually refetches.
   */
  const refreshMonitor = useCallback(() => {
    if (!isSupervisor || monitorRefreshTimer.current) return;
    monitorRefreshTimer.current = setTimeout(() => {
      monitorRefreshTimer.current = null;
      dispatch(helplineAPI.util.invalidateTags([TAG_TYPES.HELPLINE_MONITOR]));
    }, HELPLINE_TIMINGS.MONITOR_REFRESH_THROTTLE_MS);
  }, [dispatch, isSupervisor]);

  useEffect(
    () => () => {
      if (monitorRefreshTimer.current) clearTimeout(monitorRefreshTimer.current);
    },
    [],
  );

  /**
   * Supervisor alerts: a toast that stays until dismissed, with Open; a tone;
   * and a system notification when the tab is out of view. None of them names
   * the talker or carries anything anyone wrote. A repeat for the same chat
   * and type within 10 minutes is dropped (the server dedupes too).
   */
  const onSupervisorAlert = useCallback(
    (payload: HelplineAlertPayload) => {
      const key = alertKey(payload.type, payload.chatId);
      refreshMonitor();
      if (!alertDeduper.current(key)) return;
      const target = alertTarget(payload.type, payload.chatId);
      const text = t(`helplineWorkspace.alerts.types.${payload.type}`);
      toast.warning(text, {
        id: key,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t("helplineWorkspace.alerts.open"),
          onClick: () => navigate(target),
        },
      });
      playAlertTone();
      showSupervisorAlertNotification(
        t("helplineWorkspace.alerts.notificationTitle"),
        text,
        key,
        () => navigate(target),
      );
    },
    [navigate, refreshMonitor, t],
  );

  // ─── Server → client ─────────────────────────────────────────────────────

  const onMessage = useCallback(
    (payload: { chatId: string; message: StaffMessageDto }) => {
      if (!payload?.chatId || !payload.message) return;
      const { chatId, message } = payload;
      patchChat(chatId, draft => {
        upsertStaffMessage(draft, message);
        if (message.type === "TEXT" && message.senderRole === "TALKER") {
          draft.chat.lastTalkerMessageAt = message.createdAt;
        }
      });
      if (message.clientMessageId) removePending(chatId, message.clientMessageId);
      if (message.type === "TEXT" && message.senderRole === "TALKER") {
        setTyping(chatId, false);
        // Unread for chats this screen isn't showing.
        if (!watchedRef.current.has(chatId)) {
          dispatch(
            helplineAPI.util.updateQueryData("getHelplineLobby", undefined, draft => {
              const item = draft.myChats.find(chat => chat.id === chatId);
              if (item) {
                item.unreadForMe = (item.unreadForMe ?? 0) + 1;
                item.lastMessageAt = message.createdAt;
              }
            }),
          );
        }
      }
    },
    [dispatch, patchChat, removePending, setTyping],
  );

  const onQueueUpdated = useCallback(
    (payload: QueueUpdatedPayload) => {
      if (!payload?.waiting) return;
      // Read who was already waiting BEFORE patching the cache with the new list.
      const known =
        knownWaitingRef.current ?? new Set((selectLobby()?.waiting ?? []).map(e => e.chatId));
      knownWaitingRef.current = new Set(payload.waiting.map(entry => entry.chatId));
      refreshMonitor();
      dispatch(
        helplineAPI.util.updateQueryData("getHelplineLobby", undefined, draft => {
          draft.waiting = payload.waiting;
          if (payload.counts) draft.counts = payload.counts;
        }),
      );

      // Alert an Available listener to talkers who weren't waiting a moment ago.
      const me = selectMe();
      const arrivals = payload.waiting.filter(entry => !known.has(entry.chatId));
      if (!arrivals.length || !me || me.presence !== "AVAILABLE") return;
      if (arrivals.some(entry => entry.targetListenerId === me.userId)) {
        toast(t("helplineWorkspace.lobby.passedToYouToast"));
      }
      if (me.profile.notificationsEnabled) {
        playChime();
        showWaitingNotification(t("helplineWorkspace.lobby.notificationTitle"));
      }
    },
    [dispatch, refreshMonitor, selectLobby, selectMe, t],
  );

  const onTransferEvent = useCallback(
    (kind: "requested" | "transferred") => (payload: TransferEventPayload) => {
      dispatch(helplineAPI.util.invalidateTags([TAG_TYPES.HELPLINE_LOBBY]));
      refreshMonitor();
      if (!payload?.chatId) return;
      if (kind === "requested") {
        patchChat(payload.chatId, draft => {
          draft.chat.transferPending = true;
        });
        return;
      }
      // Who is listener of record changed: refetch the chat (if it's loaded)
      // so myAccess, the listener and the timeline are the server's.
      if (selectChat(payload.chatId)) {
        dispatch(
          helplineAPI.util.invalidateTags([{ type: TAG_TYPES.HELPLINE_CHAT, id: payload.chatId }]),
        );
      }
    },
    [dispatch, patchChat, refreshMonitor, selectChat],
  );

  const handlers = useMemo(
    () => ({
      [HELPLINE_SOCKET_EVENTS.MESSAGE_RECEIVED]: onMessage,
      [HELPLINE_SOCKET_EVENTS.SUGGESTIONS]: onMessage,
      [HELPLINE_SOCKET_EVENTS.NUDGE]: onMessage,
      [HELPLINE_SOCKET_EVENTS.WHISPER]: onMessage,
      [HELPLINE_SOCKET_EVENTS.QUEUE_UPDATED]: onQueueUpdated,
      [HELPLINE_SOCKET_EVENTS.USER_TYPING]: (payload: { chatId: string; role: string }) => {
        if (payload?.chatId && payload.role === "TALKER") setTyping(payload.chatId, true);
      },
      [HELPLINE_SOCKET_EVENTS.USER_STOPPED_TYPING]: (payload: { chatId: string; role: string }) => {
        if (payload?.chatId && payload.role === "TALKER") setTyping(payload.chatId, false);
      },
      [HELPLINE_SOCKET_EVENTS.PRESENCE_UPDATED]: (payload: {
        presence: HelplinePresence;
        activeChatCount: number;
      }) => {
        refreshMonitor();
        if (!payload?.presence) return;
        dispatch(
          helplineAPI.util.updateQueryData("getHelplineMe", undefined, draft => {
            draft.presence = payload.presence;
            if (typeof payload.activeChatCount === "number") {
              draft.activeChatCount = payload.activeChatCount;
            }
          }),
        );
      },
      [HELPLINE_SOCKET_EVENTS.CHAT_UPDATED]: (payload: { chat: StaffChatDto }) => {
        refreshMonitor();
        if (!payload?.chat?.id) return;
        // myAccess is per viewer (LISTENER on user:{id}, READ_ONLY on the chat
        // room), so this is also how a transfer or take-over reaches the
        // previous listener's screen.
        patchChat(payload.chat.id, draft => {
          draft.chat = payload.chat;
        });
      },
      [HELPLINE_SOCKET_EVENTS.CHAT_ENDED]: (payload: {
        chatId: string;
        endedReason: string | null;
      }) => {
        if (!payload?.chatId) return;
        patchChat(payload.chatId, draft => {
          draft.chat.status = "ENDED";
          draft.chat.endedReason = payload.endedReason ?? draft.chat.endedReason;
          draft.chat.endedAt = draft.chat.endedAt ?? new Date().toISOString();
        });
        setTyping(payload.chatId, false);
        refreshMonitor();
        dispatch(
          helplineAPI.util.invalidateTags([
            TAG_TYPES.HELPLINE_LOBBY,
            TAG_TYPES.HELPLINE_ME,
            TAG_TYPES.HELPLINE_CHATS,
          ]),
        );
      },
      [HELPLINE_SOCKET_EVENTS.PARTICIPANT_STATUS]: (payload: {
        chatId: string;
        role: "TALKER" | "LISTENER";
        connected: boolean;
      }) => {
        if (!payload?.chatId) return;
        patchChat(payload.chatId, draft => {
          if (payload.role === "TALKER") draft.chat.talker.connected = payload.connected;
          else draft.chat.listenerConnected = payload.connected;
        });
      },
      [HELPLINE_SOCKET_EVENTS.RISK_FLAGGED]: (payload: { chatId: string; flag: RiskFlagDto }) => {
        if (!payload?.chatId || !payload.flag) return;
        patchChat(payload.chatId, draft => upsertRiskFlag(draft, payload.flag));
        refreshMonitor();
      },
      // A flag was acknowledged (here or elsewhere): clears its banner, no re-alert.
      [HELPLINE_SOCKET_EVENTS.RISK_FLAG_UPDATED]: (payload: {
        chatId: string;
        flag: RiskFlagDto;
      }) => {
        if (!payload?.chatId || !payload.flag) return;
        patchChat(payload.chatId, draft => upsertRiskFlag(draft, payload.flag));
        refreshMonitor();
      },
      [HELPLINE_SOCKET_EVENTS.STAGE]: (payload: { chatId: string; stage: string }) => {
        if (!payload?.chatId) return;
        patchChat(payload.chatId, draft => {
          draft.copilot.stage = payload.stage;
        });
      },
      [HELPLINE_SOCKET_EVENTS.COPILOT_STATUS]: (payload: {
        chatId: string;
        status: CopilotStatus;
      }) => {
        if (!payload?.chatId) return;
        patchChat(payload.chatId, draft => {
          draft.copilot.status = payload.status;
        });
      },
      [HELPLINE_SOCKET_EVENTS.SUMMARY_UPDATED]: (payload: {
        chatId: string;
        summary: SummaryDto;
      }) => {
        if (!payload?.chatId || !payload.summary) return;
        const key = payload.summary.kind.toLowerCase() as "rolling" | "handoff" | "final";
        patchChat(payload.chatId, draft => {
          draft.summaries[key] = payload.summary;
        });
      },
      [HELPLINE_SOCKET_EVENTS.TRANSFER_REQUESTED]: onTransferEvent("requested"),
      [HELPLINE_SOCKET_EVENTS.TRANSFERRED]: onTransferEvent("transferred"),
      [HELPLINE_SOCKET_EVENTS.ALERT]: (payload: HelplineAlertPayload) => {
        if (!payload?.type) return;
        if (isSupervisor && isSupervisorAlertType(payload.type) && payload.chatId) {
          onSupervisorAlert(payload);
          return;
        }
        // A listener only hears about a high-risk talker waiting while they're Available.
        if (payload.type === "HIGH_RISK_WAITING" && selectMe()?.presence === "AVAILABLE") {
          toast.warning(t("helplineWorkspace.lobby.highRiskWaiting"));
        }
      },
      [HELPLINE_SOCKET_EVENTS.ERROR]: (payload: { code?: string }) => {
        logger.info(`[helpline-staff] server error: ${payload?.code ?? "unknown"}`);
      },
    }),
    [
      dispatch,
      isSupervisor,
      onMessage,
      onQueueUpdated,
      onSupervisorAlert,
      onTransferEvent,
      patchChat,
      refreshMonitor,
      selectMe,
      setTyping,
      t,
    ],
  );

  // ─── Socket ──────────────────────────────────────────────────────────────

  const deliverRef = useRef<(pending: PendingStaffMessage) => Promise<void>>(async () => undefined);

  const syncChatRef = useRef<(chatId: string) => Promise<void>>(async () => undefined);

  const {
    status: connection,
    emit,
    emitWithAck,
  } = useHelplineSocket({
    label: "helpline-staff",
    enabled,
    getToken: () => localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN),
    handlers,
    onConnected: async ({ isReconnect }) => {
      const lobby = selectLobby();
      const chatIds = new Set<string>([
        ...(lobby?.myChats.map(chat => chat.id) ?? []),
        ...watchedRef.current.keys(),
      ]);
      for (const chatId of watchedRef.current.keys()) {
        await emitWithAck(HELPLINE_SOCKET_EVENTS.JOIN_CHAT, { chatId });
      }
      await Promise.all([...chatIds].map(chatId => syncChatRef.current(chatId)));
      if (isReconnect) {
        dispatch(
          helplineAPI.util.invalidateTags([TAG_TYPES.HELPLINE_LOBBY, TAG_TYPES.HELPLINE_ME]),
        );
      }
      for (const list of Object.values(pendingRef.current)) {
        for (const item of list) {
          if (item.status === "failed" && AUTO_RETRY_FAILURES.includes(item.failure ?? "")) {
            updatePending(item.chatId, item.clientMessageId, {
              status: "pending",
              failure: undefined,
            });
            void deliverRef.current(item);
          }
        }
      }
    },
  });

  const syncChat = useCallback(
    async (chatId: string) => {
      const detail = selectChat(chatId);
      if (!detail) return;
      const ack = await emitWithAck<{ messages: StaffMessageDto[] }>(
        HELPLINE_SOCKET_EVENTS.SYNC_SINCE,
        { chatId, afterId: lastMessageId(detail.messages) },
      );
      const messages = ack.ok && Array.isArray(ack.messages) ? ack.messages : [];
      if (messages.length) {
        patchChat(chatId, draft => messages.forEach(message => upsertStaffMessage(draft, message)));
      }
    },
    [emitWithAck, patchChat, selectChat],
  );
  syncChatRef.current = syncChat;

  const watchChat = useCallback(
    (chatId: string) => {
      const count = watchedRef.current.get(chatId) ?? 0;
      watchedRef.current.set(chatId, count + 1);
      // Idempotent on the server: rejoins our own chat, joins read-only otherwise.
      void emitWithAck(HELPLINE_SOCKET_EVENTS.JOIN_CHAT, { chatId });
      dispatch(
        helplineAPI.util.updateQueryData("getHelplineLobby", undefined, draft => {
          const item = draft.myChats.find(chat => chat.id === chatId);
          if (item) item.unreadForMe = 0;
        }),
      );
      return () => {
        const remaining = (watchedRef.current.get(chatId) ?? 1) - 1;
        if (remaining > 0) {
          watchedRef.current.set(chatId, remaining);
          return;
        }
        watchedRef.current.delete(chatId);
        // Never leave the room of a chat we are still the listener of — that is
        // where its live messages arrive.
        const detail = selectChat(chatId);
        const stillMine = detail?.chat.status === "ACTIVE" && detail.chat.myAccess === "LISTENER";
        if (!stillMine) emit(HELPLINE_SOCKET_EVENTS.LEAVE_CHAT, { chatId });
      };
    },
    [dispatch, emit, emitWithAck, selectChat],
  );

  // ─── Client → server ─────────────────────────────────────────────────────

  const lastTypingSent = useRef<Record<string, number>>({});
  const typingIdle = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const stopTyping = useCallback(
    (chatId: string) => {
      if (typingIdle.current[chatId]) clearTimeout(typingIdle.current[chatId]);
      delete typingIdle.current[chatId];
      if (lastTypingSent.current[chatId]) {
        emit(HELPLINE_SOCKET_EVENTS.USER_STOPPED_TYPING, { chatId });
      }
      delete lastTypingSent.current[chatId];
    },
    [emit],
  );

  const notifyTyping = useCallback(
    (chatId: string) => {
      const now = Date.now();
      if (now - (lastTypingSent.current[chatId] ?? 0) > HELPLINE_TIMINGS.TYPING_THROTTLE_MS) {
        emit(HELPLINE_SOCKET_EVENTS.USER_TYPING, { chatId });
        lastTypingSent.current[chatId] = now;
      }
      if (typingIdle.current[chatId]) clearTimeout(typingIdle.current[chatId]);
      typingIdle.current[chatId] = setTimeout(
        () => stopTyping(chatId),
        HELPLINE_TIMINGS.TYPING_IDLE_MS,
      );
    },
    [emit, stopTyping],
  );

  const deliver = useCallback(
    async (pending: PendingStaffMessage) => {
      const ack = await emitWithAck<{ message: StaffMessageDto }>(
        HELPLINE_SOCKET_EVENTS.SEND_MESSAGE,
        {
          chatId: pending.chatId,
          clientMessageId: pending.clientMessageId,
          content: pending.content,
          ...(pending.suggestion ? { suggestion: pending.suggestion } : {}),
        },
      );
      if (ack.ok) {
        const message = ack.message;
        if (message) patchChat(pending.chatId, draft => upsertStaffMessage(draft, message));
        removePending(pending.chatId, pending.clientMessageId);
      } else {
        updatePending(pending.chatId, pending.clientMessageId, {
          status: "failed",
          failure: ack.error ?? "unknown",
        });
      }
    },
    [emitWithAck, patchChat, removePending, updatePending],
  );
  deliverRef.current = deliver;

  const sendMessage = useCallback<HelplineRealtimeValue["sendMessage"]>(
    (chatId, content, suggestion) => {
      const pending: PendingStaffMessage = {
        clientMessageId: createClientMessageId(),
        chatId,
        content,
        createdAt: new Date().toISOString(),
        status: "pending",
        ...(suggestion ? { suggestion } : {}),
      };
      setPendingByChat(current => ({
        ...current,
        [chatId]: [...(current[chatId] ?? []), pending],
      }));
      stopTyping(chatId);
      void deliver(pending);
    },
    [deliver, stopTyping],
  );

  const retryMessage = useCallback(
    (chatId: string, clientMessageId: string) => {
      const pending = pendingRef.current[chatId]?.find(
        item => item.clientMessageId === clientMessageId,
      );
      if (!pending) return;
      updatePending(chatId, clientMessageId, { status: "pending", failure: undefined });
      void deliver(pending);
    },
    [deliver, updatePending],
  );

  const value = useMemo<HelplineRealtimeValue>(
    () => ({
      connection,
      typingByChat,
      pendingByChat,
      sendMessage,
      retryMessage,
      notifyTyping,
      stopTyping,
      watchChat,
      syncChat,
    }),
    [
      connection,
      typingByChat,
      pendingByChat,
      sendMessage,
      retryMessage,
      notifyTyping,
      stopTyping,
      watchChat,
      syncChat,
    ],
  );

  return (
    <HelplineRealtimeContext.Provider value={value}>{children}</HelplineRealtimeContext.Provider>
  );
};

export const useHelplineRealtime = (): HelplineRealtimeValue => {
  const value = useContext(HelplineRealtimeContext);
  if (!value) {
    throw new Error("useHelplineRealtime must be used inside <HelplineRealtimeProvider>");
  }
  return value;
};
