import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { logger } from "@ally-ui-mono/ui-shared";
import {
  endGuestChatOnExit,
  useCreateGuestSessionMutation,
  useEndGuestChatMutation,
  useEraseGuestChatMutation,
  useLazyGetGuestChatQuery,
  useLazyGetPublicStatusQuery,
  useRefreshGuestTokenMutation,
  useSubmitGuestFeedbackMutation,
} from "@api/helplineGuest";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import {
  HELPLINE_LIMITS,
  HELPLINE_QUICK_EXIT_URL,
  HELPLINE_SOCKET_EVENTS,
  HELPLINE_TIMINGS,
} from "@constants/helpline";
import { useAnalytics } from "@hooks/useAnalytics";
import { HelplineSocketStatus, useHelplineSocket } from "@hooks/useHelplineSocket";
import type { GuestChatDto, GuestFeedbackBody, GuestMessageDto } from "@types";
import {
  createClientMessageId,
  isGuestTokenRejected,
  parseHelplineError,
} from "@utils/helplineErrors";
import {
  clearGuestToken,
  msUntilGuestTokenRefresh,
  readGuestToken,
  writeGuestToken,
} from "@utils/helplineGuestToken";

import {
  initialTalkerState,
  lastServerMessageId,
  nextLocalMessageId,
  talkerReducer,
  type TalkerAction,
  type TalkerState,
} from "./talkerReducer";

const TOKEN_REFRESH_RETRY_MS = 5 * 60 * 1000;
/** setTimeout fires at once for anything above 2^31 - 1 ms (~24.8 days). */
const MAX_TIMER_MS = 2_147_483_647;
const UNAUTHORIZED_CHECK_COOLDOWN_MS = 30_000;
/** Ack errors worth resending automatically once the socket is back. */
const AUTO_RETRY_FAILURES = ["disconnected", "timeout"];

const baseLanguage = (language: string | undefined) => (language || "en").split("-")[0];

export interface StartChatInput {
  displayName: string;
  language: string;
}

/**
 * Everything the talker page does, behind one hook: status, resume from a
 * stored guest token, session start, the guest socket (messages, typing, queue
 * position, accept/end), token refresh, end / erase / feedback, Quick exit.
 *
 * The transitions themselves live in talkerReducer (pure, unit-tested); this
 * hook performs the side effects and dispatches.
 */
