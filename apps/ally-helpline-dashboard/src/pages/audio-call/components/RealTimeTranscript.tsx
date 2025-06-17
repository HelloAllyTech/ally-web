import { FC, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Divider } from "@mui/material";
import { motion } from "framer-motion";

import { RootState } from "@/store/store";

import { getSpeakerName } from "../utils";
import { RealTimeTranscriptProps } from "../types";

const RealTimeTranscript: FC<RealTimeTranscriptProps> = ({ isFocusMode, transcriptions }) => {
  const user = useSelector((state: RootState) => state.user.user);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);

  useEffect(() => {
    if (transcriptContainerRef.current && isFocusMode && !isUserScrolling) {
      // Add a small delay to ensure content is rendered before scrolling
      setTimeout(() => {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTo({
            top: transcriptContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [transcriptions, isFocusMode, isUserScrolling]);

  // Add this new function to handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 1;

    setIsUserScrolling(!isAtBottom);
  };

  if (transcriptions?.length <= 0) {
    return null;
  }

  return (
    <motion.div
      className="w-[85%] h-[55vh] flex flex-col overflow-hidden"
      initial={{ height: 0 }}
      animate={{ height: isFocusMode ? "55vh" : 0 }}
      exit={{ height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <h3 className="text-[#000] text-[18px] font-['IBM_Plex_Serif'] mb-2 font-semibold self-start ">Real-time Transcription</h3>
      <Divider
        className="bg-gray-200 w-[65%] mb-2.5"
      />
      <div
        ref={transcriptContainerRef}
        className="z-10 flex-1 overflow-y-auto text-[#000] rounded-lg p-0 
            transition-all duration-500 ease-in-out custom-scrollbar mb-20 flex flex-col gap-2"
        onScroll={handleScroll}
      >
        {transcriptions.map((transcriptionObj, index) => (
          <div key={transcriptionObj.id} className="flex flex-col font-['IBM_Plex_Serif']">
            <div className="font-bold w-[20%] mb-2 mt-[8px]">
              {getSpeakerName(transcriptionObj.senderId, index > 0 && transcriptions[index - 1].senderId, user?.userId)}
            </div>
            <div
              className="typing-animation w-full text-[#525252] text-[16px] leading-[8px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {transcriptionObj.message}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RealTimeTranscript;
