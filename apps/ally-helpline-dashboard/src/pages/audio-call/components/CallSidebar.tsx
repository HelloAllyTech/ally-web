import { FC, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { useAddFeedbackMutation, useUpdateFeedbackMutation } from "@api";
import { Close, ThumbDown, ThumbDownFilled, ThumbUp, ThumbUpFilled } from "@assets/icons";
import { CustomMarkdown, SearchResources } from "@components";
import { FeedbackResponse } from "@types";

import { CallSidebarProps, Nudge } from "../types";

const CallSidebar: FC<CallSidebarProps> = ({
  isFocusMode,
  showSidebar,
  stage,
  onClose,
  nudges,
}) => {
  const { t } = useTranslation();
  const nudgesContainerRef = useRef<HTMLDivElement>(null);

  const [feedbacks, setFeedbacks] = useState<{ [key: number]: FeedbackResponse }>({});

  const [addFeedback, { isLoading: isAddingFeedback }] = useAddFeedbackMutation();
  const [updateFeedback, { isLoading: isUpdatingFeedback }] = useUpdateFeedbackMutation();

  const isLoading = isAddingFeedback || isUpdatingFeedback;

  // Add this effect to scroll to bottom when nudges change
  useEffect(() => {
    if (nudgesContainerRef.current && !isFocusMode) {
      nudgesContainerRef.current.scrollTop = nudgesContainerRef.current.scrollHeight;
    }
  }, [nudges, isFocusMode]);

  useEffect(() => {
    if (nudges) {
      setFeedbacks(prev => {
        const newFeedbacks = {};
        nudges.forEach(nudge => {
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

    setFeedbacks(prev => ({ ...prev, [nudge.id]: response.data }));
  };

  const renderNudgeCard = (nudge: Nudge) => {
    return (
      <div className="border border-gray-200 text-white rounded-lg p-4 mb-2">
        <CustomMarkdown content={nudge.content} className="font-primary" />
        <hr
          className="my-2 border-0 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.12)" }}
        />
        <div className="flex text-sm items-center gap-2">
          <span>{t("audioCall.sidebar.isHelpful")}</span>
          <button
            className="rounded-lg transition-colors"
            onClick={() => handleFeedback(nudge, 0)}
            disabled={isLoading}
          >
            {feedbacks[nudge.id]?.rating === 0 ? (
              <ThumbDownFilled className="w-5 h-5" />
            ) : (
              <ThumbDown className="w-5 h-5" />
            )}
          </button>
          <button
            className="p-2 rounded-lg transition-colors"
            onClick={() => handleFeedback(nudge, 1)}
            disabled={isLoading}
          >
            {feedbacks[nudge.id]?.rating === 1 ? (
              <ThumbUpFilled className="w-5 h-5" />
            ) : (
              <ThumbUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {showSidebar && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isFocusMode ? 0 : "70%" }}
          exit={{ width: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-[#17181A] overflow-hidden border-l-[0.5px] border-l-[#5A5F6A] z-20"
        >
          <div className="h-14 px-4 flex justify-between items-center">
            <div />
            <Close className="cursor-pointer" onClick={onClose} />
          </div>
          {stage && (
            <div className="px-6 py-4 mx-4 mb-4 border border-[#0473F2]  font-primary rounded-lg bg-[#8CD3FF26]">
              <div className="text-base font-medium text-primary-500 ">
                {t("audioCall.sidebar.currentStage")}
                <span className="text-white text-base">{` ${stage}`}</span>
              </div>
            </div>
          )}
          <div ref={nudgesContainerRef} className="mx-4 mb-4">
            {nudges?.length > 0 && renderNudgeCard(nudges[nudges?.length - 1])}
          </div>
          <div className="mx-4 md:mx-2 lg:mx-[20px] mb-[100px] overflow-x-hidden">
            <SearchResources isInSidebar fullWidth showHeader={false} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallSidebar;
