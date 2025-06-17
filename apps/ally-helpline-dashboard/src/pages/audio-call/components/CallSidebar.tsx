/* eslint-disable react/no-array-index-key */
import { FC, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Divider } from "@mui/material";
import { ThumbUpAlt, ThumbDownAlt, ThumbUpOffAlt, ThumbDownOffAlt } from "@mui/icons-material";
import { InfoIcon } from "lucide-react";

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

  const renderNudgeCard = (nudge: Nudge) => {
    return (
      <div
        className="border border-gray-200 text-[#000] rounded-lg p-4 mb-2"
      >
        <CustomMarkdown
          content={nudge.content}
          className="font-['IBM_Plex_Serif']"
        />
        <Divider
          sx={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
        />
        <div className="flex text-sm items-center gap-2">
          <span>Does this help?</span>
          <button
            className="p-2 rounded-lg transition-colors"
            onClick={() => handleFeedback(nudge, 0)}
            disabled={isLoading}
          >
            {feedbacks[nudge.id]?.rating === 0
              ? <ThumbDownAlt className="w-5 h-5" />
              : <ThumbDownOffAlt className="w-5 h-5" />
            }
          </button>
          <button
            className="p-2 rounded-lg transition-colors"
            onClick={() => handleFeedback(nudge, 1)}
            disabled={isLoading}
          >
            {feedbacks[nudge.id]?.rating === 1
              ? <ThumbUpAlt className="w-5 h-5" />
              : <ThumbUpOffAlt className="w-5 h-5" />
            }
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isCounsellor && isUserJoined && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isFocusMode ? "70%" : 0 }}
          exit={{ width: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#FFF] overflow-hidden border-l border-l-[#D2D2D2]"
        >
          <div className="h-14 px-4 flex justify-between items-center">
            <div />
            <Close
              className="cursor-pointer"
              onClick={onClose}
            />
          </div>
          {stage && (
            <div className="m-4 mb-0 px-6 py-4 border border-[#0473F2]  font-['IBM_Plex_Serif'] rounded-lg bg-[#8CD3FF26]">
              <div className="text-base font-medium text-[#0473F2] ">Current Stage:
                <span className="text-[#000] text-base">{` ${stage}`}</span></div>
            </div>
          )}
          <div
            ref={nudgesContainerRef}
            className="p-4 h-[calc(100vh-10.4rem)] overflow-y-auto custom-scrollbar"
          >
            {nudges?.length > 0 && renderNudgeCard(nudges[nudges?.length - 1])}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallSidebar;
