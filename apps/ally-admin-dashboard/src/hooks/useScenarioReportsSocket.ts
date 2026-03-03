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

const logMeessages = {
  connected: "Connected to scenario reports socket",
  connectionError: "Connection error to scenario reports socket",
  error: "Error in scenario reports socket",
  disconnected: "Disconnected from scenario reports socket",
  reportsUpdated: "Reports updated in scenario reports socket",
  socketConnectionError: "Socket connection error",
  socketNotConnected: "Socket not connected",
  tryingToReconnect: "Trying to reconnect to scenario reports socket",
};

export const useScenarioReportsSocket = ({ onConnected, onError, onReportsUpdated }) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    connectionAttemptsRef.current++;
    const delay = getReconnectDelay();

    logger.info(
      `[Scenario Reports Socket] ${logMeessages.tryingToReconnect} (attempt ${connectionAttemptsRef.current}, retry in ${Math.round(delay / 1000)}s)`,
    );

    store.dispatch(
      setScenarioReportsSocketStatus({
        status: SocketConnectionStatus.RECONNECTING,
        connectionAttempts: connectionAttemptsRef.current,
      }),
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      isConnectingRef.current = false;
      connect();
    }, delay);
  }, [getReconnectDelay]);

  const setUpListeners = useCallback(() => {
    if (!socketRef.current) return;

    //Connected event
    socketRef.current.on(SocketEvent.CONNECTED, (data: ConnectedEventPayload) => {
      logger.info(`[Scenario Reports Socket] ${logMeessages.connected}: ${JSON.stringify(data)}`);
      // Reset connection attempts on successful connection
      connectionAttemptsRef.current = 0;
      isConnectingRef.current = false;
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

    //Connection Errors
    socketRef.current.on("connect_error", (error: Error) => {
      logger.error(`[Scenario Reports Socket] ${logMeessages.connectionError}: ${error}`);
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

    //General Errors
    socketRef.current.on("error", (error: Error) => {
      logger.error(`${logMeessages.error}: ${error}`);
      store.dispatch(
        setScenarioReportsSocketStatus({
          status: SocketConnectionStatus.ERROR,
          connectionAttempts: connectionAttemptsRef.current,
          lastError: error.message,
        }),
      );
      onError?.(error);
    });

    //Disconnection event
    socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
      logger.info(`[Scenario Reports Socket] ${logMeessages.disconnected}: ${reason}`);
      store.dispatch(
        setScenarioReportsSocketStatus({
          status: SocketConnectionStatus.DISCONNECTED,
          connectionAttempts: connectionAttemptsRef.current,
        }),
      );
      scheduleReconnect();
    });

    //Reports updated event
    socketRef.current.on(SocketEvent.REPORTS_UPDATED, (data: ReportsUpdatedPayload) => {
      logger.info(`[Scenario Reports Socket] ${logMeessages.reportsUpdated}`);
      onReportsUpdated?.(data);
    });
  }, [onReportsUpdated, onError, onConnected, scheduleReconnect]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || socketRef.current?.connected) {
      return;
    }

    isConnectingRef.current = true;

    try {
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

      socketRef.current = io(socketUrl, {
        path: "",
        transports: ["websocket", "polling"],
        auth: {
          token: localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN),
        },
        reconnection: false,
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
      });

      setUpListeners();
      socketRef.current.connect();
    } catch (error) {
      logger.error(`[Scenario Reports Socket] ${logMeessages.socketConnectionError}: ${error}`);
      isConnectingRef.current = false;
      store.dispatch(
        setScenarioReportsSocketStatus({
          status: SocketConnectionStatus.ERROR,
          connectionAttempts: connectionAttemptsRef.current,
          lastError: "Socket connection error",
        }),
      );
      scheduleReconnect();
    }
  }, [socketUrl, setUpListeners, scheduleReconnect]);

  const disconnect = useCallback(() => {
    logger.info(`[Scenario Reports Socket] ${logMeessages.disconnected}`);

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = false;
    connectionAttemptsRef.current = 0;

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
  }, []);

  const joinUserReportsRoom = useCallback((lookbackMinutes?: number) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.info(`[Scenario Reports Socket] ${logMeessages.socketNotConnected}`);
      return;
    }

    const payload: JoinUserReportsRoomPayload = {};

    if (lookbackMinutes !== undefined) {
      payload.lookbackMinutes = lookbackMinutes;
    }

    socketRef.current.emit(SocketEvent.JOIN_USER_REPORTS_ROOM, payload);
  }, []);

  const joinScenarioReportRoom = useCallback((reportId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.info(`[Scenario Reports Socket] ${logMeessages.socketNotConnected}`);
      return;
    }

    const payload: JoinScenarioReportsRoomPayload = {
      reportId,
    };
    socketRef.current.emit(SocketEvent.JOIN_SCENARIO_REPORT_ROOM, payload);
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    joinUserReportsRoom,
    joinScenarioReportRoom,
    isConnected,
  };
};
