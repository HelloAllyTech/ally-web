import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, FunctionComponent } from "react";

import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";
import { useClientChat, useCounsellorChat } from "@/hooks";

import { Chat } from "./types";
import CallTranscript from "./CallTranscript";

const AudioCall: FunctionComponent = () => {
  const [activeChat, setActiveChat] = useState<Chat | null>();

  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();

  const { getCounsellorChat, endSession } = useCounsellorChat();
  const { fetchCurrentChat } = useClientChat();

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let data;
        if (user?.role === UserRole.COUNSELOR) {
          data = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          data = await fetchCurrentChat();
        }
        setActiveChat(data);
      } catch (error) {
        console.error("Error fetching active chat:", error);
        setActiveChat(null);
      }
    };

    fetchActiveChat();
  }, [user]);

  const confirmEndSession = async () => {
    try {
      await endSession(activeChat.chatId);
      navigate("/");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {activeChat?.chatId && (
        <CallTranscript
          endSession={confirmEndSession}
          activeChat={activeChat}
        />
      )}
    </div>
  );
};

export default AudioCall;
