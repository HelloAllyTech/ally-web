import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import { SocketEvent, TranslationProgressPayload } from "@types";
import { logger } from "@utils";

const logPrefix = "[Scenario Translations Socket]";
const MAX_RECONNECTION_ATTEMPTS = 10;

interface UseScenarioTranslationsSocketProps {
  onTranslationProgress?: (payload: TranslationProgressPayload) => void;
}

export const useScenarioTranslationsSocket = ({
  onTranslationProgress,
}: UseScenarioTranslationsSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const socketUrl = `${baseUrl}/${SocketConnectionPaths.SCENARIO_TRANSLATIONS}`;

  const getReconnectDelay = useCallback(() => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    return Math.min(baseDelay * Math.pow(1.5, connectionAttemptsRef.current), maxDelay);
  }, []);

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
        socketRef.current?.emit(SocketEvent.JOIN_USER_TRANSLATIONS_ROOM);
      });

      socketRef.current.on(
        SocketEvent.TRANSLATION_PROGRESS,
        (payload: TranslationProgressPayload) => {
          onTranslationProgress?.(payload);
        },
      );

      socketRef.current.on("connect_error", (error: Error) => {
        logger.error(`${logPrefix} connect_error: ${error.message}`);
        scheduleReconnect();
      });

      socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
        logger.info(`${logPrefix} disconnected: ${reason}`);
        if (!isUnmountedRef.current) {
          scheduleReconnect();
        }
      });
    } catch (error) {
      logger.error(`${logPrefix} connection error: ${error}`);
      scheduleReconnect();
    }
  }, [socketUrl, onTranslationProgress]);

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
    const delay = getReconnectDelay();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      connectSocket();
    }, delay);
  }, [getReconnectDelay, connectSocket]);

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
