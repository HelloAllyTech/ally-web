import { Minimize } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, FunctionComponent } from "react";

import { UserRole, UserStatus } from "@/types/user";
import { Chat } from "@/types/message";
import { RootState } from "@/store/store";
import { NoResults } from "@/assets/icons";
import { setUserStatus } from "@/reducer/userReducer";
import { FallbackUI, StressBuster } from "@/components";

import CallTranscript from "./CallTranscript";
import EndTransitionScreen from "./components/EndTransition";
import { useEndCallMutation, useLazyGetClientChatQuery, useLazyGetCounsellorChatQuery } from "@/api/audioCall";
import { MindfullnessVideo } from "@/assets/videos";
import { logger } from "@ally-ui-mono/ui-shared";

const AudioCall: FunctionComponent = () => {
  const [activeChat, setActiveChat] = useState<Chat | null>();
  const [endingMessage, setEndingMessage] = useState<string>("");
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showStressBuster, setShowStressBuster] = useState<boolean>(false);

  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] = useLazyGetCounsellorChatQuery();
  const [getClientChat, { isLoading: isClientChatLoading }] = useLazyGetClientChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();

  const isLoading = isCounsellorChatLoading || isClientChatLoading || isEndCallLoading;

  useEffect(() => {
    return () => {
      setIsEnding(false);
      setShowStressBuster(false);
    };
  }, []);

  const handleEndSequence = async () => {
    if (user?.role === UserRole.CLIENT) {
      navigate('/');
      return;
    }
    setIsEnding(true);
    setEndingMessage('You gave your best on that call!');
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setEndingMessage('Now, take a moment for yourself');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setShowStressBuster(true);
    } catch (error) {
      logger.info(`Error in handleEndSequence:, ${error}`);
    }
  };

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

  const endSessionAndNavigate = async (triggerApi: boolean = true) => {
    if (triggerApi) {
      await endCall({ chatId: activeChat?.chatId });
    }
    handleEndSequence();
  };

  const navigateOnStressBusterClose = () => {
    if (activeChat?.chatId) {
      navigate(`/summary/${activeChat?.chatId}`);
    }
  };

  const handleViewCallHighlights = () => {
    if (activeChat?.chatId) {
      // TODO: Update section param
      navigate(`/summary/${activeChat?.chatId}?section=2`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <video src={MindfullnessVideo} preload="auto" className="hidden" />
      {!isLoading && !activeChat?.chatId && (
        <FallbackUI
          image={<NoResults />}
          mainMessage="No Active Call"
          description="Your active call will be shown here."
        />
      )}
      {!isEnding && activeChat?.chatId && (
        <CallTranscript
          endSession={endSessionAndNavigate}
          activeChat={activeChat}
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
