import { useEffect, useRef, useCallback, useState } from "react";
import { Socket, io } from "socket.io-client";
import { SocketEvent, SocketMessage } from "@/types/message";

interface UseSocketOptions {
  userId: string;
}

export const useSocket = ({ userId }: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const maxAttempts = 5;
  // const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = "https://api.lifeline.kvsandbox.link";
  // const appVersionPath = import.meta.env.VITE_APP_VERSION_PATH;

  const connect = useCallback(() => {
    if (connectionAttemptsRef.current >= maxAttempts) {
      console.error("Max connection attempts reached");
      return;
    }

    try {
      socketRef.current = io(baseUrl, {
        path: "/ws",
        transports: ["websocket", "polling"] as const,
        auth: {
          user: {
            user_id: userId,
          },
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,
        autoConnect: false,
      });

      console.log("Attempting socket connection...");

      socketRef.current.connect();

      setupDefaultListeners();
      connectionAttemptsRef.current++;
    } catch (error) {
      console.error("Socket connection error:", error);
      connectionAttemptsRef.current++;
      setTimeout(() => connect(), 2000);
    }
  }, [userId]);

  const setupDefaultListeners = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.on("connect", () => {
      console.log("Socket connected successfully");
      connectionAttemptsRef.current = 0;
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current) {
      console.error("Socket not connected");
      return;
    }
    console.log("Sending message:", message);
    socketRef.current.emit(SocketEvent.SEND_MESSAGE, message);
  }, []);

  const onMessageReceived = useCallback(
    (callback: (message: SocketMessage) => void) => {
      if (!socketRef.current) return;
      socketRef.current.on(SocketEvent.MESSAGE_RECEIVED, callback);
    },
    []
  );

  const onNudgeReceived = useCallback(
    (callback: (message: SocketMessage) => void) => {
      if (!socketRef.current) return;      
      socketRef.current.on(SocketEvent.NUDGE, callback);
    },
    []
  );

  const onChatAccepted = useCallback(
    (callback: (message: SocketMessage) => void) => {
      if (!socketRef.current) return;
      socketRef.current.on(SocketEvent.CHAT_ACCEPTED, callback);
    },
    []
  );

  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
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
    onMessageReceived,
    onNudgeReceived,
    onChatAccepted,
    isConnected,
  };
};
