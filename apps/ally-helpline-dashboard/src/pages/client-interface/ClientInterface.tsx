import { useEffect, useMemo, useState, useCallback } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useCancelRequestMutation, useLazyGetClientChatQuery, useRequestCallMutation } from "@api";
import { Call, Logout, LogoutIllustration } from "@assets";
import { Button, ConfirmationDialog } from "@components";
import { ButtonVariant } from "@components/button";
import { ROUTES, SocketConnectionTypes } from "@constants";
import { useSocket, useUser } from "@hooks";
import { ChatStatus, QueueStatus, SocketEvent, UserRole } from "@types";

interface LogoutButtonProps {
  onLogout: () => void;
}

const LogoutButton = ({ onLogout }: LogoutButtonProps) => (
  <Button
    className="absolute top-0 right-0 h-[60px] px-[10px] mx-[15px] mb-[6px]"
    onClick={onLogout}
    variant="icon"
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
    <div className="flex flex-col items-center text-[#000] font-['IBM_Plex_Serif'] text-[20px]">
      {isWaiting ? (
        <>
          <h2 className="text-xl font-[600] mb-2">Finding a counsellor for you..</h2>
          <p className="text-[16px]">Please wait while we find the best counsellor for you</p>
          <div className="flex justify-center my-[30px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
          <Button
            className="sm:text-[22px] text-[16px] !font-[600] py-[24px] px-[20px] rounded-md"
            onClick={onEndCall}
            variant="destructive"
          >
            <Call width={32} height={32} />
            <div>End Call</div>
          </Button>
        </>
      ) : (
        <>
          <div className="mb-[24px]">
            Connect with a counsellor instantly and start your journey towards better mental health.
          </div>
          <Button
            className="sm:text-[22px] text-[16px] !font-[600] py-[24px] px-[20px] rounded-md"
            onClick={onStartAudioChat}
          >
            Call with a Counsellor
          </Button>
        </>
      )}
    </div>
  </div>
);

export const ClientInterface = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const isClient = user?.role === UserRole.CLIENT;

  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [cancelRequest] = useCancelRequestMutation();
  const [requestCall] = useRequestCallMutation();
  const [getClientChat, { data: clientChat, isLoading: isClientChatLoading }] =
    useLazyGetClientChatQuery();

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
      const handleClientChat = async () => {
        const response = await getClientChat();
        if (response?.data?.status === ChatStatus.PAUSED) {
          setIsWaiting(true);
        } else if (response?.data?.status === ChatStatus.ACTIVE) {
          navigate(ROUTES.AUDIO_CALL);
        }
        setCurrentChatId(response?.data?.chatId?.toString());
      };
      handleClientChat();
    }
  }, [isClient]);

  const handleStartAudioChat = async () => {
    try {
      const response = await requestCall();
      setCurrentChatId(response?.data?.chatId);
      if (response?.data) {
        if (response?.data?.status === QueueStatus.WAITING) {
          setIsWaiting(true);
        } else {
          navigate(ROUTES.AUDIO_CALL);
        }
      } else {
        toast.error("Something went wrong. Please try again later!");
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
      await cancelRequest({ chatId: parseInt(currentChatId) });
      setIsWaiting(false);
      setCurrentChatId(null);
    }
  }, [currentChatId, cancelRequest]);

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
      <ConfirmationDialog
        title={{ normal: "Safeguard your ", italic: "account" }}
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        content="Are you sure you want to log out? You will need to enter secure OTP to login again."
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={handleConfirmLogout}
        buttonText="Logout & lock my Ally account"
        icon={LogoutIllustration}
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
