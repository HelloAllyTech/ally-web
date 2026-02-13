import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import {
  ConnectedEventPayload,
  JoinScenarioReportsRoomPayload,
  JoinUserReportsRoomPayload,
  ReportsUpdatedPayload,
  SocketEvent,
} from "@types";

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
      logger.info(`Connected to scenario reports socket: ${data}`);
      onConnected?.(data);
    });

    //Connection Errors
    socketRef.current.on("connect_error", (error: Error) => {
      logger.error(`Connection error to scenario reports socket: ${error}`);
      onError?.(error);
    });

    //General Errors
    socketRef.current.on("error", (error: Error) => {
      logger.error(`Error in scenario reports socket: ${error}`);
      onError?.(error);
    });

    //Disconnection event
    socketRef.current.on(SocketEvent.DISCONNECT, (reason: string) => {
      logger.info(`Disconnected from scenario reports socket: ${reason}`);
    });

    //Reports updated event
    socketRef.current.on(SocketEvent.REPORTS_UPDATED, (data: ReportsUpdatedPayload) => {
      logger.info(`Reports updated in scenario reports socket: ${data}`);
      onReportsUpdated?.(data);
    });
  }, [onReportsUpdated, onError, onConnected]);

  const connect = useCallback(() => {
    if (connectionAttemptsRef.current >= MAX_ATTEMPTS) {
      logger.info("Max connection attempts reached");
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
      logger.info(`Socket connection error:, ${error}`);
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
      logger.info("Socket not connected");
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
      logger.info("Socket not connected");
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
