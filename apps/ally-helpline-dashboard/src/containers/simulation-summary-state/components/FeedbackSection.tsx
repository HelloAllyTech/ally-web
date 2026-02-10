import { FC } from "react";

import { motion } from "framer-motion";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { InfoIcon } from "@assets";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

import { feedbackSections } from "./constants";
import { FeedbackSectionProps } from "./types";
import { getFormattedFeedbackSection } from "./utils";

const getFeedbackSectionByType = ({ data, label }: { data: any; label: string }) => {
  return (
    <div className="flex flex-col">
      <span className="w-full text-typography-900 bg-[#EDE7F680] px-4 py-2 text-base">{label}</span>
      <ul className="p-4 space-y-2 text-base overflow-y-auto max-h-[200px] custom-scrollbar">
        {Array.isArray(data) ? (
          data.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="text-typography-900 mr-2">•</span>
              <span className="text-typography-900">{item}</span>
            </li>
          ))
        ) : (
          <li className="flex items-start">
            <span className="text-typography-900 mr-2">•</span>
            <span className="text-typography-900">{data}</span>
          </li>
        )}
      </ul>
    </div>
  );
};

export const FeedbackSection: FC<FeedbackSectionProps> = props => {
  const formattedData = getFormattedFeedbackSection(props);

  return (
    <motion.div className="flex flex-col gap-6 w-full">
      <div className="border p-5 shadow-lg rounded-lg flex flex-col gap-4">
        <span className="text-typography-900 py-2 font-primary text-base font-semibold border-b">
          Session Feedback
        </span>
        <div>
          <div className="flex items-center gap-5 border-b pb-4">
            <div>
              <CustomImage
                src={formattedData.coverImage}
                alt="Cover Image"
                className="w-[150px] h-[77px] object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 font-primary">
              <span className="text-typography-700 text-sm">ID: {formattedData.sessionName}</span>
              <span className="text-typography-900 text-lg font-medium flex items-center gap-1">
                {formattedData.title}
                <InfoIcon />
              </span>
              <span className="text-typography-700 text-sm flex items-center gap-3">
                <span>
                  {getFormattedDateTime(formattedData.sessionStartedAt, "MMM dd, yyyy hh:mm a")}
                </span>
                <span className="text-typography-500">•</span>
                <span>{getFormattedTimeFromDuration(formattedData.callDuration, "mm:ss")} min</span>
              </span>
            </div>
          </div>
        </div>
        <motion.div className="overflow-y-auto font-primary space-y-4">
          {feedbackSections.map(({ key, label }, index) => {
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
                className="bg-white"
              >
                <div className="border-[0.5px] border-[#C8C5D0]">
                  {formattedData[key] ? (
                    getFeedbackSectionByType({ data: formattedData[key], label })
                  ) : (
                    <div className="text-typography-700 font-primary text-center mb-2">
                      No data found
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
};
