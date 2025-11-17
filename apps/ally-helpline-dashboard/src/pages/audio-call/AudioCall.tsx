import { FunctionComponent } from "react";

import { useSearchParams } from "react-router-dom";

import { NoResults, MindfullnessVideo, EndSessionIllustration } from "@assets";
import { FallbackUI, ButtonVariant, ConfirmationDialog } from "@components";
import { CallProvider, CallType } from "@constants";

import { CallSidebar, CallControls, CallInterface } from "./components";
import { useMicrophoneMode, useCloudTelephonyMode } from "./hooks";

export const AudioCall: FunctionComponent = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  const isMicrophoneMode = mode === "microphone";

  const microphoneHook = useMicrophoneMode();
  const cloudTelephonyHook = useCloudTelephonyMode();

  // Select the appropriate hook based on mode
  const selectedHook = isMicrophoneMode ? microphoneHook : cloudTelephonyHook;

  const {
    activeChat,
    isFocusMode,
    setIsFocusMode,
    nudges,
    stage,
    isUserJoined,
    isLoading,
    nudgeStatus,
    isFocusButtonDisabled,
  } = selectedHook;

  // Microphone-specific state (only available in microphone mode)
  const mediaRecorder = isMicrophoneMode ? microphoneHook.mediaRecorder : null;
  const isMuted = isMicrophoneMode ? microphoneHook.isMuted : false;
  const setIsMuted = isMicrophoneMode ? microphoneHook.setIsMuted : undefined;
  const socketDisconnectionReason = isMicrophoneMode
    ? microphoneHook.socketDisconnectionReason
    : undefined;
  const isEndCallDialogOpen = isMicrophoneMode ? microphoneHook.isEndCallDialogOpen : false;
  const setIsEndCallDialogOpen = isMicrophoneMode
    ? microphoneHook.setIsEndCallDialogOpen
    : undefined;
  const confirmEndSession = isMicrophoneMode ? microphoneHook.confirmEndSession : undefined;
  const isEndSessionDisabled = isMicrophoneMode ? microphoneHook.isEndSessionDisabled : false;
  const isPauseTranscriptionDisabled = isMicrophoneMode
    ? microphoneHook.isPauseTranscriptionDisabled
    : true;
  const isSocketDisconnected = isMicrophoneMode ? microphoneHook.isSocketDisconnected : false;
  const availableChatTypes = isMicrophoneMode ? microphoneHook.availableChatTypes : undefined;
  const shouldShowCallInterface = isMicrophoneMode
    ? (activeChat?.chatId && activeChat?.provider === CallProvider.MICROPHONE) ||
      (Array.isArray(activeChat) &&
        activeChat.length === 0 &&
        availableChatTypes?.includes(CallType.MICROPHONE_CHAT))
    : !isLoading &&
      activeChat?.chatId &&
      activeChat?.provider !== CallProvider.MICROPHONE &&
      !(Array.isArray(activeChat) && activeChat.length === 0);

  const getFallbackUI = () => {
    if (isMicrophoneMode) {
      // Fallback shown when user starts microphone mode but there is an ongoing call in other provider
      if (!isLoading && activeChat?.chatId && activeChat.provider !== CallProvider.MICROPHONE) {
        return (
          <FallbackUI
            icon={<NoResults />}
            mainMessage="There is an ongoing call"
            description="You have an active call happening now"
            theme="dark"
          />
        );
      }

      if (
        !isLoading &&
        !activeChat?.chatId &&
        !availableChatTypes?.includes(CallType.MICROPHONE_CHAT)
      ) {
        return (
          <FallbackUI
            icon={<NoResults />}
            mainMessage="Microphone mode is not available"
            description="You don't have permission to access microphone mode"
            theme="dark"
          />
        );
      }
    } else {
      // Fallback shown when there is no ongoing call (Exotel mode)
      if (
        !isLoading &&
        (!activeChat?.chatId ||
          (activeChat?.chatId && activeChat?.provider === CallProvider.MICROPHONE) ||
          (Array.isArray(activeChat) && activeChat.length === 0))
      ) {
        return (
          <FallbackUI
            icon={<NoResults />}
            mainMessage="No Active Call"
            description="Your active call will be shown here."
            theme="dark"
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <video src={MindfullnessVideo} preload="auto" className="hidden" />
      {getFallbackUI()}
      {shouldShowCallInterface && (
        <div className="w-screen h-screen flex justify-center items-center">
          <div className="w-screen h-screen bg-[#171A1A] flex flex-col gap-10 justify-center items-center overflow-hidden">
            <CallInterface
              activeChat={activeChat}
              isUserJoined={isUserJoined}
              socketDisconnectionReason={socketDisconnectionReason}
              mediaRecorder={mediaRecorder}
              isMicrophoneMode={isMicrophoneMode}
              isExotelMode={!isMicrophoneMode}
            />

            <CallControls
              isFocusMode={isFocusMode}
              isPaused={isMuted}
              isEndSessionDisabled={isEndSessionDisabled}
              isFocusButtonDisabled={isFocusButtonDisabled}
              isPauseTranscriptionDisabled={isPauseTranscriptionDisabled}
              onEndSessionClick={isMicrophoneMode ? () => setIsEndCallDialogOpen(true) : undefined}
              onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
              onPauseTranscriptionClick={
                isMicrophoneMode ? () => setIsMuted(previousMuted => !previousMuted) : undefined
              }
              showEndSession={isMicrophoneMode}
              showFocusButton={true}
              showPauseTranscription={isMicrophoneMode}
            />
          </div>
          {isMicrophoneMode && (
            <ConfirmationDialog
              title={{ normal: "End ", italic: "Session" }}
              isOpen={isEndCallDialogOpen}
              onClose={() => setIsEndCallDialogOpen(false)}
              content="Are you sure you want to end this Session"
              buttonVariant={ButtonVariant.DESTRUCTIVE}
              onButtonClick={() => confirmEndSession(true)}
              buttonText="End Session"
              icon={EndSessionIllustration}
            />
          )}
          {nudgeStatus && (!isMicrophoneMode || !socketDisconnectionReason) && (
            <CallSidebar
              showSidebar={isMicrophoneMode ? isUserJoined && !isSocketDisconnected : isUserJoined}
              isFocusMode={isFocusMode}
              nudges={nudges}
              onClose={() => setIsFocusMode(true)}
              stage={stage}
            />
          )}
        </div>
      )}
    </div>
  );
};
