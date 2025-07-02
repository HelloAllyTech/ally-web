import { Minimize } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, FunctionComponent, useMemo } from "react";

import { logger } from "@ally-ui-mono/ui-shared";
import { UserRole, UserStatus } from "@/types/user";
import { Chat } from "@/types/message";
import { RootState } from "@/store/store";
import { NoResults } from "@/assets/icons";
import { setUserStatus } from "@/reducer/userReducer";
import { FallbackUI, StressBuster } from "@/components";
import {
  useEndCallMutation,
  useLazyGetClientChatQuery,
  useLazyGetCounsellorChatQuery,
} from "@/api/audioCall";
import { MindfullnessVideo } from "@/assets/videos";

import CallTranscript from "./CallTranscript";
import EndTransitionScreen from "./components/EndTransition";

const AudioCall: FunctionComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const [activeChat, setActiveChat] = useState<Chat | null>();
  const [microphoneChatId, setMicrophoneChatId] = useState<number | null>(null);
  const [endingMessage, setEndingMessage] = useState<string>("");
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showStressBuster, setShowStressBuster] = useState<boolean>(false);

  const user = useSelector((state: RootState) => state.user.user);

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] =
    useLazyGetCounsellorChatQuery();
  const [getClientChat, { isLoading: isClientChatLoading }] = useLazyGetClientChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();

  const isMicrophoneMode = mode === "microphone";
  const isLoading = isCounsellorChatLoading || isClientChatLoading || isEndCallLoading;

  useEffect(() => {
    return () => {
      setIsEnding(false);
      setShowStressBuster(false);
    };
  }, []);

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
      await endCall({ chatId });
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
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <video src={MindfullnessVideo} preload="auto" className="hidden" />
      {getFallbackUI()}
      {!isEnding && (
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
