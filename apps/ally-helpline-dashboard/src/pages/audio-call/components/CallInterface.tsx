import { FC, useEffect, useState } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { motion } from "framer-motion";

import { formatTime } from "../utils";
import { CallInterfaceProps } from "../types";

const CallInterface: FC<CallInterfaceProps> = ({
  activeChat,
  isCounsellor,
  isUserJoined,
  mediaRecorder,
  remoteMediaRecorder,
  remoteStreamRef,
  isMicrophoneMode,
}) => {
  const [seconds, setSeconds] = useState(0);

  const isSharedMicrophoneMode =
    isMicrophoneMode && activeChat?.chatId && activeChat?.provider === "MICROPHONE";

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
    if (isUserJoined === false) {
      message = isCounsellor ? "Participant left the call" : "Counsellor left the call";
    } else if (!isUserJoined) {
      message = isCounsellor ? "Session is starting now.." : "Connecting to your counsellor...";
    }
    return (
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-[#0D0D0D] text-4xl font-normal">{message}</div>
        {!(isUserJoined == null) && (
          <div className="text-[#0D0D0D] text-sm text-center mt-1">
            You can wait for them to rejoin or end the call.
          </div>
        )}
      </motion.div>
    );
  };
  const getDescriptionText = () => {
    if (activeChat?.platform && activeChat?.platform !== "WEB") {
      return "Note: This call was initiated from a different platform. You can listen but cannot control the call (end/unmute).";
    } else if (isSharedMicrophoneMode) {
      return "Note: This call is already active in another tab/window. You can listen but cannot control the call (end/unmute).";
    } else {
      return "Note: Refreshing or closing the active tab will end the call.";
    }
  };

  return (
    <>
      {isUserJoined ? (
        <div
          className="flex flex-col justify-center items-center
            gap-4 z-10 transition-all duration-500 ease-in-out min-h-[20vh]"
        >
          <div className="text-[#000] flex justify-center items-center flex-col gap-2">
            <div className="text-[20px] font-['IBM_Plex_Serif'] font-bold">Taking notes</div>
            <div className="text-[16px] font-medium text-[#525252]">{formatTime(seconds)}</div>
            <div className="text-[12px] text-[#666] text-center max-w-xs mt-1">
              {getDescriptionText()}
            </div>
          </div>
          {/* Hidden Audio Element */}
          <audio
            ref={audio => {
              if (audio) {
                audio.srcObject = remoteStreamRef.current;
                audio.onloadedmetadata = () => {
                  audio.play().catch(e => console.error("Audio playback failed:", e));
                };
              }
            }}
            muted={false}
            autoPlay
          />
          <div className="relative gap-1 flex rounded-lg">
            {(remoteMediaRecorder || (isMicrophoneMode && mediaRecorder)) && (
              <div className="rotate-180 z-0 translate-x-[4px] translate-y-[1px]  ">
                <LiveAudioVisualizer
                  mediaRecorder={remoteMediaRecorder || mediaRecorder}
                  width={200}
                  height={140}
                  barWidth={4}
                  barColor="#000"
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
                  barColor="#000"
                />
              </div>
            )}
            <div className="bg-gradient-to-l from-transparent to-[#FFF] absolute bg top-0 left-0 w-1/2 h-full" />
            <div className="bg-gradient-to-r from-transparent to-[#FFF] absolute top-0 right-0 w-1/2 h-full" />
          </div>
        </div>
      ) : (
        getEmptyScreen()
      )}
    </>
  );
};

export default CallInterface;
