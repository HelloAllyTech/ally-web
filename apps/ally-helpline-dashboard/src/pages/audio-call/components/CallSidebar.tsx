/* eslint-disable react/no-array-index-key */
import { FC, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Divider } from "@mui/material";
import { InfoIcon, ThumbsDown, ThumbsUp } from "lucide-react";

import { Close, LifelineLogo } from "@/assets/icons";
import { CustomMarkdown } from "@/components";
import { useAddFeedbackMutation, useUpdateFeedbackMutation } from "@/api/audioCall";
import { FeedbackResponse } from "@/types/message";

import { CallSidebarProps, Nudge } from "../types";

const CallSidebar: FC<CallSidebarProps> = ({
    isCounsellor,
    isFocusMode,
    isUserJoined,
    stage,
    onClose,
    nudges,
}) => {
  const nudgesContainerRef = useRef<HTMLDivElement>(null);

  const [feedbacks, setFeedbacks] = useState<{ [key: number]: FeedbackResponse }>({});

  const [addFeedback, { isLoading: isAddingFeedback }] = useAddFeedbackMutation();
  const [updateFeedback, { isLoading: isUpdatingFeedback }] = useUpdateFeedbackMutation();

  const isLoading = isAddingFeedback || isUpdatingFeedback;

  // Add this effect to scroll to bottom when nudges change
  useEffect(() => {
    if (nudgesContainerRef.current && isFocusMode) {
      nudgesContainerRef.current.scrollTop = nudgesContainerRef.current.scrollHeight;
    }
  }, [nudges, isFocusMode]);

  useEffect(() => {
    if (nudges) {
      setFeedbacks((prev) => {
        const newFeedbacks = {};
        nudges.forEach((nudge) => {
          newFeedbacks[nudge.id] = nudge.feedback;
        });
        return { ...prev, ...newFeedbacks };
      });
    }
  }, [nudges]);

  const handleFeedback = async (nudge: Nudge, rating: number) => {
    const currentFeedback = feedbacks[nudge.id];

    if (currentFeedback?.rating === rating) return;

    let response;
    if (currentFeedback?.feedbackId) {
      response = await updateFeedback({
        feedbackId: currentFeedback.feedbackId,
        feedback: { ...currentFeedback, rating },
      });
    } else {
      response = await addFeedback({ id: nudge.id, feedback: { rating } });
    }

    setFeedbacks((prev) => ({ ...prev, [nudge.id]: response.data }));
  };

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
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LifelineLogo />
                    <span className="border-l pl-2 text-[#407BFF] text-[18px]">{index + 1}</span>
                  </div>
                  <InfoIcon className="w-5 h-5" />
                </div>
                <CustomMarkdown
                  content={nudge.content}
                  className="font-['IBM_Plex_Serif']"
                />
                <Divider
                  sx={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                />
                <div className="flex text-sm items-center gap-2 text-[#BABABA]">
                  <span>Does this help?</span>
                  <button
                    className="hover:bg-[#292929] p-2 rounded-lg transition-colors"
                    onClick={() => handleFeedback(nudge, 0)}
                    disabled={isLoading}
                  >
                    <ThumbsDown className="w-5 h-5" />
                  </button>
                  <button
                    className="hover:bg-[#292929] p-2 rounded-lg transition-colors"
                    onClick={() => handleFeedback(nudge, 1)}
                    disabled={isLoading}
                  >
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
