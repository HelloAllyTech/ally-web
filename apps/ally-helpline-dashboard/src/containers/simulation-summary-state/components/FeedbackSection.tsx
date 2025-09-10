import { FC } from "react";

import { motion } from "framer-motion";

import { Accordion } from "@components";
import { feedbackDemographics, feedbackSections } from "@constants";

export const FeedbackSection: FC = () => {
  return (
    <motion.div className="flex flex-col gap-6 w-full">
      <motion.div className="flex flex-row items-center text-[#9CA3AF]">
        <div className="text-[12px] font-semibold min-w-[120px] sm:min-w-[145px] font-['Roboto']">
          SESSION FEEDBACKS
        </div>
        <div className="flex w-full h-[1px] bg-[#D2D2D2] ml-[5px] opacity-70" role="separator" />
      </motion.div>
      <motion.div className="flex items-center gap-1 sm:gap-2">
        {feedbackDemographics.map(feedback => (
          <div
            key={feedback.key}
            className="flex flex-col gap-2 flex-1 min-w-[120px] sm:min-w-[145px] font-['IBM_Plex_Serif'] border-[0.5px] border-[#D2D2D2] rounded-[4px] p-[10px]"
          >
            <span className="text-[12px] text-[#656565]">{feedback.label}</span>
            <span className="text-[14px] text-[#0D0D0D] font-medium">value</span>
          </div>
        ))}
      </motion.div>
      <motion.div className="overflow-y-auto font-['IBM_Plex_Serif']">
        {feedbackSections.map(({ label, icon, key }, index) => {
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              className="bg-slate-600"
            >
              <Accordion title={label} titleIcon={icon} defaultExpanded={true}>
                <span className="pb-4">
                  Explore emotional keywords more deeply instead of moving on.
                </span>
              </Accordion>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
