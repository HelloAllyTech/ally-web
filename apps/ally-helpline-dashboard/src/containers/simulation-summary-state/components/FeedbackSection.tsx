import { FC } from "react";

import { motion } from "framer-motion";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { KeyEvents } from "@assets/icons";
import { Accordion } from "@components";
import { FeedbackSectioonType } from "@types";

import { feedbackDemographics, feedbackSections } from "./constants";

const getFeedbackSectionByType = ({
  type,
  data,
  columns,
}: {
  type: FeedbackSectioonType;
  data: any;
  columns: any[];
}) => {
  switch (type) {
    case FeedbackSectioonType.TABLE:
      return (
        <GenericTable
          columns={columns}
          data={data}
          className="min-w-full font-['IBM_Plex_Serif'] overflow-y-scroll mb-4"
        />
      );
    case FeedbackSectioonType.BULLET_TEXT:
      return (
        <ul className="pb-4 space-y-2">
          {Array.isArray(data) ? (
            data.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#0D0D0D] mr-2">•</span>
                <span className="text-[#0D0D0D]">{item}</span>
              </li>
            ))
          ) : (
            <li className="flex items-start">
              <span className="text-[#0D0D0D] mr-2">•</span>
              <span className="text-[#0D0D0D]">{data}</span>
            </li>
          )}
        </ul>
      );
    default:
      return null;
  }
};

export const FeedbackSection: FC = () => {
  const mockApiData = {
    whatWentWell: [
      "Explore emotional keywords more deeply instead of moving on.",
      "Reduce speaking time during emotionally heavy moments.",
      "Reduce speaking time during emotionally heavy moments.",
    ],
    improvementTips: [
      "Explore emotional keywords more deeply instead of moving on.",
      "Reduce speaking time during emotionally heavy moments.",
      "Reduce speaking time during emotionally heavy moments.",
    ],
    keyEvents: [
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
      {
        time: "00.30",
        event:
          "You are eager to help, holding back a little longer will allow the client to express fully. ",
        score: "3",
      },
    ],
  };
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
        {feedbackSections.map(({ label, icon, key, type, columns }, index) => {
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
                <div className="max-h-[250px] overflow-y-scroll">
                  {getFeedbackSectionByType({ type, columns, data: mockApiData[key] })}
                </div>
              </Accordion>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
