import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { ROUTES } from "@/constants/routes";
import { ChatStatus, QueueStatus, SocketEvent } from "@/types/message";
import { UserRole } from "@/types/user";
import { Button } from "@/components";
import { useClientChat, useSocket } from "@/hooks";
import { RootState } from "@/store/store";

const ClientInterface = () => {
  const navigate = useNavigate();

  const [isWaiting, setIsWaiting] = useState(false);

  const user = useSelector((state: RootState) => state.user.user);

  const { fetchCurrentChat, requestChat, isLoading: isChatLoading } = useClientChat();

  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.CHAT_ACCEPTED]: () => {
        setIsWaiting(false);
        navigate(ROUTES.AUDIO_CALL);
      },
    }),
    []
  );

  const socket = useSocket({
    userId: user?.userId,
    eventCallbacks: socketEventCallbacks,
  });

  useEffect(() => {
    if (isWaiting) {
      socket.connect();
    }
  }, [isWaiting, socket]);

  useEffect(() => {
    (async () => {
      if (user?.role === UserRole.CLIENT) {
        const data = await fetchCurrentChat();
        if (data?.counselorId) {
          navigate(ROUTES.AUDIO_CALL);
        }
        if (data?.status === ChatStatus.PAUSED) {
          setIsWaiting(true);
        }
      }
    })();
  }, [user]);

  const handleStartAudioChat = async () => {
    try {
      const chat = await requestChat();
      if (chat?.status === QueueStatus.WAITING) {
        setIsWaiting(true);
      } else {
        navigate(ROUTES.AUDIO_CALL);
      }
    } catch (error) {
      if (error?.response?.data?.detail)
        toast.error(`${error.response.data.detail}`);
      else toast.error("Something went wrong. Please try again later!");
      setIsWaiting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-screen-xl mx-auto p-6 h-[calc(100vh-100px)]"
      >
        <div className="flex-1 h-full flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full text-center space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Lifeline</h1>
            <p className="text-gray-600">
              {isWaiting ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Finding a counselor for you..</h2>
                  <p className="text-gray-500">Please wait while we find the best counselor for you..</p>
                </>
              ) : (
                "Connect with a counselor instantly and start your journey towards better mental health."
              )}
            </p>
            {isChatLoading || isWaiting ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Button onClick={handleStartAudioChat}>
                Call with a Counselor
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientInterface;
