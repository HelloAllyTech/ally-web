import { FC } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components";

import { CallHighlightsProps } from "../types";
import { highlights } from "../constants";

const CallHighlights: FC<CallHighlightsProps> = ({ onProceed, summaryData }) => {
  const getDuration = (duration: number) => {
    const durationInMinutes = duration / 60;
    if (durationInMinutes > 1) {
      return `${Math.floor(durationInMinutes)} minute${Math.floor(durationInMinutes) > 1 ? "s" : ""}`;
    } else {
      return "1 minute";
    }
  };

  const highlightsData = {
    callDuration: getDuration(summaryData?.details?.callDuration),
    questionsAsked:  "6 questions",
    nudges: `${summaryData?.details?.noOfNudges} Nudges`,
    listeningRatio: summaryData?.details?.callInfo?.clientTalkingPercentage,
    callerMood: "28 Points",
  };

  const getHighlightTitle = (key: string, title: string) => {
    if (key === "callDuration") {
      const durationInMinutes = summaryData?.details?.callDuration / 60;
      if (durationInMinutes > 1) {
        return "The call duration was more than";
      } else {
        return "The call duration was less than";
      }
    }
    return title;
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <span className="text-base font-medium text-[#47464F]">
        Call highlights
      </span>
      <div className="grid grid-cols-2 gap-4">
        {highlights.map((highlight, index) => (
          <div
            key={index}
            className="flex items-center gap-[10px] p-[10px] border border-[#EFEFEF] rounded-[12px]"
          >
            <highlight.image className="h-12 w-12" />
            <div className="flex flex-col">
              <span className="text-[14px]">{getHighlightTitle(highlight.key, highlight.title)}</span>
              <span className="text-[16px] text-[#49454F] font-medium">
                {highlightsData[highlight.key]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onProceed} className="rounded-full w-fit self-end">
        Proceed to call summary
      </Button>
    </motion.div>
  );
};

export default CallHighlights;
