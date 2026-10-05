import { useCallback, useEffect, useRef, useState } from "react";

import { io, Socket } from "socket.io-client";

import { logger } from "@ally-ui-mono/ui-shared";
import { HELPLINE_SOCKET_EVENTS, HELPLINE_SOCKET_NAMESPACE, HELPLINE_TIMINGS } from "@constants";
import type { HelplineAck } from "@types";

const BASE_RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30_000;

export enum HelplineSocketStatus {
  IDLE = "IDLE",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING",
  DISCONNECTED = "DISCONNECTED",
}

export interface UseHelplineSocketOptions {
  /**
   * Read at every (re)connect, never captured once: a talker's guest token is
   * refreshed in place, and a listener's access token is refreshed by baseAPI —
   * a socket that closed over a stale one would fail auth on every retry.
   */
  getToken: () => string | null;
  /** Event name → handler. Registered on every (re)connect; read through a ref. */
  handlers: Record<string, (payload: never) => void>;
  /** After each successful connect — the place to SYNC_SINCE / JOIN_CHAT. */
  onConnected?: (info: { isReconnect: boolean }) => void;
  /** The handshake was refused (`unauthorized`) or the server is unreachable. */
  onConnectError?: (message: string) => void;
  enabled?: boolean;
  /** Label for logs. Never log payloads — they can carry message text. */
  label: string;
}

/**
 * socket.io plumbing for the `/helpline-chat` namespace, shared by the talker
 * page (guest token) and the listener workspace (user access token). Ported
 * from the admin console's `useAllySocket`, with three changes a live chat
 * needs:
 *
 * 1. NEVER GIVES UP. A talker mid-conversation on a flaky phone connection must
 *    keep trying; backoff caps at 30 s and an `online` event retries at once.
 * 2. ACKED EMITS. `emitWithAck` resolves with the server's `{ ok, ... }` ack, or
 *    `{ ok: false, error: "timeout" | "disconnected" }` — it never rejects, so a
 *    caller can mark a message failed and offer Retry without try/catch.
 * 3. HEARTBEAT every 15 s while connected; the server's liveness key lives 45 s.
 *
 * Reconnection is manual (`reconnection: false`) so the token is re-read and
 * `onConnected` knows whether this was a reconnect.
 */
export const useHelplineSocket = ({
  getToken,
  handlers,
  onConnected,
  onConnectError,
  enabled = true,
  label,
}: UseHelplineSocketOptions) => {
  const [status, setStatus] = useState<HelplineSocketStatus>(HelplineSocketStatus.IDLE);
  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const hasConnectedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  // Callers pass inline objects; refs keep a re-render from tearing the socket down.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const onConnectErrorRef = useRef(onConnectError);
  onConnectErrorRef.current = onConnectError;

  const scheduleReconnectRef = useRef<() => void>(() => undefined);

  const stopHeartbeat = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  };

  const teardown = useCallback(() => {
    stopHeartbeat();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (!activeRef.current || socketRef.current?.connected) return;
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = getTokenRef.current();
    if (!token) {
      setStatus(HelplineSocketStatus.DISCONNECTED);
      return;
    }

    setStatus(
      hasConnectedRef.current ? HelplineSocketStatus.RECONNECTING : HelplineSocketStatus.CONNECTING,
    );

    const socket = io(`${import.meta.env.VITE_API_BASE_URL}/${HELPLINE_SOCKET_NAMESPACE}`, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 10_000,
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const isReconnect = hasConnectedRef.current;
      hasConnectedRef.current = true;
      attemptsRef.current = 0;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      setStatus(HelplineSocketStatus.CONNECTED);

      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (socket.connected) socket.emit(HELPLINE_SOCKET_EVENTS.HEARTBEAT, {});
      }, HELPLINE_TIMINGS.HEARTBEAT_MS);

      onConnectedRef.current?.({ isReconnect });
    });

    socket.on("connect_error", (error: Error) => {
      logger.info(`[${label}] connect_error: ${error?.message ?? "unknown"}`);
      onConnectErrorRef.current?.(error?.message ?? "");
      scheduleReconnectRef.current();
    });

    socket.on("disconnect", (reason: string) => {
      logger.info(`[${label}] disconnected: ${reason}`);
      stopHeartbeat();
      setStatus(HelplineSocketStatus.DISCONNECTED);
      // A deliberate client-side close must not trigger a reconnect storm.
      if (reason !== "io client disconnect") scheduleReconnectRef.current();
    });

    for (const event of Object.keys(handlersRef.current)) {
      socket.on(event, (payload: unknown) =>
        (handlersRef.current[event] as ((p: unknown) => void) | undefined)?.(payload),
      );
    }
  }, [label]);

  const scheduleReconnect = useCallback(() => {
    if (!activeRef.current) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    attemptsRef.current += 1;
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(1.5, attemptsRef.current - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    setStatus(HelplineSocketStatus.RECONNECTING);
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [connect]);
  scheduleReconnectRef.current = scheduleReconnect;

  /** Reconnect now (e.g. after a token refresh, or the browser came back online). */
  const reconnectNow = useCallback(() => {
    if (!activeRef.current || socketRef.current?.connected) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    connect();
  }, [connect]);

  /** Fire-and-forget. No-ops while disconnected (typing indicators, LEAVE_CHAT). */
  const emit = useCallback((event: string, payload?: unknown) => {
    if (socketRef.current?.connected) socketRef.current.emit(event, payload);
  }, []);

  const emitWithAck = useCallback(
    <T extends Record<string, unknown> = Record<string, unknown>>(
      event: string,
      payload: unknown,
      timeoutMs: number = HELPLINE_TIMINGS.ACK_TIMEOUT_MS,
    ): Promise<HelplineAck<T>> =>
      new Promise(resolve => {
        const failed = (error: string) => ({ ok: false, error }) as HelplineAck<T>;
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve(failed("disconnected"));
          return;
        }
        socket
          .timeout(timeoutMs)
          .emit(event, payload, (err: Error | null, response?: HelplineAck<T>) => {
            if (err) resolve(failed("timeout"));
            else resolve(response ?? failed("no_response"));
          });
      }),
    [],
  );

  useEffect(() => {
    if (!enabled) {
      activeRef.current = false;
      teardown();
      hasConnectedRef.current = false;
      attemptsRef.current = 0;
      setStatus(HelplineSocketStatus.IDLE);
      return undefined;
    }
    activeRef.current = true;
    connect();

    const onOnline = () => reconnectNow();
    window.addEventListener("online", onOnline);
    return () => {
      activeRef.current = false;
      window.removeEventListener("online", onOnline);
      teardown();
    };
  }, [enabled, connect, reconnectNow, teardown]);

  return { status, emit, emitWithAck, reconnectNow };
};
