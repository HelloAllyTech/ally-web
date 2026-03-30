import { CallProvider, CallSummaryGenerationDataMap } from "@constants";

export const getEstimatedSummaryGenerationTime = (
  callDuration: number,
  callProvider: CallProvider,
) => {
  // calculate the estimated generation time in seconds based on actual generation time
  // 1.2 is a buffer to account for the time it takes to generate the summary
  const callSumamryGenerationData = CallSummaryGenerationDataMap[callProvider];
  if (!callSumamryGenerationData) return 0;
  const estimatedGenerationTimeInseconds =
    ((callSumamryGenerationData.summaryGenerationDurationInSeconds * callDuration) /
      callSumamryGenerationData.durationInSeconds) *
    1.2;

  return Math.ceil(estimatedGenerationTimeInseconds / 60);
};
