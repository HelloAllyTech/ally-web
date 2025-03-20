import { Minimize } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, FunctionComponent } from "react";

import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";
import { setIsOnline } from "@/reducer/userReducer";
import { Button, StressBuster } from "@/components";
import { useClientChat, useCounsellorChat } from "@/hooks";

import { Chat } from "./types";
import CallTranscript from "./CallTranscript";
import EndTransitionScreen from "./components/EndTransition";

const AudioCall: FunctionComponent = () => {
  const [activeChat, setActiveChat] = useState<Chat | null>();
  const [endingMessage, setEndingMessage] = useState<string>("");
  const [isEnding, setIsEnding] = useState<boolean>(false);
  const [showStressBuster, setShowStressBuster] = useState<boolean>(false);

  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();

  const { getCounsellorChat, endSession } = useCounsellorChat();
  const { fetchCurrentChat } = useClientChat();

  useEffect(() => {
    return () => {
      setIsEnding(false);
      setShowStressBuster(false);
    };
  }, []);

  const handleEndSequence = async () => {
    if (user?.role === UserRole.CLIENT) {
      // For clients, navigate immediately
      navigate("/");
      return;
    }
    setIsEnding(true);
    // First message
    setEndingMessage("You gave your best on that call!");

    // Wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Second message
    setEndingMessage("Now, take a moment for yourself");

    // Wait 3 more seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setShowStressBuster(true);

    // Navigate
    // navigate(`/summary/${chatId}`);
    // Show stress buster
  };

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let data;
        if (user?.role === UserRole.COUNSELOR) {
          data = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          data = await fetchCurrentChat();
        }
        if (data) {
          setIsOnline(false);
          setActiveChat(data);
        }
      } catch (error) {
        console.error("Error fetching active chat:", error);
        setActiveChat(null);
      }
    };

    fetchActiveChat();
  }, [user]);

  const endSessionAndNavigate = async (triggerApi: boolean = true) => {
    try {
      if (triggerApi) {
        await endSession(activeChat.chatId);
      }
      handleEndSequence();
    } catch (error) {
      console.error("Error ending session:", error);
    }
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
        >
          <Button
            className="mt-8 rounded-full"
            onClick={handleViewCallHighlights}
          >
            View Call Highlights
          </Button>
        </StressBuster>
      )}
    </div>
  );
};

export default AudioCall;
