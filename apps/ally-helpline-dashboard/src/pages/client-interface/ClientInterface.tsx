import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { ROUTES } from "@/constants/routes";
import { ChatStatus, QueueStatus, SocketEvent } from "@/types/message";
import { UserRole } from "@/types/user";
import { Button, Confirm } from "@/components";
import { useSocket, useUser } from "@/hooks";
import { useEndCallMutation, useGetClientChatQuery, useRequestCallMutation } from "@/api/audioCall";
import { Call, Logout } from "@/assets/icons";
import { SocketConnectionTypes } from "@/constants/socket";
import { logger } from "@ally-ui-mono/ui-shared";

interface LogoutButtonProps {
  onLogout: () => void;
}

const LogoutButton = ({ onLogout }: LogoutButtonProps) => (
  <Button
    className="absolute top-0 right-0 flex flex-row h-[60px] items-center px-[10px] mx-[15px] cursor-pointer mb-[6px] bg-transparent hover:bg-transparent"
    onClick={onLogout}
  >
    <Logout />
    <div className="pl-[10px]">
      <div className="text-[16px] font-[600px] font-['IBM_Plex_Serif'] text-[#444]">Log Out</div>
    </div>
  </Button>
);

interface MainContentProps {
  isWaiting: boolean;
  onStartAudioChat: () => void;
  onEndCall: () => void;
}

const MainContent = ({ isWaiting, onStartAudioChat, onEndCall }: MainContentProps) => (
  <div className="max-w-md w-full text-center space-y-2">
    <div className="flex items-center justify-center gap-2 font-['Replay_Pro'] text-[#434343] text-[32px] sm:text-[56px]">
      <div className="font-[400]">Welcome to</div>
      <div className="italic font-[900]">Ally</div>
    </div>
    <div className="text-[#000] font-['IBM_Plex_Serif'] text-[20px]">
      {isWaiting ? (
        <>
          <h2 className="text-xl font-[600] mb-2">Finding a counselor for you..</h2>
          <p className="text-[16px]">Please wait while we find the best counselor for you</p>
          <div className="flex justify-center my-[30px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
          <Button
            className="sm:text-[22px] text-[16px] font-[600] py-[24px] px-[20px] bg-[#F93535] hover:bg-[#F93535]"
            onClick={onEndCall}
          >
            <Call width={32} height={32} />
            <div>End Call</div>
          </Button>
        </>
      ) : (
        <>
          <div className="mb-[24px]">
            Connect with a counselor instantly and start your journey towards better mental health.
          </div>
          <Button
            className="sm:text-[22px] text-[16px] font-[600] py-[24px] px-[20px]"
            onClick={onStartAudioChat}
          >
            Call with a Counselor
          </Button>
        </>
      )}
    </div>
  </div>
);

const ClientInterface = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const isClient = user?.role === UserRole.CLIENT;

  const [isWaiting, setIsWaiting] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [endCall] = useEndCallMutation();
  const [requestCall] = useRequestCallMutation();
  const { data: clientChat, isLoading: isClientChatLoading } = useGetClientChatQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  // Socket event callbacks
  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.CHAT_ACCEPTED]: () => {
        setIsWaiting(false);
        navigate(ROUTES.AUDIO_CALL);
      },
    }),
    [navigate],
  );

  const socket = useSocket({
    userId: user?.userId,
    eventCallbacks: socketEventCallbacks,
    connectionType: SocketConnectionTypes.WEBRTC_AUDIO_CALL,
  });

  // Connect socket when waiting
  useEffect(() => {
    if (isWaiting) {
      socket.connect();
    }
  }, [isWaiting, socket]);

  // Handle client chat status changes
  useEffect(() => {
    if (isClient) {
      // TODO: Need to redirect to AudioCall page if a call is ongoing
      // currently clientChat value persists even after call is ended, triggering repeated navigations
      // if (clientChat?.counselorId) {
      //   navigate(ROUTES.AUDIO_CALL);
      // }
      if (clientChat?.status === ChatStatus.PAUSED) {
        setIsWaiting(true);
      }
    }
  }, [isClient, clientChat]);

  const handleStartAudioChat = async () => {
    try {
      const response = await requestCall();
      setCurrentChatId(response?.data?.chatId);
      if (response?.data?.status === QueueStatus.WAITING) {
        setIsWaiting(true);
      } else {
        navigate(ROUTES.AUDIO_CALL);
      }
    } catch (error: any) {
      logger.info(`Error in handleStartAudioChat:, ${error}`);
      if (error?.response?.data?.detail) {
        toast.error(`${error.response.data.detail}`);
      } else {
        toast.error("Something went wrong. Please try again later!");
      }
      setIsWaiting(false);
    }
  };

  const handleEndCall = useCallback(async () => {
    if (currentChatId) {
      await endCall({ chatId: parseInt(currentChatId) });
      setIsWaiting(false);
      setCurrentChatId(null);
    }
  }, [currentChatId, endCall]);

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    logout();
    handleEndCall();
    navigate("/login");
  };

  const renderConfirmationBox = () => {
    return (
      <Confirm
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
        text="Are you sure you want to log out? You will need to log back in to access your account."
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        confirmText="Logout"
        cancelText="Cancel"
        destructive
        title="Logout"
      />
    );
  };

  return (
    <div className="flex-1 min-h-screen overflow-auto">
      {renderConfirmationBox()}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-screen-xl mx-auto p-6 h-[calc(100vh-100px)]"
      >
        <div className="flex-1 h-full flex flex-col items-center justify-center p-4">
          {isClient && <LogoutButton onLogout={handleLogout} />}
          {isClientChatLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <MainContent
              isWaiting={isWaiting}
              onStartAudioChat={handleStartAudioChat}
              onEndCall={handleEndCall}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ClientInterface;
