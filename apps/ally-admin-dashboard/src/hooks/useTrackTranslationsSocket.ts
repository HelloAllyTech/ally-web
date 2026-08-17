import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import { SocketEvent, TrackTranslationProgress } from "@types";
import { logger } from "@utils";

const logPrefix = "[Track Translations Socket]";
const MAX_RECONNECTION_ATTEMPTS = 10;

interface UseTrackTranslationsSocketProps {
  onProgress?: (payload: TrackTranslationProgress) => void;
}

/**
 * Live progress for course translation runs. Translating a course is tens of
 * model calls per language, so the trainer watches it rather than polling.
 *
 * Mirrors `useScenarioTranslationsSocket` — same reconnect shape, different
 * namespace and event names.
 */
export const useTrackTranslationsSocket = ({ onProgress }: UseTrackTranslationsSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Held in a ref so a new callback identity from the parent's render does not
  // tear down and re-establish the socket mid-run.
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const socketUrl = `${baseUrl}/${SocketConnectionPaths.TRACK_TRANSLATIONS}`;

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    return Math.min(baseDelay * Math.pow(1.5, connectionAttemptsRef.current), maxDelay);
  }, []);

  const scheduleReconnectRef = useRef<() => void>(() => {});

  const connectSocket = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);

      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: false,
        timeout: 10000,
        forceNew: true,
      });

      socketRef.current.on(SocketEvent.CONNECTED, () => {
        logger.info(`${logPrefix} connected`);
        connectionAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        socketRef.current?.emit(SocketEvent.JOIN_USER_TRACK_TRANSLATIONS_ROOM);
      });

      socketRef.current.on(
        SocketEvent.TRACK_TRANSLATION_PROGRESS,
        (payload: TrackTranslationProgress) => {
          onProgressRef.current?.(payload);
        },
      );

      socketRef.current.on("connect_error", (error: Error) => {
        logger.error(`${logPrefix} connect_error: ${error.message}`);
        scheduleReconnectRef.current();
      });

      socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
        logger.info(`${logPrefix} disconnected: ${reason}`);
        if (!isUnmountedRef.current) scheduleReconnectRef.current();
      });
    } catch (error) {
      logger.error(`${logPrefix} connection error: ${error}`);
      scheduleReconnectRef.current();
    }
  }, [socketUrl]);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (connectionAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      logger.error(`${logPrefix} max reconnection attempts reached`);
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectionAttemptsRef.current++;
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      connectSocket();
    }, getReconnectDelay());
  }, [getReconnectDelay, connectSocket]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectSocket();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);
};