export const useTalkerSession = (tenantCode: string) => {
  const { i18n } = useTranslation();
  const { track } = useAnalytics();
  const [state, rawDispatch] = useReducer(talkerReducer, initialTalkerState);
  const stateRef = useRef<TalkerState>(state);
  stateRef.current = state;
  // Keep the ref current between a dispatch and the next render, so a handler
  // that dispatches twice in a row reads its own first update.
  const dispatch = useCallback((action: TalkerAction) => {
    stateRef.current = talkerReducer(stateRef.current, action);
    rawDispatch(action);
  }, []);

  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(
    () => readGuestToken(tenantCode)?.expiresAt ?? null,
  );
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [refreshRecheck, setRefreshRecheck] = useState(0);

  const [fetchStatus] = useLazyGetPublicStatusQuery();
  const [fetchChat] = useLazyGetGuestChatQuery();
  const [createSession, { isLoading: isStarting }] = useCreateGuestSessionMutation();
  const [refreshToken] = useRefreshGuestTokenMutation();
  const [endChatRequest, { isLoading: isEnding }] = useEndGuestChatMutation();
  const [eraseRequest, { isLoading: isErasing }] = useEraseGuestChatMutation();
  const [feedbackRequest, { isLoading: isSubmittingFeedback }] = useSubmitGuestFeedbackMutation();

  const applyLanguage = useCallback(
    (language: string) => {
      if (language && baseLanguage(i18n.language) !== language) {
        void i18n.changeLanguage(language);
      }
    },
    [i18n],
  );

  // ─── Status + resume ─────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchStatus(
        { tenantCode, lang: baseLanguage(i18n.language) },
        false,
      ).unwrap();
      dispatch({ type: "STATUS_LOADED", status });
      return status;
    } catch {
      dispatch({ type: "STATUS_FAILED" });
      return null;
    }
  }, [dispatch, fetchStatus, i18n, tenantCode]);

  const resume = useCallback(async () => {
    const stored = readGuestToken(tenantCode);
    if (!stored) return;
    dispatch({ type: "RESUME_STARTED" });
    try {
      const response = await fetchChat({ tenantCode }, false).unwrap();
      setTokenExpiresAt(stored.expiresAt);
      dispatch({ type: "RESUMED", chat: response.chat, messages: response.messages });
      applyLanguage(response.chat.language);
    } catch (error) {
      if (isGuestTokenRejected(error)) {
        // Expired, revoked by erasure/block, or the chat is gone: start over cleanly.
        clearGuestToken(tenantCode);
        setTokenExpiresAt(null);
        dispatch({ type: "RESUME_FAILED", expired: true });
      } else {
        // Probably offline. Keep the token so Try again can pick the chat back up.
        dispatch({ type: "RESUME_FAILED", expired: false });
        dispatch({ type: "STATUS_FAILED" });
      }
    }
  }, [applyLanguage, dispatch, fetchChat, tenantCode]);

  const initialise = useCallback(() => {
    void loadStatus();
    void resume();
  }, [loadStatus, resume]);

  useEffect(() => {
    initialise();
    // Only on mount and when the helpline itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantCode]);

  /** Pull the chat and anything missed over HTTP (reconnect, end). */
  const syncOverHttp = useCallback(async () => {
    const current = stateRef.current;
    if (!current.chat || !readGuestToken(tenantCode)) return;
    try {
      const response = await fetchChat(
        { tenantCode, afterId: lastServerMessageId(current.messages) || undefined },
        false,
      ).unwrap();
      dispatch({ type: "CHAT_UPDATED", chat: response.chat });
      if (response.messages.length) {
        dispatch({ type: "MESSAGES_MERGED", messages: response.messages });
      }
    } catch (error) {
      if (isGuestTokenRejected(error)) {
        clearGuestToken(tenantCode);
        setTokenExpiresAt(null);
        dispatch({ type: "RESET", notice: "sessionExpired" });
        void loadStatus();
      }
    }
  }, [dispatch, fetchChat, loadStatus, tenantCode]);

  // ─── Socket ──────────────────────────────────────────────────────────────

  const typingDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentChat = (chatId: string | undefined) =>
    Boolean(chatId) && stateRef.current.chat?.id === chatId;

  const showListenerTyping = useCallback(
    (typing: boolean) => {
      if (typingDisplayTimer.current) clearTimeout(typingDisplayTimer.current);
      typingDisplayTimer.current = null;
      dispatch({ type: "LISTENER_TYPING", typing });
      if (typing) {
        typingDisplayTimer.current = setTimeout(
          () => dispatch({ type: "LISTENER_TYPING", typing: false }),
          HELPLINE_TIMINGS.TYPING_DISPLAY_MS,
        );
      }
    },
    [dispatch],
  );

  const handlers = useMemo(
    () => ({
      [HELPLINE_SOCKET_EVENTS.MESSAGE_RECEIVED]: (payload: {
        chatId: string;
        message: GuestMessageDto;
      }) => {
        if (!isCurrentChat(payload?.chatId) || !payload.message) return;
        dispatch({ type: "MESSAGES_MERGED", messages: [payload.message] });
        if (payload.message.from === "LISTENER") showListenerTyping(false);
      },
      [HELPLINE_SOCKET_EVENTS.USER_TYPING]: (payload: { chatId: string; role: string }) => {
        if (isCurrentChat(payload?.chatId) && payload.role === "LISTENER") {
          showListenerTyping(true);
        }
      },
      [HELPLINE_SOCKET_EVENTS.USER_STOPPED_TYPING]: (payload: { chatId: string; role: string }) => {
        if (isCurrentChat(payload?.chatId) && payload.role === "LISTENER") {
          showListenerTyping(false);
        }
      },
      [HELPLINE_SOCKET_EVENTS.QUEUE_POSITION]: (payload: { chatId: string; position: number }) => {
        if (payload && typeof payload.position === "number") {
          dispatch({ type: "QUEUE_POSITION", chatId: payload.chatId, position: payload.position });
        }
      },
      [HELPLINE_SOCKET_EVENTS.CHAT_ACCEPTED]: (payload: { chat: GuestChatDto }) => {
        if (payload?.chat) dispatch({ type: "CHAT_ACCEPTED", chat: payload.chat });
      },
      [HELPLINE_SOCKET_EVENTS.CHAT_UPDATED]: (payload: { chat: GuestChatDto }) => {
        if (payload?.chat) dispatch({ type: "CHAT_UPDATED", chat: payload.chat });
      },
      [HELPLINE_SOCKET_EVENTS.CHAT_ENDED]: (payload: {
        chatId: string;
        endedReason: string | null;
      }) => {
        if (!isCurrentChat(payload?.chatId)) return;
        dispatch({ type: "CHAT_ENDED", chatId: payload.chatId, endedReason: payload.endedReason });
        // The closing message may land just after the end event.
        void syncOverHttp();
      },
      [HELPLINE_SOCKET_EVENTS.ERROR]: (payload: { code?: string }) => {
        logger.info(`[helpline-talker] server error: ${payload?.code ?? "unknown"}`);
      },
    }),
    // stateRef/dispatch are stable; handlers are read through a ref by the socket hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showListenerTyping, syncOverHttp],
  );

  const chatId = state.chat?.id;
  const socketEnabled =
    Boolean(chatId) && state.chat?.status !== "ENDED" && state.screen !== "deleted";

  const lastUnauthorizedCheck = useRef(0);
  const deliverRef = useRef<(clientMessageId: string, content: string) => Promise<void>>(
    async () => undefined,
  );

  const {
    status: socketStatus,
    emit,
    emitWithAck,
  } = useHelplineSocket({
    label: "helpline-talker",
    enabled: socketEnabled,
    getToken: () => readGuestToken(tenantCode)?.token ?? null,
    handlers,
    onConnected: async ({ isReconnect }) => {
      const current = stateRef.current;
      if (!current.chat) return;
      const ack = await emitWithAck<{ messages: GuestMessageDto[] }>(
        HELPLINE_SOCKET_EVENTS.SYNC_SINCE,
        { chatId: current.chat.id, afterId: lastServerMessageId(current.messages) },
      );
      if (ack.ok && Array.isArray(ack.messages) && ack.messages.length) {
        dispatch({ type: "MESSAGES_MERGED", messages: ack.messages });
      }
      // The chat may have been accepted or ended while we were away.
      if (isReconnect) await syncOverHttp();
      // Resend what failed only because the connection was down. The server
      // de-duplicates on clientMessageId, so a resend can never double-post.
      for (const message of stateRef.current.messages) {
        if (
          message.localStatus === "failed" &&
          message.clientMessageId &&
          AUTO_RETRY_FAILURES.includes(message.failure ?? "")
        ) {
          dispatch({ type: "MESSAGE_RETRYING", clientMessageId: message.clientMessageId });
          void deliverRef.current(message.clientMessageId, message.content);
        }
      }
    },
    onConnectError: message => {
      if (message !== "unauthorized") return;
      const now = Date.now();
      if (now - lastUnauthorizedCheck.current < UNAUTHORIZED_CHECK_COOLDOWN_MS) return;
      lastUnauthorizedCheck.current = now;
      // The handshake refused the token — confirm over HTTP before starting over.
      void syncOverHttp();
    },
  });

  // ─── Messages + typing ───────────────────────────────────────────────────

  const deliver = useCallback(
    async (clientMessageId: string, content: string) => {
      const currentChatId = stateRef.current.chat?.id;
      if (!currentChatId) return;
      const ack = await emitWithAck<{ message: GuestMessageDto }>(
        HELPLINE_SOCKET_EVENTS.SEND_MESSAGE,
        { chatId: currentChatId, clientMessageId, content },
      );
      if (ack.ok) {
        dispatch({ type: "MESSAGE_ACKED", clientMessageId, message: ack.message ?? null });
      } else {
        dispatch({ type: "MESSAGE_FAILED", clientMessageId, failure: ack.error ?? "unknown" });
        if (ack.error === "chat_ended") void syncOverHttp();
      }
    },
    [dispatch, emitWithAck, syncOverHttp],
  );
  deliverRef.current = deliver;

  const lastTypingSentAt = useRef(0);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = null;
    const currentChatId = stateRef.current.chat?.id;
    if (lastTypingSentAt.current && currentChatId) {
      emit(HELPLINE_SOCKET_EVENTS.USER_STOPPED_TYPING, { chatId: currentChatId });
    }
    lastTypingSentAt.current = 0;
  }, [emit]);

  /** Call on every composer keystroke; throttled to one USER_TYPING per 2 s. */
  const notifyTyping = useCallback(() => {
    const current = stateRef.current.chat;
    if (!current || current.status === "ENDED") return;
    const now = Date.now();
    if (now - lastTypingSentAt.current > HELPLINE_TIMINGS.TYPING_THROTTLE_MS) {
      emit(HELPLINE_SOCKET_EVENTS.USER_TYPING, { chatId: current.id });
      lastTypingSentAt.current = now;
    }
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = setTimeout(stopTyping, HELPLINE_TIMINGS.TYPING_IDLE_MS);
  }, [emit, stopTyping]);

  /** Queue a message (shown at once as pending) and send it. False if nothing was sent. */
  const sendMessage = useCallback(
    (text: string): boolean => {
      const content = text.trim();
      const current = stateRef.current.chat;
      if (!content || !current || current.status === "ENDED") return false;
      if (content.length > HELPLINE_LIMITS.MESSAGE_MAX) return false;
      const clientMessageId = createClientMessageId();
      dispatch({
        type: "MESSAGE_QUEUED",
        localId: nextLocalMessageId(),
        clientMessageId,
        content,
        createdAt: new Date().toISOString(),
      });
      stopTyping();
      void deliver(clientMessageId, content);
      return true;
    },
    [deliver, dispatch, stopTyping],
  );

  const retryMessage = useCallback(
    (clientMessageId: string) => {
      const message = stateRef.current.messages.find(
        item => item.clientMessageId === clientMessageId,
      );
      if (!message) return;
      dispatch({ type: "MESSAGE_RETRYING", clientMessageId });
      void deliver(clientMessageId, message.content);
    },
    [deliver, dispatch],
  );

  useEffect(
    () => () => {
      if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
      if (typingDisplayTimer.current) clearTimeout(typingDisplayTimer.current);
    },
    [],
  );

  // ─── Guest token refresh (when < 1 h from expiry) ───────────────────────

  const hasChat = Boolean(state.chat);
  useEffect(() => {
    if (!tokenExpiresAt || !hasChat) return undefined;
    const wait = msUntilGuestTokenRefresh(
      tokenExpiresAt,
      HELPLINE_TIMINGS.GUEST_TOKEN_REFRESH_BEFORE_MS,
    );
    if (wait === null) return undefined;
    const delay = Math.max(0, refreshAttempt > 0 ? Math.max(wait, TOKEN_REFRESH_RETRY_MS) : wait);
    if (delay > MAX_TIMER_MS) {
      // Too far off for one timer: look again later rather than firing now.
      const recheck = setTimeout(() => setRefreshRecheck(count => count + 1), MAX_TIMER_MS);
      return () => clearTimeout(recheck);
    }
    const timer = setTimeout(async () => {
      try {
        const response = await refreshToken({ tenantCode }).unwrap();
        writeGuestToken(tenantCode, response.guestToken, response.expiresAt);
        setTokenExpiresAt(response.expiresAt);
      } catch (error) {
        // Rejected: refresh is only allowed until 24 h after the chat ended,
        // and that chat is finished. Anything else: try again shortly.
        if (!isGuestTokenRejected(error)) setRefreshAttempt(attempt => attempt + 1);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [tokenExpiresAt, hasChat, refreshAttempt, refreshRecheck, refreshToken, tenantCode]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const startChat = useCallback(
    async ({ displayName, language }: StartChatInput): Promise<boolean> => {
      const status = stateRef.current.status;
      if (!status) return false;
      dispatch({ type: "CLEAR_NOTICE" });
      const trimmedName = displayName.trim().slice(0, HELPLINE_LIMITS.DISPLAY_NAME_MAX);
      try {
        const response = await createSession({
          tenantCode,
          body: {
            ...(trimmedName ? { displayName: trimmedName } : {}),
            language,
            consentVersion: status.consent.version,
          },
        }).unwrap();
        writeGuestToken(tenantCode, response.guestToken, response.expiresAt);
        setTokenExpiresAt(response.expiresAt);
        setRefreshAttempt(0);
        dispatch({ type: "SESSION_STARTED", chat: response.chat, messages: response.messages });
        track(ANALYTICS_EVENTS.TALKER_SESSION_STARTED, {
          [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: response.chat.id,
          [ANALYTICS_PROPS.LANGUAGE]: language,
          [ANALYTICS_PROPS.HELPLINE_HAS_DISPLAY_NAME]: Boolean(trimmedName),
          [ANALYTICS_PROPS.HELPLINE_CHAT_STATUS]: response.chat.status,
        });
        return true;
      } catch (error) {
        const { status: httpStatus, errorCode } = parseHelplineError(error);
        if (errorCode === "HELPLINE_QUEUE_FULL") {
          dispatch({ type: "START_FAILED", reason: "queueFull" });
        } else if (errorCode === "HELPLINE_CLOSED" || httpStatus === 409) {
          dispatch({ type: "START_FAILED", reason: "closed" });
          void loadStatus();
        } else if (errorCode === "HELPLINE_DISABLED") {
          dispatch({ type: "START_FAILED", reason: "disabled" });
        } else if (errorCode === "HELPLINE_TALKER_BLOCKED") {
          dispatch({ type: "START_FAILED", reason: "blocked" });
        } else if (errorCode === "HELPLINE_CONSENT_OUTDATED") {
          dispatch({ type: "START_FAILED", reason: "consentOutdated" });
          void loadStatus();
        } else if (httpStatus === 429) {
          dispatch({ type: "START_FAILED", reason: "rateLimited" });
        } else {
          dispatch({ type: "START_FAILED", reason: "network" });
        }
        return false;
      }
    },
    [createSession, dispatch, loadStatus, tenantCode, track],
  );

  /** Leave the queue (WAITING) or end the chat (ACTIVE). */
  const endChat = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current.chat;
    if (!current) return false;
    const wasWaiting = current.status === "WAITING";
    stopTyping();
    try {
      const response = await endChatRequest({ tenantCode }).unwrap();
      if (response?.chat) dispatch({ type: "CHAT_UPDATED", chat: response.chat });
      else dispatch({ type: "CHAT_ENDED", chatId: current.id, endedReason: null });
    } catch (error) {
      if (parseHelplineError(error).errorCode !== "HELPLINE_CHAT_ENDED") return false;
      dispatch({ type: "CHAT_ENDED", chatId: current.id, endedReason: null });
    }
    const waitSeconds = Math.max(
      0,
      Math.round((Date.now() - Date.parse(current.waitStartedAt)) / 1000),
    );
    track(wasWaiting ? ANALYTICS_EVENTS.TALKER_QUEUE_LEFT : ANALYTICS_EVENTS.TALKER_CHAT_ENDED, {
      [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: current.id,
      ...(wasWaiting ? { [ANALYTICS_PROPS.HELPLINE_WAIT_SECONDS]: waitSeconds } : {}),
    });
    void syncOverHttp();
    return true;
  }, [dispatch, endChatRequest, stopTyping, syncOverHttp, tenantCode, track]);

  /** Erase everything now (ends the chat if open). False when the server refused. */
  const eraseConversation = useCallback(async (): Promise<boolean> => {
    const current = stateRef.current;
    try {
      await eraseRequest({ tenantCode }).unwrap();
    } catch {
      return false;
    }
    clearGuestToken(tenantCode);
    setTokenExpiresAt(null);
    dispatch({ type: "DELETED" });
    track(ANALYTICS_EVENTS.TALKER_CONVERSATION_DELETED, {
      [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: current.chat?.id,
      [ANALYTICS_PROPS.HELPLINE_SCREEN]: current.screen,
    });
    return true;
  }, [dispatch, eraseRequest, tenantCode, track]);

  const submitFeedback = useCallback(
    async (rating: GuestFeedbackBody["rating"], comment: string): Promise<boolean> => {
      const current = stateRef.current.chat;
      const trimmed = comment.trim().slice(0, HELPLINE_LIMITS.FEEDBACK_COMMENT_MAX);
      try {
        await feedbackRequest({
          tenantCode,
          body: { rating, ...(trimmed ? { comment: trimmed } : {}) },
        }).unwrap();
      } catch (error) {
        // Once per chat: a 409 means it already landed (e.g. from another try).
        if (parseHelplineError(error).status !== 409) return false;
      }
      dispatch({ type: "FEEDBACK_SUBMITTED" });
      track(ANALYTICS_EVENTS.TALKER_FEEDBACK_SUBMITTED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: current?.id,
        [ANALYTICS_PROPS.RATING]: rating,
        [ANALYTICS_PROPS.HAS_FEEDBACK_TEXT]: Boolean(trimmed),
      });
      return true;
    },
    [dispatch, feedbackRequest, tenantCode, track],
  );

  /** Forget this device's chat and go back to the consent screen. */
  const startNewChat = useCallback(() => {
    clearGuestToken(tenantCode);
    setTokenExpiresAt(null);
    dispatch({ type: "RESET" });
    void loadStatus();
  }, [dispatch, loadStatus, tenantCode]);

  /**
   * Leave at once for a neutral site. The token is cleared first so Back can't
   * reopen the chat, `location.replace` keeps this page out of history, and a
   * keepalive end tells the listener the talker has gone rather than leaving
   * them waiting for someone who can no longer come back on this device.
   */
  const quickExit = useCallback(() => {
    const current = stateRef.current;
    const stored = readGuestToken(tenantCode);
    track(ANALYTICS_EVENTS.TALKER_QUICK_EXIT_USED, {
      [ANALYTICS_PROPS.HELPLINE_SCREEN]: current.screen,
      ...(current.chat ? { [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: current.chat.id } : {}),
    });
    clearGuestToken(tenantCode);
    if (stored && current.chat && current.chat.status !== "ENDED") {
      endGuestChatOnExit(stored.token);
    }
    window.location.replace(HELPLINE_QUICK_EXIT_URL);
  }, [tenantCode, track]);

  return {
    state,
    connection: socketStatus,
    isReconnecting:
      socketEnabled &&
      (socketStatus === HelplineSocketStatus.RECONNECTING ||
        socketStatus === HelplineSocketStatus.DISCONNECTED),
    isStarting,
    isEnding,
    isErasing,
    isSubmittingFeedback,
    applyLanguage,
    retry: initialise,
    refreshStatus: loadStatus,
    startChat,
    sendMessage,
    retryMessage,
    notifyTyping,
    endChat,
    eraseConversation,
    submitFeedback,
    startNewChat,
    quickExit,
  };
};

export type TalkerSession = ReturnType<typeof useTalkerSession>;
