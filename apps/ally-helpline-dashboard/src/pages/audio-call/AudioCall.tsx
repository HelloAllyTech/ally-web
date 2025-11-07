import { useState, useEffect, FunctionComponent, useRef } from "react";

import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndCallMutation, useLazyGetCounsellorChatQuery } from "@api";
import { NoResults, MindfullnessVideo } from "@assets";
import { FallbackUI } from "@components";
import { CallProvider, CallType, ROUTES, SESSION_STORAGE_KEYS } from "@constants";
import { RootState } from "@store";
import { Chat, QueueStatus } from "@types";
import { isProviderCloudTelephony } from "@utils";

import { CallTranscript } from "./components";

export const AudioCall: FunctionComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [activeChat, setActiveChat] = useState<Chat | null>();
  const [microphoneChatId, setMicrophoneChatId] = useState<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const user = useSelector((state: RootState) => state.user.user);

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] =
    useLazyGetCounsellorChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();
  const { availableChatTypes } = useSelector((state: RootState) => state.user);

  const isMicrophoneMode = mode === "microphone";
  const isExotelMode = mode === "cloud-telephony";
  const isLoading = isCounsellorChatLoading || isEndCallLoading;
  const isActiveMicrophoneSession = isMicrophoneMode && microphoneChatId && !activeChat?.chatId;

  // This is used to keep the screen on when the user is on the call page
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
    if (activeChat?.chatId || microphoneChatId) {
      requestWakeLock();
    }

    // Handle visibility change to reacquire wake lock when user returns to tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && (activeChat?.chatId || microphoneChatId)) {
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
  }, [activeChat?.chatId, microphoneChatId]);

  // Handle page refresh for microphone mode - show browser's default confirmation dialog
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show browser's default confirmation dialog
      // Note: Browser may remember user's choice after first interaction
      event.preventDefault();
      event.returnValue = "";
    };

    if (isActiveMicrophoneSession) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.TRANSCRIPTION_GENERATION_VIDEO_SEEN, "false");
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActiveMicrophoneSession]);

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        const response = await getCounsellorChat();
        if (response) {
          setActiveChat(response.data);
          if (response.data.provider === CallProvider.MICROPHONE) {
            setMicrophoneChatId(response.data.chatId);
          }
        }
      } catch (error) {
        logger.info(`Error fetching active chat:, ${error}`);
        setActiveChat(null);
      }
    };
    fetchActiveChat();
  }, [user]);

  const endSessionAndNavigate = async (triggerApi: boolean = true, chatId: number) => {
    if (triggerApi) {
      const response = await endCall({ chatId });
      if (response?.data?.status !== QueueStatus.ENDED) {
        toast.error("Something went wrong. Please try again later!");
        return;
      }
    }
    navigate(ROUTES.STRESS_BUSTER, {
      state: { chatId: activeChat?.chatId || microphoneChatId || chatId },
    });
  };

  const getFallbackUI = () => {
    // Fallback shown when user starts microphone mode but there is an ongoing call in other provider
    if (isMicrophoneMode && activeChat?.chatId && activeChat.provider !== CallProvider.MICROPHONE) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage="There is an ongoing call"
          description="You have an active call happening now"
        />
      );
    }

    // Fallback shown when user starts webrtc mode but there is no ongoing call
    if (
      !isMicrophoneMode &&
      !isLoading &&
      (!activeChat?.chatId ||
        (activeChat?.chatId && activeChat?.provider === CallProvider.MICROPHONE) ||
        (Array.isArray(activeChat) && activeChat.length === 0))
    ) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage="No Active Call"
          description="Your active call will be shown here."
        />
      );
    }

    if (
      isMicrophoneMode &&
      !activeChat?.chatId &&
      !availableChatTypes?.includes(CallType.MICROPHONE_CHAT)
    ) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage="Microphone mode is not available"
          description="You don't have permission to access microphone mode"
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <video src={MindfullnessVideo} preload="auto" className="hidden" />
      {getFallbackUI()}
      {((activeChat?.chatId &&
        isMicrophoneMode &&
        activeChat?.provider === CallProvider.MICROPHONE) ||
        (isExotelMode && activeChat?.provider && isProviderCloudTelephony(activeChat?.provider)) ||
        (Array.isArray(activeChat) &&
          activeChat.length === 0 &&
          isMicrophoneMode &&
          availableChatTypes?.includes(CallType.MICROPHONE_CHAT))) && (
        <CallTranscript
          endSession={endSessionAndNavigate}
          activeChat={activeChat}
          microphoneChatId={microphoneChatId}
          isMicrophoneMode={isMicrophoneMode}
          isExotelMode={isExotelMode}
          setMicrophoneChatId={setMicrophoneChatId}
        />
      )}
    </div>
  );
};
