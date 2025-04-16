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

  return (
    <motion.div
      className="w-[85%] h-[35vh] flex flex-col overflow-hidden"
      initial={{ height: 0 }}
      animate={{ height: isFocusMode ? "35vh" : 0 }}
      exit={{ height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <h3 className="text-white mb-4 self-start ">Real-time Transcription</h3>
      <Divider
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          width: "65%",
          marginBottom: "10px",
        }}
      />
      <div
        ref={transcriptContainerRef}
        className="z-10 flex-1 overflow-y-auto text-white rounded-lg p-4 
            transition-all duration-500 ease-in-out custom-scrollbar mb-20 flex flex-col gap-2"
        onScroll={handleScroll}
      >
        {transcriptions.map((transcriptionObj, index) => (
          <div key={transcriptionObj.id} className="flex">
            <div className="font-bold w-[20%]">
              {getSpeakerName(transcriptionObj.senderId, index > 0 && transcriptions[index - 1].senderId, user?.userId)}
            </div>
            <div
            // TODO: transcriptionObject.id could be used instead as key
              key={index}
              className="typing-animation w-full font-['IBM_Plex_Serif']"
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
