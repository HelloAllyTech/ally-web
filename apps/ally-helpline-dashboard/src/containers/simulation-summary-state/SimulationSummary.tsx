import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";

import { useLazyGetSimulationSummaryQuery } from "@api";
import { Button } from "@components";
import { SessionType } from "@types";

import { FeedbackDialog } from "..";
import { FeedbackSection, LoaderSkeleton } from "./components";
import { SimulationSummaryProps } from "./types";

const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  isInSidebar = false,
  summaryId,
  onSummaryClose,
  onSummaryFetch,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);

  const [getSimulationSummary, { data: summary }] = useLazyGetSimulationSummaryQuery();

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 5;
    let summaryPollingInterval;

    const pollForSummary = async () => {
      const { data: summaryData } = await getSimulationSummary(summaryId);
      if (summaryData) {
        onSummaryFetch?.(summaryData);
      }
      if (summaryId && !summaryData?.events) {
        summaryPollingInterval = setInterval(async () => {
          pollCount++;
          const { data } = await getSimulationSummary(summaryId);

          if (data?.events || pollCount >= maxPolls) {
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

  const onSubmit = () => {
    if (summary?.hasFeedback || isInSidebar) {
      onSummaryClose();
    } else {
      setShowFeedbackDialog(true);
    }
  };

  return (
    <div className={`relative flex flex-col h-full w-full ${className}`}>
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1">
        {summary?.id ? (
          <>
            <FeedbackSection {...summary} />
            {!isInSidebar && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute bottom-0 left-4 right-4 z-10 max-w-full bg-white"
              >
                <Button onClick={onSubmit} className="w-[80%] mx-auto">
                  Try another Simulation
                </Button>
              </motion.div>
            )}
            <FeedbackDialog
              open={showFeedbackDialog}
              onClose={onSummaryClose}
              id={summaryId}
              sessionType={SessionType.SIMULATION}
            />
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
