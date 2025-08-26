import { CallSummaryGenerationData } from "@constants";
import { ChatSummaryStatus, SummaryEnabledStatuses } from "@types";

export const getEstimatedSummaryGenerationTime = (callDuration: number) => {
  // calculate the estimated generation time in seconds based on actual generation time
  // 1.2 is a buffer to account for the time it takes to generate the summary
  const estimatedGenerationTimeInseconds =
    ((CallSummaryGenerationData.summaryGenerationDurationInSeconds * callDuration) /
      CallSummaryGenerationData.durationInSeconds) *
    1.2;

  return Math.ceil(estimatedGenerationTimeInseconds / 60);
};

export const getSummaryEnabledStatus = (status: ChatSummaryStatus) =>
  SummaryEnabledStatuses.includes(status);
