import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import { setScenarioReportsSocketStatus, SocketConnectionStatus } from "@reducer";
import { store } from "@store";
import {
  ConnectedEventPayload,
  JoinScenarioReportsRoomPayload,
  JoinUserReportsRoomPayload,
  ReportsUpdatedPayload,
  SocketEvent,
} from "@types";
import { logger } from "@utils";

const logMessages = {
  connected: "Connected to scenario reports socket",
  connectionError: "Connection error to scenario reports socket",
  error: "Error in scenario reports socket",
  disconnected: "Disconnected from scenario reports socket",
  reportsUpdated: "Reports updated in scenario reports socket",
  socketConnectionError: "Socket connection error",
  socketNotConnected: "Socket not connected",
  tryingToReconnect: "Trying to reconnect to scenario reports socket",
};

interface UseScenarioReportsSocketProps {
  onConnected?: (data: ConnectedEventPayload) => void;
  onError?: (error: Error) => void;
  onReportsUpdated?: (data: ReportsUpdatedPayload) => void;
}

export const useScenarioReportsSocket = ({
  onConnected,
  onError,
  onReportsUpdated,
}: UseScenarioReportsSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const nameSpace = SocketConnectionPaths.SCENARIO_REPORTS;
  const socketUrl = `${baseUrl}/${nameSpace}`;

  const getReconnectDelay = useCallback(() => {
    // Exponential backoff: start at 2s, max at 30s
    const baseDelay = 2000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, connectionAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    connectionAttemptsRef.current++;
    const delay = getReconnectDelay();

    logger.info(
      `[Scenario Reports Socket] ${logMessages.tryingToReconnect} (attempt ${connectionAttemptsRef.current}, retry in ${Math.round(delay / 1000)}s)`,
    );

    store.dispatch(
      setScenarioReportsSocketStatus({
        status: SocketConnectionStatus.RECONNECTING,
        connectionAttempts: connectionAttemptsRef.current,
      }),
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      connectSocket();
    }, delay);
  }, [getReconnectDelay, socketUrl]);

  const connectSocket = useCallback(() => {
    if (isUnmountedRef.current) return;

    // If already connected, don't create a new connection
    if (socketRef.current?.connected) {
      logger.info(`[Scenario Reports Socket] Already connected`);
      return;
    }

    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const status =
      connectionAttemptsRef.current === 0
        ? SocketConnectionStatus.CONNECTING
        : SocketConnectionStatus.RECONNECTING;

    store.dispatch(
      setScenarioReportsSocketStatus({
        status,
        connectionAttempts: connectionAttemptsRef.current,
      }),
    );

    logger.info(`[Scenario Reports Socket] Creating new socket connection`);

    try {
      // Get fresh token from localStorage (handles token refresh)
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);

      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
        auth: {
          token,
        },
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
        forceNew: true,
      });

      // Connected event
      socketRef.current.on(SocketEvent.CONNECTED, (data: ConnectedEventPayload) => {
        logger.info(`[Scenario Reports Socket] ${logMessages.connected}: ${JSON.stringify(data)}`);

        // Reset connection attempts on successful connection
        connectionAttemptsRef.current = 0;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        store.dispatch(
          setScenarioReportsSocketStatus({
            status: SocketConnectionStatus.CONNECTED,
            connectionAttempts: 0,
          }),
        );

        onConnected?.(data);
      });

      // Connection error event
      socketRef.current.on("connect_error", (error: Error) => {
        logger.error(`[Scenario Reports Socket] ${logMessages.connectionError}: ${error.message}`);

        store.dispatch(
          setScenarioReportsSocketStatus({
            status: SocketConnectionStatus.ERROR,
            connectionAttempts: connectionAttemptsRef.current,
            lastError: error.message,
          }),
        );

        onError?.(error);
        scheduleReconnect();
      });

      // General error event
      socketRef.current.on("error", (error: Error) => {
        logger.error(`[Scenario Reports Socket] ${logMessages.error}: ${error.message}`);

        store.dispatch(
          setScenarioReportsSocketStatus({
            status: SocketConnectionStatus.ERROR,
            connectionAttempts: connectionAttemptsRef.current,
            lastError: error.message,
          }),
        );

        onError?.(error);
      });

      // Disconnection event
      socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
        logger.info(`[Scenario Reports Socket] ${logMessages.disconnected}: ${reason}`);

        store.dispatch(
          setScenarioReportsSocketStatus({
            status: SocketConnectionStatus.DISCONNECTED,
            connectionAttempts: connectionAttemptsRef.current,
          }),
        );

        // Auto-reconnect on disconnect (will fetch fresh token)
        if (!isUnmountedRef.current) {
          scheduleReconnect();
        }
      });

      // Reports updated event
      socketRef.current.on(SocketEvent.REPORTS_UPDATED, (data: ReportsUpdatedPayload) => {
        logger.info(`[Scenario Reports Socket] ${logMessages.reportsUpdated}`);
        onReportsUpdated?.(data);
      });
    } catch (error) {
      logger.error(`[Scenario Reports Socket] ${logMessages.socketConnectionError}: ${error}`);

      store.dispatch(
        setScenarioReportsSocketStatus({
          status: SocketConnectionStatus.ERROR,
          connectionAttempts: connectionAttemptsRef.current,
          lastError: "Socket connection error",
        }),
      );

      scheduleReconnect();
    }
  }, [socketUrl, onConnected, onError, onReportsUpdated, scheduleReconnect]);

  const joinUserReportsRoom = useCallback((lookbackMinutes?: number) => {
    if (!socketRef.current?.connected) {
      logger.warn(`[Scenario Reports Socket] ${logMessages.socketNotConnected}`);
      return;
    }

    const payload: JoinUserReportsRoomPayload = {};

    if (lookbackMinutes !== undefined) {
      payload.lookbackMinutes = lookbackMinutes;
    }

    logger.info(
      `[Scenario Reports Socket] Joining user reports room with lookback: ${lookbackMinutes}`,
    );
    socketRef.current.emit(SocketEvent.JOIN_USER_REPORTS_ROOM, payload);
  }, []);

  const joinScenarioReportRoom = useCallback((reportId: string) => {
    if (!socketRef.current?.connected) {
      logger.warn(`[Scenario Reports Socket] ${logMessages.socketNotConnected}`);
      return;
    }

    logger.info(`[Scenario Reports Socket] Joining scenario report room: ${reportId}`);

    const payload: JoinScenarioReportsRoomPayload = {
      reportId,
    };
    socketRef.current.emit(SocketEvent.JOIN_SCENARIO_REPORT_ROOM, payload);
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;

    logger.info(`[Scenario Reports Socket] Initializing connection on mount`);
    connectSocket();

    return () => {
      logger.info(`[Scenario Reports Socket] Cleaning up on unmount`);
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

      store.dispatch(
        setScenarioReportsSocketStatus({
          status: SocketConnectionStatus.DISCONNECTED,
          connectionAttempts: 0,
        }),
      );
    };
  }, [connectSocket]);

  return {
    joinUserReportsRoom,
    joinScenarioReportRoom,
    isConnected,
  };
};
