import { FunctionComponent } from "react";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { NoResults, MindfullnessVideo, EndSessionIllustration } from "@assets";
import { FallbackUI, ButtonVariant, ConfirmationDialog } from "@components";
import { CallProvider, CallType } from "@constants";

import { CallSidebar, CallControls, CallInterface } from "./components";
import { useMicrophoneMode, useCloudTelephonyMode } from "./hooks";

export const AudioCall: FunctionComponent = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isMicrophoneMode = mode === "microphone";
  // Live dictation is retired. The link is gone from the UI, but a bookmark or
  // browser-history entry can still land here — recognise it only so the
  // "Dictation mode is not available" fallback renders instead of a blank
  // telephony screen. It never starts a session.
  const isRetiredDictationMode = mode === "dictation";
  const isAudioWebMode = isMicrophoneMode || isRetiredDictationMode;

  const microphoneHook = useMicrophoneMode(mode);
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
        !isRetiredDictationMode &&
        availableChatTypes?.includes(CallType.MICROPHONE_CHAT))
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
            mainMessage={t("audioCall.fallback.ongoingCall")}
            description={t("audioCall.fallback.ongoingCallDesc")}
            theme="dark"
          />
        );
      }

      const hasPermission =
        !isRetiredDictationMode && availableChatTypes?.includes(CallType.MICROPHONE_CHAT);

      if (!isLoading && !activeChat?.chatId && !hasPermission) {
        return (
          <FallbackUI
            icon={<NoResults />}
            mainMessage={t("audioCall.fallback.modeNotAvailable", {
              mode: isRetiredDictationMode
                ? t("audioCall.fallback.modeDictation")
                : t("audioCall.fallback.modeMicrophone"),
            })}
            description={t("audioCall.fallback.noPermission", {
              mode: isRetiredDictationMode
                ? t("audioCall.fallback.modeDictation").toLowerCase()
                : t("audioCall.fallback.modeMicrophone").toLowerCase(),
            })}
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
            mainMessage={t("audioCall.fallback.noActiveCall")}
            description={t("audioCall.fallback.noActiveCallDesc")}
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
    <div className="h-dvh flex items-center justify-center bg-gray-50">
      <video src={MindfullnessVideo} preload="auto" className="hidden" />
      {getFallbackUI()}
      {shouldShowCallInterface && (
        <div className="w-screen h-dvh flex justify-center items-center">
          <div className="w-screen h-dvh bg-[#171A1A] flex flex-col gap-10 justify-center items-center overflow-hidden">
            <CallInterface
              activeChat={activeChat}
              isUserJoined={isUserJoined}
              socketDisconnectionReason={socketDisconnectionReason}
              mediaRecorder={mediaRecorder}
              isMicrophoneMode={isAudioWebMode}
              isExotelMode={!isAudioWebMode}
            />

            <CallControls
              isFocusMode={isFocusMode}
              isPaused={isMuted}
              isEndSessionDisabled={isEndSessionDisabled}
              isFocusButtonDisabled={isFocusButtonDisabled}
              isPauseTranscriptionDisabled={isPauseTranscriptionDisabled}
              onEndSessionClick={onEndSessionClick}
              onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
              onPauseTranscriptionClick={onPauseTranscriptionClick}
              showEndSession={isAudioWebMode}
              showFocusButton
              showPauseTranscription={isAudioWebMode}
            />
          </div>
          {isAudioWebMode && setIsEndCallDialogOpen && confirmEndSession && (
            <ConfirmationDialog
              title={{
                normal: t("audioCall.endDialog.titleNormal"),
                italic: t("audioCall.endDialog.titleItalic"),
              }}
              isOpen={isEndCallDialogOpen}
              onClose={() => setIsEndCallDialogOpen(false)}
              content={t("audioCall.endDialog.content")}
              buttonVariant={ButtonVariant.DESTRUCTIVE}
              onButtonClick={() => confirmEndSession(true)}
              buttonText={t("audioCall.endDialog.endSession")}
              icon={EndSessionIllustration}
            />
          )}
          {nudgeStatus && (!isAudioWebMode || !socketDisconnectionReason) && (
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
