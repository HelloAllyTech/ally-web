import { CallSummaryGenerationData } from "@constants";
import { ChatSummaryStatus, SummaryEnabledStatuses } from "@types";

export const getEstimatedSummaryGenerationTime = (callDuration: number) => {
  const estimatedGenerationTimeInseconds =
    (CallSummaryGenerationData.summaryGenerationDurationInSeconds * callDuration) /
    CallSummaryGenerationData.durationInSeconds;
  return Math.ceil(estimatedGenerationTimeInseconds / 60);
};

export const getSummaryEnabledStatus = (status: ChatSummaryStatus) =>
  SummaryEnabledStatuses.includes(status);
