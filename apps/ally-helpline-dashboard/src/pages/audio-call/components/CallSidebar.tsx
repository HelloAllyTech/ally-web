/* eslint-disable react/no-array-index-key */
import { FC, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Divider } from "@mui/material";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Close, LifelineLogo } from "@/assets/icons";
import { CallSidebarProps } from "../types";
import { CustomMarkdown } from "@/components";

const CallSidebar: FC<CallSidebarProps> = ({
    isCounsellor,
    isFocusMode,
    isUserJoined,
    stage,
    onClose,
    nudges,
}) => {
  const nudgesContainerRef = useRef<HTMLDivElement>(null);

  // Add this effect to scroll to bottom when nudges change
  useEffect(() => {
    if (nudgesContainerRef.current && isFocusMode) {
      nudgesContainerRef.current.scrollTop = nudgesContainerRef.current.scrollHeight;
    }
  }, [nudges, isFocusMode]);
  return (
    <AnimatePresence>
      {isCounsellor && isUserJoined && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isFocusMode ? 500 : 0 }}
          exit={{ width: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#12151F] overflow-hidden"
        >
          <div className="border-b border-b-[#292929] h-14 px-4 flex justify-between items-center">
            <div className="font-bold text-white">Copilot</div>
            <Close
              className="cursor-pointer"
              onClick={onClose}
            />
          </div>
          {stage && (
            <div className="m-4 px-6 py-4 border border-[#01D966] rounded-lg bg-[#01D96626]">
              <div className="text-base font-medium text-[#01D966] ">Current Stage</div>
              <div className="text-white text-base">{stage}</div>
            </div>
          )}
          <div
            ref={nudgesContainerRef}
            className="p-4 h-[calc(100vh-10.4rem)] overflow-y-auto custom-scrollbar"
          >
            {nudges?.map((nudge, index) => (
              <div
                className="bg-[#1C1F2A] rounded-lg p-4 mb-2"
                key={`nudge-${index}`}
              >
                <LifelineLogo />
                <CustomMarkdown
                  content={nudge}
                  className="font-['IBM_Plex_Serif']"
                />
                <Divider
                  sx={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                />
                <div className="flex text-sm items-center gap-2 text-[#BABABA]">
                  <span>Does this help?</span>
                  <button className="hover:bg-[#292929] p-2 rounded-lg transition-colors">
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                  <button className="hover:bg-[#292929] p-2 rounded-lg transition-colors">
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallSidebar;
