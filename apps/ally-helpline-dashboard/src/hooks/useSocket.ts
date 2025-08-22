import { useEffect, useRef, useCallback } from "react";

import { Socket, io } from "socket.io-client";

import { logger } from "@ally-ui-mono/ui-shared";
import { LOCAL_STORAGE_KEYS } from "@constants";
import { SocketEvent, UseSocketOptions } from "@types";
import { getPathForConnectionType } from "@utils";

export const useSocket = ({ eventCallbacks, connectionType }: UseSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const MAX_ATTEMPTS = 5;
  const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/${getPathForConnectionType(
    connectionType,
  )}`;

  /**
   * Establishes a WebSocket connection with automatic retry logic.
   * - Creates a new socket connection with authentication
   * - Sets up reconnection parameters
   * - Handles connection errors with retry logic
   * - Sets up default event listeners
   * - Limits connection attempts to prevent infinite loops
   * @param {number} [chatId] - Optional chat ID for connection context
   */
  const connect = useCallback((chatId?: number) => {
    if (connectionAttemptsRef.current >= MAX_ATTEMPTS) {
      logger.info("Max connection attempts reached");
      return;
    }
    try {
      socketRef.current = io(baseUrl, {
        path: "",
        transports: ["websocket", "polling"] as const,
        auth: {
          token: localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN),
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

  /**
   * Sets up default event listeners for socket connection events.
   * - connect: Resets connection attempts counter
   * - connect_error: Logs connection errors
   * - disconnect: Logs disconnection events
   * - error: Logs general socket errors
   * - Custom event callbacks provided in options
   */
  const setupDefaultListeners = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.on("connect", () => {
      connectionAttemptsRef.current = 0;
    });

    socketRef.current.on("connect_error", error => {
      logger.info(`Socket connection error:, ${error}`);
    });

    socketRef.current.on(SocketEvent.DISCONNECT, reason => {
      logger.info(`Socket disconnected:, ${reason}`);
    });

    socketRef.current.on("error", error => {
      logger.info(`Socket error:, ${error}`);
    });

    Object.entries(eventCallbacks).forEach(([key, callback]) => {
      socketRef.current.on(key, callback);
    });
  }, [eventCallbacks]);

  /**
   * Disconnects from the WebSocket and cleans up resources.
   * - Disconnects the socket connection
   * - Clears the socket reference
   * - Prevents memory leaks
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  /**
   * Sends a message through the WebSocket connection.
   * @param {any} message - Message object to send
   */
  const sendMessage = useCallback((message: any) => {
    if (!socketRef.current) {
      logger.info("Socket not connected");
      return;
    }
    socketRef.current.emit(SocketEvent.SEND_MESSAGE, message);
  }, []);

  /**
   * Emits a custom socket event with optional data.
   * @param {SocketEvent} socketEvent - The socket event to emit
   * @param {any} message - Data to send with the event
   */
  const emitSocketEvent = useCallback((socketEvent: SocketEvent, message: any) => {
    if (!socketRef.current) {
      logger.info("Socket not connected");
      return;
    }
    socketRef.current.emit(socketEvent, message);
  }, []);

  /**
   * Checks if the WebSocket is currently connected.
   * @returns {boolean} True if connected, false otherwise
   */
  const isConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  /**
   * Adds a listener for a specific socket event.
   * @param {SocketEvent} socketEvent - The socket event to listen for
   * @param {Function} callback - Function to call when event is received
   */
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

  /**
   * Removes a listener for a specific socket event.
   * @param {SocketEvent} socketEvent - The socket event to remove listener for
   */
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
  }, []);

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
