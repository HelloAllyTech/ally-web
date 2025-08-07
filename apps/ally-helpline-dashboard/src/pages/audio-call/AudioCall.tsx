import { useState, useEffect, FunctionComponent, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Minimize } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndCallMutation, useLazyGetClientChatQuery, useLazyGetCounsellorChatQuery } from "@api";
import { RootState } from "@store";
import { UserRole, UserStatus, Chat, QueueStatus } from "@types";
import { setUserStatus } from "@reducer";
import { FallbackUI, StressBuster } from "@components";
import { CallProvider, CallType } from "@constants";
import { NoResults, MindfullnessVideo } from "@assets";

import { CallTranscript, EndTransitionScreen } from "./components";

export const AudioCall: FunctionComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [activeChat, setActiveChat] = useState<Chat | null>();
  const [microphoneChatId, setMicrophoneChatId] = useState<number | null>(null);
  const [endingMessage, setEndingMessage] = useState<string>("");
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showStressBuster, setShowStressBuster] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const user = useSelector((state: RootState) => state.user.user);

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] =
    useLazyGetCounsellorChatQuery();
  const [getClientChat, { isLoading: isClientChatLoading }] = useLazyGetClientChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();
  const { availableChatTypes } = useSelector((state: RootState) => state.user);

  const isMicrophoneMode = mode === "microphone";
  const isExotelMode = mode === "exotel";
  const isLoading = isCounsellorChatLoading || isClientChatLoading || isEndCallLoading;
  const isActiveMicrophoneSession = isMicrophoneMode && microphoneChatId && !activeChat?.chatId;

  useEffect(() => {
    return () => {
      setIsEnding(false);
      setShowStressBuster(false);
    };
  }, []);

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
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActiveMicrophoneSession]);

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let response;
        if (user?.role === UserRole.COUNSELLOR) {
          response = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          response = await getClientChat();
        }
        if (response) {
          setUserStatus(UserStatus.OFFLINE);
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

  const handleEndSequence = async () => {
    if (user?.role === UserRole.CLIENT) {
      navigate("/");
      return;
    }
    setIsEnding(true);
    setEndingMessage("You gave your best on that call!");
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEndingMessage("Now, take a moment for yourself");
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowStressBuster(true);
    } catch (error) {
      logger.info(`Error in handleEndSequence:, ${error}`);
    }
  };

  const endSessionAndNavigate = async (triggerApi: boolean = true, chatId: number) => {
    if (triggerApi) {
      const response = await endCall({ chatId });
      if (response?.data?.status !== QueueStatus.ENDED) {
        toast.error("Something went wrong. Please try again later!");
        return;
      }
    }
    handleEndSequence();
  };

  const navigateOnStressBusterClose = () => {
    if (activeChat?.chatId || microphoneChatId) {
      navigate(`/summary/${activeChat?.chatId || microphoneChatId}`);
    }
  };

  const handleViewCallHighlights = () => {
    if (activeChat?.chatId || microphoneChatId) {
      // TODO: Update section param
      navigate(`/summary/${activeChat?.chatId || microphoneChatId}`);
    }
  };

  const getFallbackUI = () => {
    // Fallback shown when user starts microphone mode but there is an ongoing webrtc call
    if (isMicrophoneMode && activeChat?.chatId && activeChat.provider !== CallProvider.MICROPHONE) {
      return (
        <FallbackUI
          image={<NoResults />}
          // TODO: update message and description
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
        (activeChat?.chatId &&
          activeChat?.provider !== CallProvider.WEBRTC &&
          activeChat?.provider !== CallProvider.EXOTEL_CONFERENCE_CALL) ||
        (Array.isArray(activeChat) && activeChat.length === 0))
    ) {
      return (
        <FallbackUI
          image={<NoResults />}
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
          image={<NoResults />}
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
      {!isEnding &&
        ((activeChat?.chatId &&
          (activeChat?.provider === CallProvider.WEBRTC ||
            (isMicrophoneMode && activeChat?.provider === CallProvider.MICROPHONE))) ||
          (isExotelMode && activeChat?.provider === CallProvider.EXOTEL_CONFERENCE_CALL) ||
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
      {isEnding && <EndTransitionScreen endingMessage={endingMessage} />}
      {showStressBuster && (
        <StressBuster
          playOnMount
          isFullScreenMode
          closeIcon={<Minimize />}
          onClose={navigateOnStressBusterClose}
          showViewSummaryButton
          onViewSummary={handleViewCallHighlights}
        />
      )}
    </div>
  );
};
