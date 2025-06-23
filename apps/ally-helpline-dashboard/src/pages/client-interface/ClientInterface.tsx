import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { ROUTES } from "@/constants/routes";
import { ChatStatus, QueueStatus, SocketEvent } from "@/types/message";
import { UserRole } from "@/types/user";
import { Button } from "@/components";
import { useSocket, useUser } from "@/hooks";
import { useGetClientChatQuery, useRequestCallMutation } from "@/api/audioCall";
import { LifelineLogo, Logout } from "@/assets/icons";
import { SocketConnectionTypes } from "@/constants/socket";

const ClientInterface = () => {
  const navigate = useNavigate();

  const [isWaiting, setIsWaiting] = useState(false);

  const {user, logout} = useUser();
  const isClient = user?.role === UserRole.CLIENT;

  const { data: clientChat } = useGetClientChatQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [requestCall, { isLoading: isRequestCallLoading }] =
    useRequestCallMutation();

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
    connectionType: SocketConnectionTypes.WEBRTC_AUDIO_CALL,
  });

  useEffect(() => {
    if (isWaiting) {
      socket.connect();
    }
  }, [isWaiting, socket]);

  useEffect(() => {
    (async () => {
      if (isClient) {
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
  }, [user, clientChat]);

  const handleStartAudioChat = async () => {
    try {
      const response = await requestCall();
      if (response?.data?.status === QueueStatus.WAITING) {
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

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const renderLogoutButton = () => {
    return (
      <button className="absolute top-0 right-0 flex flex-row h-[60px] items-center px-[26px] onClick={handleLogout}  mx-[15px] cursor-pointer mb-[6px]" onClick={handleLogout}>
        <Logout />
        <div className="pl-[10px]">
          <div className="text-[16px] font-[600px] font-['IBM_Plex_Serif'] text-[#444]">Log Out</div>
        </div>
      </button>
    );
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
          {isClient && renderLogoutButton()}
          <div className="max-w-md w-full text-center space-y-8">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">Welcome to</h1>
              <span
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate("/")}
              >
                <LifelineLogo className="cursor-pointer" />
                <h1 className="text-[28px] font-[ReplayPro] font-semibold text-[#081033]">
                  Ally
                </h1>
              </span>
            </div>
            <p className="text-gray-600">
              {isRequestCallLoading || isWaiting ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Finding a counselor for you..
                  </h2>
                  <p className="text-gray-500">
                    Please wait while we find the best counselor for you..
                  </p>
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
