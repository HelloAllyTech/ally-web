import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { useLazyGetCounsellorChatQuery } from "@/api/audioCall";
import { SocketConnectionTypes } from "@/constants/socket";
import { ROUTES } from "@/constants/routes";
import { CallProvider, CallType } from "@/constants/call";
import { logger } from "@ally-ui-mono/ui-shared/logger";
import { RootState } from "@/store/store";
import { SocketEvent } from "@/types/message";
import { UserRole } from "@/types/user";

import { useSocket } from "./useSocket";

interface Session {
  type: string;
  [key: string]: any;
}

interface UseSessionManagerOptions {
  autoConnect?: boolean;
  connectionType?: SocketConnectionTypes;
}

export const useSessionManager = (options: UseSessionManagerOptions = {}) => {
  const { autoConnect = true, connectionType = SocketConnectionTypes.CLOUD_TELEPHONY_CHAT } =
    options;
  const { availableChatTypes, user } = useSelector((state: RootState) => state.user);
  const location = useLocation();

  const isCloudTelephonyMode = availableChatTypes?.includes(CallType.EXOTEL_CONFERENCE_CHAT);
  const enableConnection =
    autoConnect && !location.pathname.includes(ROUTES.AUDIO_CALL) && isCloudTelephonyMode;

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [getCounsellorChat] = useLazyGetCounsellorChatQuery();

  const setSession = useCallback((sessionData: any, type: string) => {
    setActiveSession({ ...sessionData, type });
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
  }, []);

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
    const fetchActiveChat = async () => {
      if (user?.role === UserRole.COUNSELLOR) {
        const response = await getCounsellorChat();
        if (response?.data?.chatId) {
          const audioProvider = response?.data?.provider;
          const type =
            audioProvider === CallProvider.EXOTEL_CONFERENCE_CALL
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
