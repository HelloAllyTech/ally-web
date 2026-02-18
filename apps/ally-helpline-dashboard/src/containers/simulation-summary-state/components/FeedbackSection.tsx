import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  CustomImage,
  FEATURE_FLAGS_MAP,
  GenericTable,
  SimulationDetailsModal,
} from "@ally-ui-mono/ui-shared";
import { InfoIcon } from "@assets";
import { Checklist } from "@components";
import { FeedbackSectionType } from "@types";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

import { getFeedbackSections } from "./constants";
import { FeedbackSectionProps } from "./types";
import { getFormattedFeedbackSection } from "./utils";

const getFeedbackSectionByType = ({
  data,
  label,
  type,
  columns,
}: {
  data: any;
  label: string;
  type: FeedbackSectionType;
  columns: any[];
}) => {
  switch (type) {
    //TODO: Remove events table
    case FeedbackSectionType.TABLE:
      return (
        <GenericTable
          columns={columns}
          data={data}
          className="min-w-full text-sm font-primary overflow-y-scroll mb-4"
        />
      );
    case FeedbackSectionType.BULLET_TEXT:
      return (
        <div className="flex flex-col border-[0.5px] border-[#C8C5D0] rounded-sm">
          <span className="w-full text-typography-900 bg-[#EDE7F680] px-2 py-2 text-base">
            {label}
          </span>
          <ul className="p-4 space-y-2 text-base">
            {data.length === 0 && (
              <div className="text-typography-700 font-primary text-center mb-2">No data found</div>
            )}
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

    default:
      return null;
  }
};
export const FeedbackSection: FC<FeedbackSectionProps> = props => {
  const { t } = useTranslation();
  const [showSimulationDetailsModal, setShowSimulationDetailsModal] = useState(false);

  const formattedData = getFormattedFeedbackSection(props);
  const callDurationInSeconds = Math.floor(formattedData.callDuration / 1000);
  const formattedCallDuration =
    callDurationInSeconds < 60
      ? `${callDurationInSeconds} sec`
      : `${getFormattedTimeFromDuration(callDurationInSeconds, "mm:ss")} min`;

  return (
    <motion.div className="flex flex-col gap-6 w-full">
      <div className="border p-4 shadow-lg rounded-lg flex flex-col gap-4">
        <span className="text-typography-900 font-primary text-base font-semibold border-b pb-2">
          {t("summary.feedback.title")}
        </span>
        <div>
          <div className="flex items-center gap-5 border-b pb-4">
            <div>
              <CustomImage
                src={formattedData.coverImage}
                alt={t("summary.feedback.coverImageAlt")}
                className="w-[150px] h-[77px] object-cover rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-1 font-primary">
              <span className="text-typography-700 text-sm">
                {t("summary.feedback.sessionId", { id: formattedData.sessionName })}
              </span>
              <span className="text-typography-900 text-lg font-medium flex items-center gap-1">
                {formattedData.title}
                <div
                  onClick={() => setShowSimulationDetailsModal(true)}
                  className="text-xs cursor-pointer text-neutral-500 ml-[4px]"
                >
                  <InfoIcon />
                </div>
              </span>
              <span className="text-typography-700 text-sm flex items-center gap-3">
                <span>
                  {getFormattedDateTime(formattedData.sessionStartedAt, "MMM dd, yyyy hh:mm a")}
                </span>
                <span className="text-typography-400 text-lg">•</span>
                <span>{formattedCallDuration}</span>
              </span>
            </div>
          </div>
        </div>
        <motion.div className="overflow-y-auto font-primary space-y-4">
          {FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG ? (
            <Checklist className="max-h-[calc(100vh-200px)]" sessionId={props.id} />
          ) : (
            feedbackSections.map(({ key, label, type, columns }, index) => {
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
                  <div>
                    {formattedData[key] ? (
                      getFeedbackSectionByType({ data: formattedData[key], label, type, columns })
                    ) : (
                      <div className="text-typography-700 font-primary text-center mb-2">
                        No data found
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
      <SimulationDetailsModal
        isOpen={showSimulationDetailsModal}
        title={formattedData.title}
        description={formattedData.description}
        coverImageUrl={formattedData.coverImage}
        coverVideoUrl={formattedData.coverVideo}
        headerTitle="Simulation"
        headerSubtitle="Details"
        scenarioLabel="Scenario:"
        showActionButtons={false}
        onClickOutside={() => setShowSimulationDetailsModal(false)}
      />
    </motion.div>
  );
};
