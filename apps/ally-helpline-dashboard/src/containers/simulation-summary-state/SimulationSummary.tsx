import { FC, useEffect } from "react";

import { useLazyGetSimulationSummaryQuery } from "@api";

import { FeedbackSection, LoaderSkeleton, ReviewSection } from "./components";
import { formattedMockData } from "./components/mockData";
import { SimulationSummaryProps } from "./types";

const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  summaryId,
  onSummaryClose,
}) => {
  const [getSimulationSummary, { data: summary }] = useLazyGetSimulationSummaryQuery();

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 5;
    let summaryPollingInterval;

    const pollForSummary = async () => {
      const { data: summaryData } = await getSimulationSummary(summaryId);
      if (summaryId && !summaryData?.summary) {
        summaryPollingInterval = setInterval(async () => {
          pollCount++;
          const { data } = await getSimulationSummary(summaryId);

          if (data?.summary || pollCount >= maxPolls) {
            clearInterval(summaryPollingInterval);
          }
        }, 3500);
      }
    };

    pollForSummary();

    return () => {
      if (summaryPollingInterval) {
        clearInterval(summaryPollingInterval);
      }
    };
  }, [summaryId]);

  return (
    <div className={`relative flex flex-col h-full w-full ${className}`}>
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1">
        {summary?.id ? (
          <>
            <FeedbackSection {...formattedMockData} />
            <ReviewSection summaryId={summaryId} onSummaryClose={onSummaryClose} />
          </>
        ) : (
          <div className="max-h-full w-full overflow-hidden">
            <LoaderSkeleton />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationSummary;
