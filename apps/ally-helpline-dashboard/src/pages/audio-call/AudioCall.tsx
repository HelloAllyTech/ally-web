import { useState, useEffect, FunctionComponent, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Minimize } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { RootState } from "@/store/store";
import { UserRole, UserStatus } from "@/types/user";
import { Chat, QueueStatus } from "@/types/message";
import { setUserStatus } from "@/reducer/userReducer";
import { FallbackUI, StressBuster } from "@/components";
import { NoResults } from "@/assets/icons";
import {
  useEndCallMutation,
  useLazyGetClientChatQuery,
  useLazyGetCounsellorChatQuery,
} from "@/api/audioCall";
import { CallType } from "@/constants/call";
import { useGetChatTypesQuery } from "@/api/calls";
import { MindfullnessVideo } from "@/assets/videos";

import { CallTranscript, EndTransitionScreen } from "./components";

const AudioCall: FunctionComponent = () => {
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
  const { data: chatTypes } = useGetChatTypesQuery();

  const isMicrophoneMode = mode === "microphone";
  const isLoading = isCounsellorChatLoading || isClientChatLoading || isEndCallLoading;

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

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let response;
        if (user?.role === UserRole.COUNSELOR) {
          response = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          response = await getClientChat();
        }
        if (response) {
          setUserStatus(UserStatus.OFFLINE);
          setActiveChat(response.data);
          if (response.data.provider === "MICROPHONE") {
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
    if (isMicrophoneMode && activeChat?.chatId && activeChat.provider !== "MICROPHONE") {
      return (
        <FallbackUI
          image={<NoResults />}
          // TODO: update message and description
          mainMessage="There is an ongoing call"
          description="Your active call will be shown here."
        />
      );
    }

    // Fallback shown when user starts webrtc mode but there is no ongoing call
    if (!isMicrophoneMode && !isLoading && !activeChat?.chatId) {
      return (
        <FallbackUI
          image={<NoResults />}
          mainMessage="No Active Call"
          description="Your active call will be shown here."
        />
      );
    }

    if (isMicrophoneMode && !chatTypes?.includes(CallType.MICROPHONE_CHAT)) {
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
        (activeChat?.chatId ||
          (isMicrophoneMode && chatTypes?.includes(CallType.MICROPHONE_CHAT))) && (
          <CallTranscript
            endSession={endSessionAndNavigate}
            activeChat={activeChat}
            microphoneChatId={microphoneChatId}
            isMicrophoneMode={isMicrophoneMode}
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

export default AudioCall;
