import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { CustomImage, SimulationDetailsModal } from "@ally-ui-mono/ui-shared";
import { InfoIcon } from "@assets";
import { Checklist } from "@src/components";
import { FeedbackSectionType } from "@types";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

import { feedbackSections } from "./constants";
import { FeedbackSectionProps } from "./types";
import { getFormattedFeedbackSection } from "./utils";

const getFeedbackSectionByType = ({
  data,
  label,
  t,
  type,
}: {
  data: any;
  label: string;
  t: any;
  type: FeedbackSectionType;
  columns: any[];
}) => {
  switch (type) {
    // TODO: Use events table when you need this feature
    // case FeedbackSectionType.TABLE:
    //   return (
    //     <GenericTable
    //       columns={columns}
    //       data={data}
    //       className="min-w-full text-sm font-primary overflow-y-scroll mb-4"
    //     />
    //   );
    case FeedbackSectionType.BULLET_TEXT:
      return (
        <div className="flex flex-col border-[0.5px] border-[#C8C5D0] rounded-sm">
          <span className="w-full text-typography-900 bg-[#EDE7F680] px-2 py-2 text-base">
            {label}
          </span>
          <ul className="p-4 space-y-6 text-base">
            {(!data || (Array.isArray(data) && data?.length === 0)) && (
              <div className="text-typography-700 font-primary text-center mb-2">
                {t("postSim.feedback.noData")}
              </div>
            )}
            {Array.isArray(data)
              ? data.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-typography-900 mr-2">•</span>
                    {typeof item === "object" ? (
                      <div className="flex flex-col gap-2 w-full">
                        <span className="text-typography-900 font-primary text-base">
                          {item.improvement}
                        </span>
                        {item.recommendation && (
                          <div className="text-typography-900 bg-[#FFF3E080] border-l-[1px] border-l-[#FFA726] flex flex-col gap-1 pl-2 py-2">
                            <span className="text-[#E65100] tracking-[2px] text-xs font-medium font-tertiary">
                              {t("postSim.skills.recommended")}
                            </span>
                            <span className="text-typography-900 text-base font-primary">
                              {item.recommendation}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-typography-900">{item}</span>
                    )}
                  </li>
                ))
              : data && (
                  <li className="flex items-start gap-2">
                    <span className="text-typography-900 mr-2">•</span>
                    {typeof data === "object" ? (
                      <div className="flex flex-col gap-2 w-full">
                        <span className="text-typography-900 font-primary text-base">
                          {data.improvement}
                        </span>
                        {data.recommendation && (
                          <div className="text-typography-900 bg-[#FFF3E080] border-l-[1px] border-l-[#FFA726] flex flex-col gap-1 pl-2 py-2">
                            <span className="text-[#E65100] tracking-[2px] text-xs font-medium font-tertiary">
                              {t("postSim.skills.recommended")}
                            </span>
                            <span className="text-typography-900 text-base font-primary">
                              {data.recommendation}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-typography-900">{data}</span>
                    )}
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
  const callDurationInSeconds = Number(formattedData?.callDuration || 0);
  const formattedCallDuration =
    callDurationInSeconds < 60
      ? `${callDurationInSeconds} sec`
      : `${getFormattedTimeFromDuration(callDurationInSeconds, "mm:ss")} min`;

  const simulationMode = props?.scenario?.metadata?.experienceMode;
  // The checklist is opt-in per roleplay via Studio and off unless explicitly
  // enabled, so Checklist Mode alone is not enough to surface it here. The
  // in-session checklist panel is unaffected and still follows the mode.
  const isChecklistMode =
    simulationMode === "CHECKLIST" &&
    props?.scenario?.metadata?.summaryChecklistEnabled === true;
  const isFeedbackMode = simulationMode === "FEEDBACK";
  return (
    <motion.div className="flex flex-col gap-6 w-full">
      <div className="border p-4 rounded-md flex flex-col gap-4">
        <span className="text-typography-900 font-primary text-base font-medium border-b pb-3">
          {t("postSim.feedback.sessionFeedback")}
        </span>
        <div>
          <div className="flex items-center gap-5">
            <div>
              <CustomImage
                src={formattedData.coverImage}
                alt="Cover Image"
                className="w-[150px] h-[77px] object-cover rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-1 font-primary">
              <span className="text-typography-700 text-sm">ID: {formattedData.sessionName}</span>
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
        {isChecklistMode && <Checklist className="h-full" sessionId={props.sessionId} />}
        {isFeedbackMode && (
          <motion.div className="font-primary space-y-4">
            {feedbackSections.map(({ key, label, type, columns }, index) => {
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
                    {getFeedbackSectionByType({
                      data: formattedData[key],
                      label,
                      t,
                      type,
                      columns,
                    })}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
      <SimulationDetailsModal
        isOpen={showSimulationDetailsModal}
        title={formattedData.title}
        description={formattedData.description}
        coverImageUrl={formattedData.coverImage}
        coverVideoUrl={formattedData.coverVideo}
        headerTitle={t("postSim.titlePrefix")}
        headerSubtitle={t("postSim.common.details")}
        scenarioLabel={t("postSim.common.scenario")}
        showActionButtons={false}
        onClickOutside={() => setShowSimulationDetailsModal(false)}
      />
    </motion.div>
  );
};
