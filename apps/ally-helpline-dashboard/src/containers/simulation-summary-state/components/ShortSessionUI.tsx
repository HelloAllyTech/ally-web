import { FC, useState } from "react";

import { CustomImage, SimulationDetailsModal } from "@ally-ui-mono/ui-shared/index";
import { HourGlass, InfoIcon } from "@assets";
import { SimulationSummary } from "@types";
import { getFormattedDateTime, getFormattedTimeFromDuration } from "@utils";

export interface ShortSessionUIProps {
  className?: string;
  summaryData?: SimulationSummary;
}

export const ShortSessionUI: FC<ShortSessionUIProps> = ({ className = "", summaryData }) => {
  const [showSimulationDetailsModal, setShowSimulationDetailsModal] = useState(false);

  const callDurationInSeconds = Math.floor((summaryData?.details?.callDuration ?? 0) / 1000);
  const formattedCallDuration =
    callDurationInSeconds < 60
      ? `${callDurationInSeconds} sec`
      : `${getFormattedTimeFromDuration(callDurationInSeconds, "mm:ss")} min`;

  return (
    <>
      <div
        className={`flex flex-col min-h-[80vh] items-start min-h-[200px] min-w-[30vw] w-full border border-border-light rounded-md p-4 overflow-y-auto custom-scrollbar ${className}`}
        data-testid="short-session-message"
      >
        <div className="w-full pb-[10px]">
          <div className="text-typography-900 text-md pb-[10px] font-primary">Session Review</div>
          <hr />
        </div>
        {summaryData && (
          <div className="flex items-center gap-5 w-full border-b border-border-light pb-4">
            <div>
              <CustomImage
                src={summaryData.scenario?.coverImageUrl}
                alt="Cover Image"
                className="w-[150px] h-[77px] object-cover rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-1 font-primary">
              <span className="text-typography-700 text-sm">
                ID: {summaryData.metadata?.sessionName}
              </span>
              <span className="text-typography-900 text-lg font-medium flex items-center gap-1">
                {summaryData.scenario?.title}
                <div
                  onClick={() => setShowSimulationDetailsModal(true)}
                  className="text-xs cursor-pointer text-neutral-500 ml-[4px]"
                >
                  <InfoIcon />
                </div>
              </span>
              <span className="text-typography-700 text-sm flex items-center gap-3">
                <span>
                  {summaryData.startedAt &&
                    getFormattedDateTime(summaryData.startedAt, "MMM dd, yyyy hh:mm a")}
                </span>
                <span className="text-typography-400 text-lg">•</span>
                <span>{formattedCallDuration}</span>
              </span>
            </div>
          </div>
        )}
        <div className="w-full flex flex-col min-h-[60vh] items-center justify-center">
          <HourGlass />
          <div className="w-full px-6 py-5 text-center">
            <div className="text-typography-900 text-2xl font-medium font-primary">
              Session ended too soon
            </div>
            <p className="font-primary text-base font-medium text-typography-700">
              We need more interaction data to provide meaningful feedback.
            </p>
          </div>
        </div>
      </div>
      <SimulationDetailsModal
        isOpen={showSimulationDetailsModal}
        title={summaryData?.scenario?.title}
        description={summaryData?.scenario?.description}
        coverImageUrl={summaryData?.scenario?.coverImageUrl}
        coverVideoUrl={summaryData?.scenario?.coverVideoUrl}
        headerTitle="Simulation"
        headerSubtitle="Details"
        scenarioLabel="Scenario:"
        showActionButtons={false}
        onClickOutside={() => setShowSimulationDetailsModal(false)}
      />
    </>
  );
};
