import { FC, useEffect, useState } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";

import { formatTime } from "../utils";
import { CallInterfaceProps } from "../types";
import { motion } from "framer-motion";

const CallInterface: FC<CallInterfaceProps> = ({
  activeChat,
  isCounsellor,
  isUserJoined,
  mediaRecorder,
  remoteMediaRecorder,
  remoteStreamRef,
}) => {
  const [seconds, setSeconds] = useState(0);

  // TODO: REthink the logic; A ref could be used for the interval
  useEffect(() => {
    if (!activeChat?.startedAt) return;

    const updateElapsedTime = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor(
        (now - Date.parse(activeChat.startedAt)) / 1000
      );
      setSeconds(diffInSeconds);
    };

    updateElapsedTime(); // Initial update
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [activeChat, activeChat?.startedAt]);

  const getEmptyScreen = () => {
    let message;
    if (isUserJoined === false) {
      message = isCounsellor
        ? "Participant left the call"
        : "Counsellor left the call";
    } else if (!isUserJoined) {
      message = isCounsellor
        ? "Session is starting now.."
        : "Connecting to your counselor...";
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
        {!(isUserJoined == null) && (
          <div className="text-[#BABABA] text-sm text-center mt-1">
            You can wait for them to rejoin or end the call.
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      {isUserJoined ? (
        <div
          className="flex flex-col justify-center items-center
            gap-4 z-10 transition-all duration-500 ease-in-out min-h-[30vh]"
        >
          <div className="text-white flex justify-center items-center flex-col gap-2">
            <div className="text-base font-medium">Ongoing Voice Call</div>
            <div className="text-sm text-[#BABABA]">{formatTime(seconds)}</div>
          </div>
          {/* Hidden Audio Element */}
          <audio
            ref={(audio) => {
              if (audio) {
                audio.srcObject = remoteStreamRef.current;
                audio.onloadedmetadata = () => {
                  audio.play().catch((e) => console.error("Audio playback failed:", e));
                };
              }
            }}
            muted={false}
            autoPlay
          />
          <div className="relative gap-1 flex rounded-lg">
            {remoteMediaRecorder && (
              <div className="rotate-180 z-0 translate-x-[4px] translate-y-[1px]">
                <LiveAudioVisualizer
                  mediaRecorder={remoteMediaRecorder}
                  width={200}
                  height={200}
                  barWidth={4}
                  barColor="#FFFFFF"
                />
              </div>
            )}
            {mediaRecorder && (
              <div className="z-0">
                <LiveAudioVisualizer
                  mediaRecorder={mediaRecorder}
                  width={200}
                  height={200}
                  barWidth={4}
                  barColor="#FFFFFF"
                />
              </div>
            )}
            <div className="waveForm rounded-full absolute top-[38%] left-0 w-1/6 h-1/4 " />
            <div className="waveForm rounded-full absolute top-[38%] right-0 w-1/6 h-1/4 rotate-180" />
          </div>
        </div>
      ) : (
        getEmptyScreen()
      )}
    </>
  );
};

export default CallInterface;
