import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetSimulationSummaryQuery } from "@api";

import { FeedbackSection, LoaderSkeleton } from "./components";
import { SimulationSummaryProps } from "./types";

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  summaryId,
  onSummaryFetch,
  hideSection = false,
}) => {
  const [retryMaxReached, setRetryMaxReached] = useState<boolean>(false);

  const [getSimulationSummary, { data: summary }] = useLazyGetSimulationSummaryQuery();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let summaryPollCount = 0;
    const maxPolls = 5;

    const pollSimulationSummary = async () => {
      try {
        const { data } = await getSimulationSummary(summaryId);

        if (data && isMounted) onSummaryFetch?.(data);

        if (data?.details?.summary?.feedback) return;

        if (summaryPollCount >= maxPolls) {
          if (isMounted) {
            setRetryMaxReached(true);
            if (data?.details?.summary?.errorMessage?.length > 0) {
              toast.error(data?.details?.summary?.errorMessage);
            } else if (!data?.details?.summary?.feedback) {
              toast.error("Summary generation in progress. Please try again later.");
            }
          }
          return;
        }

        if (isMounted && !data?.details?.summary?.feedback) {
          summaryPollCount++;
          timeoutId = setTimeout(pollSimulationSummary, 3500);
        }
      } catch {
        logger.error("Polling error in simulation summary");
        if (isMounted && summaryPollCount < maxPolls) {
          summaryPollCount++;
          timeoutId = setTimeout(pollSimulationSummary, 3500);
        }
      }
    };

    if (summaryId) pollSimulationSummary();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [summaryId]);

  if (hideSection) return null;
  return (
    <div
      className={`relative flex flex-col h-full w-full ${className}`}
      data-testid="simulation-summary"
    >
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1 w-full custom-scrollbar px-[10px]">
        {retryMaxReached || summary?.details?.summary?.feedback ? (
          <FeedbackSection {...summary} sessionId={summaryId} />
        ) : (
          <div className="max-h-full w-full overflow-hidden">
            <LoaderSkeleton />
          </div>
        )}
      </div>
    </div>
  );
};
