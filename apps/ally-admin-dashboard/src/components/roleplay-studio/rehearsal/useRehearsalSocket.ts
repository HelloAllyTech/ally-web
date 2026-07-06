import { useCallback, useEffect, useRef, useState } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import {
  RehearsalCompletedPayload,
  RehearsalRunStatusPayload,
  RoleplayRehearsalSocketEvent,
} from "@src/types/roleplayStudio";
import { SocketEvent } from "@types";
import { logger } from "@utils";

const MAX_RECONNECTION_ATTEMPTS = 10;

const logPrefix = "[Roleplay Rehearsals Socket]";

export type RehearsalSocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface UseRehearsalSocketProps {
  onConnected?: () => void;
  onError?: (error: Error) => void;
  onRunStatus?: (data: RehearsalRunStatusPayload) => void;
  onRehearsalCompleted?: (data: RehearsalCompletedPayload) => void;
}

/**
 * Live rehearsal progress over socket.io namespace `roleplay/rehearsals`
 * (events `run_status` / `rehearsal_completed`). A clone of the
 * useScenarioReportsSocket wiring — bearer auth from localStorage, manual
 * exponential-backoff reconnection — with connection status kept local
 * (returned) instead of in the shared socketStatus slice.
 */
export const useRehearsalSocket = ({
  onConnected,
  onError,
  onRunStatus,
  onRehearsalCompleted,
}: UseRehearsalSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const [status, setStatus] = useState<RehearsalSocketStatus>("disconnected");

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const socketUrl = `${baseUrl}/${SocketConnectionPaths.ROLEPLAY_REHEARSALS}`;

  const getReconnectDelay = useCallback(() => {
    // Exponential backoff: start at 2s, max at 30s
    const baseDelay = 2000;
    const maxDelay = 30000;
    return Math.min(baseDelay * Math.pow(1.5, connectionAttemptsRef.current), maxDelay);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;

    if (connectionAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      logger.error(`${logPrefix} Max reconnection attempts reached, stopping reconnection`);
      setStatus("error");
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectionAttemptsRef.current++;
    const delay = getReconnectDelay();
    logger.info(
      `${logPrefix} Trying to reconnect (attempt ${connectionAttemptsRef.current}/${MAX_RECONNECTION_ATTEMPTS}, retry in ${Math.round(delay / 1000)}s)`,
    );
    setStatus("reconnecting");

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      connectSocket();
    }, delay);
  }, [getReconnectDelay]);

  const connectSocket = useCallback(() => {
    if (isUnmountedRef.current) return;

    if (socketRef.current?.connected) {
      logger.info(`${logPrefix} Already connected`);
      return;
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus(connectionAttemptsRef.current === 0 ? "connecting" : "reconnecting");
    logger.info(`${logPrefix} Creating new socket connection`);

    try {
      // Fresh token from localStorage (handles token refresh).
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);

      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: false, // reconnection handled manually above
        timeout: 10000,
        forceNew: true,
      });

      socketRef.current.on(SocketEvent.CONNECTED, () => {
        logger.info(`${logPrefix} Connected`);
        connectionAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        setStatus("connected");
        onConnected?.();
      });

      socketRef.current.on("connect_error", (error: Error) => {
        logger.error(`${logPrefix} Connection error: ${error.message}`);
        setStatus("error");
        onError?.(error);
        scheduleReconnect();
      });

      socketRef.current.on("error", (error: Error) => {
        logger.error(`${logPrefix} Error: ${error.message}`);
        setStatus("error");
        onError?.(error);
      });

      socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
        logger.info(`${logPrefix} Disconnected: ${reason}`);
        setStatus("disconnected");
        if (!isUnmountedRef.current) scheduleReconnect();
      });

      socketRef.current.on(
        RoleplayRehearsalSocketEvent.RUN_STATUS,
        (data: RehearsalRunStatusPayload) => {
          onRunStatus?.(data);
        },
      );

      socketRef.current.on(
        RoleplayRehearsalSocketEvent.REHEARSAL_COMPLETED,
        (data: RehearsalCompletedPayload) => {
          logger.info(`${logPrefix} Rehearsal completed: ${data.rehearsalId}`);
          onRehearsalCompleted?.(data);
        },
      );
    } catch (error) {
      logger.error(`${logPrefix} Socket connection error: ${error}`);
      setStatus("error");
      scheduleReconnect();
    }
  }, [socketUrl, onConnected, onError, onRunStatus, onRehearsalCompleted, scheduleReconnect]);

  const isConnected = useCallback(() => socketRef.current?.connected || false, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    logger.info(`${logPrefix} Initializing connection on mount`);
    connectSocket();

    return () => {
      logger.info(`${logPrefix} Cleaning up on unmount`);
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
      setStatus("disconnected");
    };
  }, [connectSocket]);

  return { status, isConnected };
};
