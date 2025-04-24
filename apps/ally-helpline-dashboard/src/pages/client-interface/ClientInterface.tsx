import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { ROUTES } from "@/constants/routes";
import { ChatStatus, QueueStatus, SocketEvent } from "@/types/message";
import { UserRole } from "@/types/user";
import { Button } from "@/components";
import { useSocket } from "@/hooks";
import { RootState } from "@/store/store";
import { useGetClientChatQuery, useRequestCallMutation } from "@/api/audioCall";

const ClientInterface = () => {
  const navigate = useNavigate();

  const [isWaiting, setIsWaiting] = useState(false);

  const user = useSelector((state: RootState) => state.user.user);

  const { data: clientChat } = useGetClientChatQuery(undefined, { refetchOnMountOrArgChange: true });
  const [requestCall, { isLoading: isRequestCallLoading }] = useRequestCallMutation();

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
        // TODO: Need to redirect to AudioCall page if a call is ongoing
        // currently clientChat value persists even after call is ended, triggering repeated navigations
        // if (clientChat?.counselorId) {
        //   console.log("useeffect", clientChat?.counselorId);
        //   navigate(ROUTES.AUDIO_CALL);
        // }
        if (clientChat?.status === ChatStatus.PAUSED) {
          setIsWaiting(true);
        }
      }
    })();
  }, [user]);

  const handleStartAudioChat = async () => {
    try {
      const response = await requestCall();
      if (response?.data?.status === QueueStatus.WAITING) {
        setIsWaiting(true);
      } else {
        navigate(ROUTES.AUDIO_CALL);
      }
    } catch (error) {
      if (error?.response?.data?.detail) toast.error(`${error.response.data.detail}`);
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
              {isRequestCallLoading || isWaiting ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Finding a counselor for you..</h2>
                  <p className="text-gray-500">Please wait while we find the best counselor for you..</p>
                </>
              ) : (
                "Connect with a counselor instantly and start your journey towards better mental health."
              )}
            </p>
            {isRequestCallLoading || isWaiting ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Button onClick={handleStartAudioChat}>Call with a Counselor</Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientInterface;
