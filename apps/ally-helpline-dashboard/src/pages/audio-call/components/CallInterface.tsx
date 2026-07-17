import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { useTranslation } from "react-i18next";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { Lock, WarningTriangle } from "@assets";
import { CallProvider } from "@constants";

import { ErrorScreen } from ".";
import { CallInterfaceProps } from "../types";
import { formatTime } from "../utils";

const PrivacyTooltip = () => {
  const { t } = useTranslation();
  return (
    <ul className="list-disc list-inside">
      <li>{t("audioCall.privacy.noRecording")}</li>
      <li>{t("audioCall.privacy.encrypted")}</li>
      <li>{t("audioCall.privacy.noTrainingData")}</li>
      <li>{t("audioCall.privacy.personalInfoRemoved")}</li>
    </ul>
  );
};

const CallInterface: FC<CallInterfaceProps> = ({
  activeChat,
  isUserJoined,
  mediaRecorder,
  isMicrophoneMode,
  isExotelMode,
  socketDisconnectionReason,
}) => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const [showExotelBanner, setShowExotelBanner] = useState(true);

  const isSharedMicrophoneMode =
    isMicrophoneMode && activeChat?.chatId && activeChat?.provider === CallProvider.MICROPHONE;

  useEffect(() => {
    // Don't start timer if no chat has started and not in microphone mode
    if (!activeChat?.startedAt && !isMicrophoneMode) return () => {};

    const updateElapsedTime = () => {
      if (isMicrophoneMode && !activeChat?.startedAt) {
        // In microphone mode without startedAt, increment from current seconds
        setSeconds(prev => prev + 1);
      } else if (activeChat?.startedAt) {
        // Calculate elapsed time from startedAt
        const now = Date.now();
        const diffInSeconds = Math.floor((now - Date.parse(activeChat.startedAt)) / 1000);
        setSeconds(diffInSeconds);
      }
    };
    // Initial update
    updateElapsedTime();

    // Set up interval
    const interval = setInterval(updateElapsedTime, 1000);

    // Cleanup on unmount or dependency change
    return () => clearInterval(interval);
  }, [activeChat?.startedAt, isMicrophoneMode]);

  const getEmptyScreen = () => {
    let message;
    if (socketDisconnectionReason) {
      return <ErrorScreen socketDisconnectionReason={socketDisconnectionReason} />;
    }
    if (!isUserJoined && isMicrophoneMode) {
      message = t("audioCall.status.connecting");
    } else if (!isUserJoined) {
      message = t("audioCall.status.starting");
    }
    return (
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-white text-4xl font-normal">{message}</div>
        {isUserJoined === false && !isMicrophoneMode && (
          <div className="text-white text-sm text-center mt-1">
            {t("audioCall.notes.waitOrEnd")}
          </div>
        )}
      </motion.div>
    );
  };
  const getDescriptionText = () => {
    if (activeChat?.platform && activeChat?.platform !== "WEB") {
      return t("audioCall.notes.differentPlatform");
    } else if (isSharedMicrophoneMode) {
      return t("audioCall.notes.activeInOtherTab");
    } else {
      return t("audioCall.notes.refreshWarning");
    }
  };

  return (
    <>
      {isUserJoined && !socketDisconnectionReason ? (
        <div className="flex flex-col pt-9 items-center gap-4 z-10 transition-all duration-500 ease-in-out min-h-[20vh] relative">
          {isExotelMode && showExotelBanner && (
            <div className="w-fit flex gap-4 justify-between items-center bg-[#EEF8FF] border-[0.5px] border-[#0171D9] rounded-[8px] p-2 absolute top-[-24px]">
              <div className="flex items-center gap-[2px] ">
                <WarningTriangle />
                <span className="text-typography-900 text-sm whitespace-nowrap">
                  {t("audioCall.notes.scribeStopWarning")}
                </span>
              </div>
              <X className="w-4 h-4 cursor-pointer" onClick={() => setShowExotelBanner(false)} />
            </div>
          )}
          <div className="text-white flex justify-center items-center flex-col gap-2">
            <div className="flex items-center gap-2 font-primary font-medium">
              <Tooltip label={<PrivacyTooltip />} align="top">
                <span>
                  <Lock />
                </span>
              </Tooltip>
              {t("audioCall.status.takingNotes")}
            </div>
            <div className="text-base font-semibold font-tertiary">{formatTime(seconds)}</div>
            <div className="text-xs text-secondary-500 text-center max-w-xs mt-1">
              {getDescriptionText()}
            </div>
          </div>
          <div className="relative gap-1 flex rounded-lg">
            {mediaRecorder && (
              <div className="rotate-180 z-0 translate-x-[4px] translate-y-[1px]  ">
                <LiveAudioVisualizer
                  mediaRecorder={mediaRecorder}
                  width={200}
                  height={140}
                  barWidth={4}
                  barColor="#fff"
                />
              </div>
            )}
            {mediaRecorder && (
              <div className="z-0">
                <LiveAudioVisualizer
                  mediaRecorder={mediaRecorder}
                  width={200}
                  height={140}
                  barWidth={4}
                  barColor="#fff"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        getEmptyScreen()
      )}
    </>
  );
};

export default CallInterface;
