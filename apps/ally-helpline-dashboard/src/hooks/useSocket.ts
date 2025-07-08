import { useEffect, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";

import { SocketEvent } from "@/types/message";
import { SocketConnectionTypes } from "@/constants/socket";
import { getPathForConnectionType } from "@/utils/socket";
import { logger } from "@ally-ui-mono/ui-shared";

interface UseSocketOptions {
  connectionType: SocketConnectionTypes;
  eventCallbacks?: Partial<Record<SocketEvent, (params?: any) => void>>;
}

export const useSocket = ({ eventCallbacks, connectionType }: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const maxAttempts = 5;
  const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/${getPathForConnectionType(
    connectionType,
  )}`;

  const connect = useCallback((chatId?: number) => {
    if (connectionAttemptsRef.current >= maxAttempts) {
      logger.info("Max connection attempts reached");
      return;
    }
    try {
      socketRef.current = io(baseUrl, {
        path: "",
        transports: ["websocket", "polling"] as const,
        auth: {
          token: localStorage.getItem("accessToken"),
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

      setupDefaultListeners();
      connectionAttemptsRef.current++;
    } catch (error) {
      logger.info(`Socket connection error:, ${error}`);
      connectionAttemptsRef.current++;
      setTimeout(() => connect(chatId), 2000);
    }
  }, []);

  const setupDefaultListeners = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.on("connect", () => {
      connectionAttemptsRef.current = 0;
    });

    socketRef.current.on("connect_error", error => {
      logger.info(`Socket connection error:, ${error}`);
    });

    socketRef.current.on("disconnect", reason => {
      logger.info(`Socket disconnected:, ${reason}`);
    });

    socketRef.current.on("error", error => {
      logger.info(`Socket error:, ${error}`);
    });

    Object.entries(eventCallbacks).forEach(([key, callback]) => {
      socketRef.current.on(key, callback);
    });
  }, [eventCallbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current) {
      logger.info("Socket not connected");
      return;
    }
    socketRef.current.emit(SocketEvent.SEND_MESSAGE, message);
  }, []);

  const emitSocketEvent = useCallback((socketEvent: SocketEvent, message: any) => {
    if (!socketRef.current) {
      logger.info("Socket not connected");
      return;
    }
    socketRef.current.emit(socketEvent, message);
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  const setListenerForEvent = useCallback(
    (socketEvent: SocketEvent, callback: (data: any) => void) => {
      if (!socketRef.current) {
        logger.info("Socket not connected");
        return;
      }
      socketRef.current.on(socketEvent, callback);
    },
    [],
  );

  const removeIfListenerPresent = useCallback((socketEvent: SocketEvent) => {
    if (!socketRef.current) {
      logger.info("Socket not connected");
      return;
    }
    socketRef.current.off(socketEvent);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected,
    emitSocketEvent,
    setListenerForEvent,
    removeIfListenerPresent,
  };
};
