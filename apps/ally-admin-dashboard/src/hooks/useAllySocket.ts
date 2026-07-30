import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS } from "@constants";
import { logger } from "@utils";

const MAX_RECONNECTION_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

export enum AllySocketStatus {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  RECONNECTING = "RECONNECTING",
  ERROR = "ERROR",
  DISCONNECTED = "DISCONNECTED",
}

export interface UseAllySocketOptions {
  /** Namespace path appended to VITE_API_BASE_URL, e.g. "product-roadmap". */
  namespace: string;
  /** Event name → handler. Registered on every (re)connect. Must be referentially stable. */
  handlers: Record<string, (payload: unknown) => void>;
  /** Run after each successful connect — the place to (re)join rooms. */
  onConnected?: () => void;
  /**
   * Seconds the socket was down. Called on reconnect so the caller can decide whether the deltas
   * it missed are recoverable or whether it should refetch outright.
   */
  onReconnected?: (downtimeSeconds: number) => void;
  onStatusChange?: (status: AllySocketStatus) => void;
  /** Set false to keep the socket closed — e.g. the user lacks the permission to read this feed. */
  enabled?: boolean;
  /** Label used in logs. */
  label: string;
}

/**
 * Shared socket.io client plumbing: connect, authenticate, reconnect with backoff, clean up.
 *
 * `useScenarioReportsSocket` and `useScenarioTranslationsSocket` are ~250 near-identical
 * hand-rolled lines each. This exists so the roadmap feed is not a third copy of them. It is
 * deliberately NOT retrofitted onto those two in this change — they dispatch to their own Redux
 * status slices and are load-bearing elsewhere, so migrating them is its own piece of work.
 *
 * Two behaviours worth knowing:
 *
 * 1. THE TOKEN IS READ AT CONNECT TIME, not captured once. Admin access tokens refresh, and a
 *    socket that closed over a stale token would fail auth on every reconnect attempt until the
 *    tab reloaded.
 *
 * 2. RECONNECTION IS MANUAL (`reconnection: false`). socket.io's own retry gives no hook for
 *    "how long were we gone", and that answer is what decides between replaying deltas and
 *    refetching — see onReconnected.
 */
export const useAllySocket = ({
  namespace,
  handlers,
  onConnected,
  onReconnected,
  onStatusChange,
  enabled = true,
  label,
}: UseAllySocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const disconnectedAtRef = useRef<number | null>(null);

  // Handlers and callbacks live in refs so a caller re-render cannot tear down the socket. Without
  // this, an inline handler object would change identity every render and reconnect in a loop.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const onReconnectedRef = useRef(onReconnected);
  onReconnectedRef.current = onReconnected;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const socketUrl = `${import.meta.env.VITE_API_BASE_URL}/${namespace}`;

  // connect() and scheduleReconnect() are mutually recursive. Routing one direction through a ref
  // keeps both `useCallback` dep arrays honest and avoids relying on the const being initialised by
  // the time the other actually runs.
  const scheduleReconnectRef = useRef<() => void>(() => undefined);

  const connect = useCallback(() => {
    if (isUnmountedRef.current || socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    onStatusChangeRef.current?.(
      attemptsRef.current === 0 ? AllySocketStatus.CONNECTING : AllySocketStatus.RECONNECTING,
    );

    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 10000,
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const downtimeMs = disconnectedAtRef.current ? Date.now() - disconnectedAtRef.current : 0;
      attemptsRef.current = 0;
      disconnectedAtRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      onStatusChangeRef.current?.(AllySocketStatus.CONNECTED);
      onConnectedRef.current?.();
      if (downtimeMs > 0) onReconnectedRef.current?.(Math.round(downtimeMs / 1000));
    });

    socket.on("connect_error", (error: Error) => {
      logger.error(`[${label}] connect_error: ${error.message}`);
      onStatusChangeRef.current?.(AllySocketStatus.ERROR);
      scheduleReconnectRef.current();
    });

    socket.on("disconnect", (reason: string) => {
      logger.info(`[${label}] disconnected: ${reason}`);
      if (disconnectedAtRef.current === null) disconnectedAtRef.current = Date.now();
      onStatusChangeRef.current?.(AllySocketStatus.DISCONNECTED);
      // A deliberate client-side close must not trigger a reconnect storm.
      if (reason !== "io client disconnect") scheduleReconnectRef.current();
    });

    // Registered from the ref, so the set can change between reconnects without re-subscribing.
    for (const event of Object.keys(handlersRef.current)) {
      socket.on(event, (payload: unknown) => handlersRef.current[event]?.(payload));
    }
  }, [socketUrl, label]);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (attemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      logger.error(`[${label}] giving up after ${MAX_RECONNECTION_ATTEMPTS} attempts`);
      onStatusChangeRef.current?.(AllySocketStatus.ERROR);
      return;
    }
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    attemptsRef.current += 1;
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(1.5, attemptsRef.current),
      MAX_RECONNECT_DELAY_MS,
    );
    onStatusChangeRef.current?.(AllySocketStatus.RECONNECTING);
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [connect, label]);

  scheduleReconnectRef.current = scheduleReconnect;

  /** Fire-and-forget emit. Silently no-ops while disconnected — callers re-join on connect. */
  const emit = useCallback((event: string, payload?: unknown) => {
    socketRef.current?.emit(event, payload);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    if (!enabled) return undefined;

    connect();
    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect, enabled]);

  return { emit };
};
