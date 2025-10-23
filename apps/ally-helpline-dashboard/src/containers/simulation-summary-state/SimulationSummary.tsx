import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { toast } from "sonner";

import { useLazyGetSimulationSummaryQuery } from "@api";
import { Button, PermissionGuard } from "@components";
import { Permissions } from "@constants";
import { SessionType } from "@types";

import { FeedbackDialog } from "..";
import { FeedbackSection, LoaderSkeleton } from "./components";
import { SimulationSummaryProps } from "./types";

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  isInSidebar = false,
  summaryId,
  onSummaryClose,
  onSummaryFetch,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [retryMaxReached, setRetryMaxReached] = useState<boolean>(false);

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
      if (summaryId && !summaryData?.details?.summary) {
        summaryPollingInterval = setInterval(async () => {
          pollCount++;
          const { data } = await getSimulationSummary(summaryId);

          if (data?.details?.summary?.feedback || pollCount >= maxPolls) {
            clearInterval(summaryPollingInterval);
            // TODO: Replace this hack once BE gives {} fr feedback
            if (pollCount >= maxPolls) {
              setRetryMaxReached(true);
              if (!data?.details?.summary?.feedback) {
                toast.error("Something went wrong. Please try again later.");
              }
            }
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
    <div
      className={`relative flex flex-col h-full w-full ${className}`}
      data-testid="simulation-summary"
    >
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1">
        {retryMaxReached || summary?.details?.summary?.feedback ? (
          <>
            <FeedbackSection {...summary} />
            {!isInSidebar && (
              <PermissionGuard requiredPermissions={[Permissions.EDIT_SCENARIO_SESSION]}>
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
              </PermissionGuard>
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
