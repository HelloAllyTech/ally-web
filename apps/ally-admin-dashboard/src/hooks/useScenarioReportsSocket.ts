import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { logger } from "@ally-ui-mono/ui-shared";
import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import {
  ConnectedEventPayload,
  JoinScenarioReportsRoomPayload,
  JoinUserReportsRoomPayload,
  ReportsUpdatedPayload,
  SocketEvent,
} from "@types";

const logMeessages = {
  connected: "Connected to scenario reports socket",
  connectionError: "Connection error to scenario reports socket",
  error: "Error in scenario reports socket",
  disconnected: "Disconnected from scenario reports socket",
  reportsUpdated: "Reports updated in scenario reports socket",
  maxConnectionAttemptsReached: "Max connection attempts reached",
  socketConnectionError: "Socket connection error",
  socketNotConnected: "Socket not connected",
};

export const useScenarioReportsSocket = ({ onConnected, onError, onReportsUpdated }) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const MAX_ATTEMPTS = 5;

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const nameSpace = SocketConnectionPaths.SCENARIO_REPORTS;
  const socketUrl = `${baseUrl}/${nameSpace}`;

  const setUpListeners = useCallback(() => {
    if (!socketRef.current) return;

    //Connected event
    socketRef.current.on(SocketEvent.CONNECTED, (data: ConnectedEventPayload) => {
      logger.info(`${logMeessages.connected}: ${data}`);
      // Reset connection attempts on successful connection
      connectionAttemptsRef.current = 0;
      onConnected?.(data);
    });

    //Connection Errors
    socketRef.current.on("connect_error", (error: Error) => {
      logger.error(`${logMeessages.connectionError}: ${error}`);
      onError?.(error);
    });

    //General Errors
    socketRef.current.on("error", (error: Error) => {
      logger.error(`${logMeessages.error}: ${error}`);
      onError?.(error);
    });

    //Disconnection event
    socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
      logger.info(`${logMeessages.disconnected}: ${reason}`);
    });

    //Reports updated event
    socketRef.current.on(SocketEvent.REPORTS_UPDATED, (data: ReportsUpdatedPayload) => {
      logger.info(`${logMeessages.reportsUpdated}: ${data}`);
      onReportsUpdated?.(data);
    });
  }, [onReportsUpdated, onError, onConnected]);

  const connect = useCallback(() => {
    // If already connected, don't reconnect
    if (socketRef.current?.connected) return;

    if (connectionAttemptsRef.current >= MAX_ATTEMPTS) {
      logger.info(logMeessages.maxConnectionAttemptsReached);
      return;
    }

    try {
      socketRef.current = io(socketUrl, {
        path: "",
        transports: ["websocket", "polling"] as const,
        auth: {
          token: localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN),
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
      });

      socketRef.current.connect();

      setUpListeners();
      connectionAttemptsRef.current++;
    } catch (error) {
      logger.info(`${logMeessages.socketConnectionError}: ${error}`);
      connectionAttemptsRef.current++;
      setTimeout(() => connect(), 2000);
    }
  }, [socketUrl, setUpListeners]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const joinUserReportsRoom = useCallback((lookBackMinutes?: number) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.info(logMeessages.socketNotConnected);
      return;
    }

    const payload: JoinUserReportsRoomPayload = {};

    if (lookBackMinutes !== undefined) {
      payload.lookBackMinutes = lookBackMinutes;
    }

    socketRef.current.emit(SocketEvent.JOIN_USER_REPORTS_ROOM, payload);
  }, []);

  const joinScenarioReportRoom = useCallback((reportId: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.info(logMeessages.socketNotConnected);
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
      socketRef.current?.disconnect();
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
