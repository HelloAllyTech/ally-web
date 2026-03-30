import { FC } from "react";

import { FeedbackSection, LoaderSkeleton } from "./components";
import { SimulationSummaryProps } from "./types";

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  sessionId,
  summaryData,
  retryMaxReached = false,
  hideSection = false,
}) => {
  if (hideSection) return null;

  const showFeedback = retryMaxReached || (summaryData?.details?.summary?.feedback ?? false);

  return (
    <div
      className={`relative flex flex-col h-full w-full ${className}`}
      data-testid="simulation-summary"
    >
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1 w-full custom-scrollbar">
        {showFeedback && summaryData ? (
          <FeedbackSection {...summaryData} sessionId={sessionId} />
        ) : (
          <div className="max-h-full w-full overflow-hidden">
            <LoaderSkeleton />
          </div>
        )}
      </div>
    </div>
  );
};
