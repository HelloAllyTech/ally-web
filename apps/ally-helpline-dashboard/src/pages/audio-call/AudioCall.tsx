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
  const isDictationMode = mode === "dictation";
  const isAudioWebMode = isMicrophoneMode || isDictationMode;

  const microphoneHook = useMicrophoneMode();
  const cloudTelephonyHook = useCloudTelephonyMode();

  // Select the appropriate hook based on mode
  const selectedHook = isAudioWebMode ? microphoneHook : cloudTelephonyHook;

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
  const mediaRecorder = isAudioWebMode ? microphoneHook.mediaRecorder : null;
  const isMuted = isAudioWebMode ? microphoneHook.isMuted : false;
  const setIsMuted = isAudioWebMode ? microphoneHook.setIsMuted : undefined;
  const socketDisconnectionReason = isAudioWebMode
    ? microphoneHook.socketDisconnectionReason
    : undefined;
  const isEndCallDialogOpen = isAudioWebMode ? microphoneHook.isEndCallDialogOpen : false;
  const setIsEndCallDialogOpen = isAudioWebMode ? microphoneHook.setIsEndCallDialogOpen : undefined;
  const confirmEndSession = isAudioWebMode ? microphoneHook.confirmEndSession : undefined;
  const isEndSessionDisabled = isAudioWebMode ? microphoneHook.isEndSessionDisabled : false;
  const isPauseTranscriptionDisabled = isAudioWebMode
    ? microphoneHook.isPauseTranscriptionDisabled
    : true;
  const isSocketDisconnected = isAudioWebMode ? microphoneHook.isSocketDisconnected : false;
  const availableChatTypes = isAudioWebMode ? microphoneHook.availableChatTypes : undefined;
  const shouldShowCallInterface = isAudioWebMode
    ? (activeChat?.chatId && activeChat?.provider === CallProvider.MICROPHONE) ||
      (Array.isArray(activeChat) &&
        activeChat.length === 0 &&
        (isDictationMode
          ? availableChatTypes?.includes(CallType.DICTATION_MODE)
          : availableChatTypes?.includes(CallType.MICROPHONE_CHAT)))
    : !isLoading &&
      activeChat?.chatId &&
      activeChat?.provider !== CallProvider.MICROPHONE &&
      !(Array.isArray(activeChat) && activeChat.length === 0);

  const getFallbackUI = () => {
    if (isAudioWebMode) {
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

      const hasPermission = isDictationMode
        ? availableChatTypes?.includes(CallType.DICTATION_MODE)
        : availableChatTypes?.includes(CallType.MICROPHONE_CHAT);

      if (!isLoading && !activeChat?.chatId && !hasPermission) {
        return (
          <FallbackUI
            icon={<NoResults />}
            mainMessage={`${isDictationMode ? "Dictation" : "Microphone"} mode is not available`}
            description={`You don't have permission to access ${isDictationMode ? "dictation" : "microphone"} mode`}
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

  const onPauseTranscriptionClick = () => {
    if (isAudioWebMode) {
      if (setIsMuted) {
        setIsMuted(previousMuted => !previousMuted);
      }
    }
  };

  const onEndSessionClick = () => {
    if (isAudioWebMode) {
      if (setIsEndCallDialogOpen) {
        setIsEndCallDialogOpen(true);
      }
    }
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
              isMicrophoneMode={isAudioWebMode}
              isExotelMode={!isAudioWebMode}
            />

            <CallControls
              isFocusMode={isDictationMode ? false : isFocusMode}
              isPaused={isMuted}
              isEndSessionDisabled={isEndSessionDisabled}
              isFocusButtonDisabled={isFocusButtonDisabled}
              isPauseTranscriptionDisabled={isPauseTranscriptionDisabled}
              onEndSessionClick={onEndSessionClick}
              onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
              onPauseTranscriptionClick={onPauseTranscriptionClick}
              showEndSession={isAudioWebMode}
              showFocusButton={!isDictationMode}
              showPauseTranscription={isAudioWebMode}
            />
          </div>
          {isAudioWebMode && setIsEndCallDialogOpen && confirmEndSession && (
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
          {nudgeStatus && (!isAudioWebMode || !socketDisconnectionReason) && !isDictationMode && (
            <CallSidebar
              showSidebar={isAudioWebMode ? isUserJoined && !isSocketDisconnected : isUserJoined}
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
