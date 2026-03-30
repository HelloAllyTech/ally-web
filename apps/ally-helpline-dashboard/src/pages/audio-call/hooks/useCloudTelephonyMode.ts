import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndCallMutation, useLazyGetCounsellorChatQuery, useGetNudgeStatusQuery } from "@api";
import { SocketConnectionTypes, ROUTES } from "@constants";
import { useSocket } from "@hooks";
import { RootState } from "@store";
import {
  Chat,
  ChatStatus,
  FeedbackResponse,
  MessageType,
  SocketEvent,
  Transcription,
  QueueStatus,
} from "@types";
import { isProviderCloudTelephony } from "@utils";

import { Nudge } from "../types";

interface UseCloudTelephonyModeReturn {
  activeChat: Chat | null;
  isFocusMode: boolean;
  setIsFocusMode: Dispatch<SetStateAction<boolean>>;
  speakerTranscriptions: Transcription[];
  myTranscriptions: Transcription[];
  nudges: Nudge[];
  stage: string | undefined;
  isUserJoined: boolean;
  isLoading: boolean;
  nudgeStatus: any;
  isFocusButtonDisabled: boolean;
  shouldShowCallInterface: boolean;
}

export const useCloudTelephonyMode = (): UseCloudTelephonyModeReturn => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user);

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] =
    useLazyGetCounsellorChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();
  const { data: nudgeStatus } = useGetNudgeStatusQuery();

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<Transcription[]>([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [stage, setStage] = useState<string>();
  const [isUserJoined, setIsUserJoined] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isLoading = isCounsellorChatLoading || isEndCallLoading;
  const userId = user?.userId;
  const activeChatId = activeChat?.chatId;
  const isFocusButtonDisabled = !isUserJoined;
  const shouldShowCallInterface =
    activeChat?.chatId && activeChat?.provider && isProviderCloudTelephony(activeChat?.provider);

  const endSessionAndNavigate = async (triggerApi: boolean = true, chatId: number) => {
    if (triggerApi) {
      const response = await endCall({ chatId });
      if (response?.data?.status !== QueueStatus.ENDED) {
        return;
      }
    }
    navigate(ROUTES.STRESS_BUSTER, { state: { chatId } });
  };

  const updateLastTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>,
  ) => {
    setCorrespondingTranscription(previousTranscriptions => {
      const updatedList = [...previousTranscriptions];
      if (previousTranscriptions.length > 0) {
        updatedList[previousTranscriptions.length - 1] = {
          ...previousTranscriptions[previousTranscriptions.length - 1],
          isFinal: true,
          isSentenceComplete: true,
        };
      }
      return updatedList;
    });
  };

  const processTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>,
    payload,
  ) => {
    setCorrespondingTranscription(previousTranscriptions => {
      const lastTranscription = previousTranscriptions[previousTranscriptions.length - 1];
      if (!lastTranscription) {
        return [
          ...previousTranscriptions,
          {
            id: payload.id,
            message: payload.content,
            senderId: payload.senderId,
            timestamp: payload.createdAt,
            isFinal: payload.isFinal,
            isSentenceComplete: payload.isSentenceComplete,
          },
        ];
      }
      if (!lastTranscription.isFinal) {
        // replace the last transcription with the new one
        const updatedTranscriptions = [...previousTranscriptions];
        updatedTranscriptions[previousTranscriptions.length - 1] = {
          ...lastTranscription,
          message: payload.content,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }

      if (!lastTranscription.isSentenceComplete && lastTranscription.isFinal && payload.isFinal) {
        // concat the last transcription with the new one
        const updatedTranscriptions = [...previousTranscriptions];
        updatedTranscriptions[previousTranscriptions.length - 1] = {
          ...lastTranscription,
          message: `${lastTranscription.message} ${payload.content}`,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }
      return [
        ...previousTranscriptions,
        {
          id: payload.id,
          message: payload.content,
          senderId: payload.senderId,
          timestamp: payload.createdAt,
          isFinal: payload.isFinal,
          isSentenceComplete: payload.isSentenceComplete,
        },
      ];
    });
  };

  const socketEventCallbacks = {
    [SocketEvent.STAGE]: data => {
      setStage(data?.payload?.content);
    },
    [SocketEvent.CHAT_ENDED]: data => {
      disconnect();
      endSessionAndNavigate(false, data?.payload?.chatId);
    },
    [SocketEvent.NUDGE]: data => {
      const nudge = data.payload;
      if (nudge.type === MessageType.NUDGE) {
        setNudges(previousNudges => [
          ...previousNudges,
          {
            content: nudge.content as string,
            id: nudge.id as number,
            feedback: nudge.feedback as FeedbackResponse,
          },
        ]);
      }
    },
    [SocketEvent.MESSAGE_RECEIVED]: data => {
      const message = data.payload;
      if (message.type === MessageType.TEXT) {
        if (message.senderId === userId) {
          processTranscription(setMyTranscriptions, message);
        } else {
          processTranscription(setSpeakerTranscriptions, message);
        }
      }
    },
    [SocketEvent.UTTERANCE_ENDED]: data => {
      if (data?.payload.senderId === userId) {
        updateLastTranscription(setMyTranscriptions);
      } else {
        updateLastTranscription(setSpeakerTranscriptions);
      }
    },
    [SocketEvent.USER_JOINED]: () => {
      setIsUserJoined(true);
    },
    [SocketEvent.USER_DISCONNECTED]: () => {
      // In exotel mode, set isUserJoined to false when user disconnects
      setIsUserJoined(false);
    },
  };

  const { connect, disconnect } = useSocket({
    eventCallbacks: socketEventCallbacks,
    connectionType: SocketConnectionTypes.CLOUD_TELEPHONY_CHAT,
  });

  // Process existing messages from activeChat
  useEffect(() => {
    if (activeChat?.messages && activeChat.messages.length > 0) {
      const existingTranscriptions = [...activeChat.messages]
        .reverse()
        .filter(transcription => transcription.type === MessageType.TEXT)
        .map(transcription => ({
          id: transcription.id,
          message: transcription.content,
          senderId: transcription.senderId,
          timestamp: transcription.createdAt,
          isFinal: true,
          isSentenceComplete: true,
        }));
      setMyTranscriptions(existingTranscriptions?.filter(payload => payload.senderId === userId));
      setSpeakerTranscriptions(
        existingTranscriptions?.filter(payload => payload.senderId !== userId),
      );

      const existingNudges = [...activeChat.messages]
        .reverse()
        .filter(message => message.type === MessageType.NUDGE)
        .map(nudge => ({
          content: nudge.content,
          id: nudge.id,
          feedback: nudge.feedback,
        }));
      setNudges(existingNudges);
    }
    if (
      activeChat?.status === ChatStatus.ACTIVE &&
      activeChat?.provider &&
      isProviderCloudTelephony(activeChat?.provider)
    ) {
      setIsUserJoined(true);
    }
  }, [activeChat, userId]);

  // Connect socket when activeChatId is available
  useEffect(() => {
    if (activeChatId) {
      connect();
    }
  }, [activeChatId, connect]);

  // Fetch active chat
  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        const response = await getCounsellorChat();
        if (response) {
          setActiveChat(response.data);
        }
      } catch (error) {
        logger.info(`Error fetching active chat:, ${error}`);
        setActiveChat(null);
      }
    };
    fetchActiveChat();
  }, [userId, getCounsellorChat]);

  // Wake lock management
  useEffect(() => {
    // Request wake lock when component mounts and there's an active chat
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          logger.info("Wake Lock is active");
        }
      } catch (err) {
        logger.info(`Wake Lock request failed:${err}`);
      }
    };

    // Request wake lock when component mounts and there's an active chat
    if (activeChat?.chatId) {
      requestWakeLock();
    }

    // Handle visibility change to reacquire wake lock when user returns to tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && activeChat?.chatId) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            logger.info("Wake Lock reacquired");
          }
        } catch (err) {
          logger.info(`Error reacquiring Wake Lock:${err}`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: Release wake lock and remove event listener when component unmounts
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current
          .release()
          .then(() => {
            wakeLockRef.current = null;
            logger.info("Wake Lock released");
          })
          .catch(err => logger.info(`Error releasing Wake Lock:${err}`));
      }
    };
  }, [activeChat?.chatId]);

  return {
    activeChat,
    isFocusMode,
    setIsFocusMode,
    speakerTranscriptions,
    myTranscriptions,
    nudges,
    stage,
    isUserJoined,
    isLoading,
    nudgeStatus,
    isFocusButtonDisabled,
    shouldShowCallInterface,
  };
};
