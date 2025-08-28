import { useState, useCallback, useEffect } from "react";

import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useLazyGetCounsellorChatQuery } from "@api";
import { SocketConnectionTypes, ROUTES, CallType } from "@constants";
import { RootState } from "@store";
import { SocketEvent, UserRole, Session, UseSessionManagerOptions } from "@types";
import { isProviderCloudTelephony } from "@utils";

import { useSocket } from "./useSocket";

export const useSessionManager = (options: UseSessionManagerOptions = {}) => {
  const { autoConnect = true, connectionType = SocketConnectionTypes.CLOUD_TELEPHONY_CHAT } =
    options;
  const { availableChatTypes, user } = useSelector((state: RootState) => state.user);

  const location = useLocation();
  const [getCounsellorChat] = useLazyGetCounsellorChatQuery();

  const enableConnection = autoConnect && !location.pathname.includes(ROUTES.AUDIO_CALL);

  const [activeSession, setActiveSession] = useState<Session | null>(null);

  /**
   * Sets the active session with provided data and type.
   * @param {any} sessionData - Session data object
   * @param {string} type - Type of session (e.g., 'cloud_telephony_chat')
   */
  const setSession = useCallback((sessionData: any, type: string) => {
    setActiveSession({ ...sessionData, type });
  }, []);

  /**
   * Clears the current active session.
   */
  const clearSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  /**
   * Creates event callbacks for different socket events.
   * - SESSION_CREATED: Logs session creation
   * - USER_JOINED: Handles user joining and sets session
   * - AUDIO_MESSAGE: Handles audio messages and updates session
   * - CHAT_ENDED: Clears session when chat ends
   * - USER_DISCONNECTED: Logs user disconnection
   * @param {string} type - Type of connection for event handling
   * @returns {Object} Object containing event callback functions
   */
  const getEventCallback = useCallback(
    (type: string) => {
      return {
        [SocketEvent.SESSION_CREATED]: () => {
          logger.info(`Session Created: ${type}`);
        },
        [SocketEvent.USER_JOINED]: (data: any) => {
          logger.info(`User Joined: ${type}`);
          const sessionData = data?.payload || {};
          setSession(sessionData, type);
        },
        [SocketEvent.AUDIO_MESSAGE]: (data: any) => {
          logger.info(`Audio Message: ${type}`);
          const sessionData = data?.payload || {};
          setSession(sessionData, type);
        },
        [SocketEvent.CHAT_ENDED]: () => {
          logger.info(`Session Ended: ${type}`);
          clearSession();
        },
        [SocketEvent.USER_DISCONNECTED]: () => {
          logger.info(`User Disconnected: ${type}`);
        },
      };
    },
    [setSession, clearSession],
  );

  const { connect, disconnect } = useSocket({
    eventCallbacks: getEventCallback(connectionType),
    connectionType,
  });

  // Fetch active chat sessions
  useEffect(() => {
    /**
     * Fetches active chat sessions for counsellors.
     * - Checks if user is a counsellor
     * - Fetches active chat data from API
     * - Sets session with appropriate provider type
     * - Only runs when connection is enabled
     */
    const fetchActiveChat = async () => {
      if (user?.role === UserRole.COUNSELLOR) {
        const response = await getCounsellorChat();
        if (response?.data?.chatId) {
          const audioProvider = response?.data?.provider;
          const type = isProviderCloudTelephony(audioProvider)
            ? SocketConnectionTypes.CLOUD_TELEPHONY_CHAT
            : audioProvider;
          setSession(response.data, type);
        }
      }
    };

    if (enableConnection) {
      fetchActiveChat();
    }
  }, [user?.role, enableConnection, getCounsellorChat, setSession]);

  // Handle socket connection
  useEffect(() => {
    if (enableConnection) {
      connect();
    }

    return () => {
      clearSession();
      disconnect();
    };
  }, [enableConnection, connect, disconnect, clearSession]);

  return {
    activeSession,
    setSession,
    clearSession,
    connect,
    disconnect,
    getEventCallback,
  };
};
