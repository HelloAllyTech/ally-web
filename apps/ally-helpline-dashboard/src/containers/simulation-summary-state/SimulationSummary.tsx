import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useLazyGetUpComingSimulationQuery, useLazyGetSimulationSummaryQuery } from "@api";
import { Button, PermissionGuard } from "@components";
import { Permissions } from "@constants";
import { SessionType } from "@types";
import { isNonEmptyObject } from "@utils";

import { FeedbackDialog } from "..";
import { FeedbackSection, LoaderSkeleton, UpNextSimulationCard } from "./components";
import { SimulationSummaryProps } from "./types";

const EVENT_STATUS = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
};

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  isInSidebar = false,
  summaryId,
  onSummaryClose,
  onSummaryFetch,
  hideSection = false,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [retryMaxReached, setRetryMaxReached] = useState<boolean>(false);

  const [getSimulationSummary, { data: summary }] = useLazyGetSimulationSummaryQuery();
  const [getUpComingSimulation, { data: upComingSimulation }] = useLazyGetUpComingSimulationQuery();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let summaryPollCount = 0;
    let upcomingPollCount = 0;
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

    const pollUpComingSimulation = async () => {
      try {
        const { data } = await getUpComingSimulation(summaryId);
        if (
          data?.currentSession?.eventStatus !== EVENT_STATUS.COMPLETED &&
          upcomingPollCount < maxPolls &&
          isMounted
        ) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      } catch {
        logger.error("Polling error in upcoming simulation");
        if (isMounted && upcomingPollCount < maxPolls) {
          upcomingPollCount++;
          timeoutId = setTimeout(pollUpComingSimulation, 3500);
        }
      }
    };

    if (summaryId) pollSimulationSummary();
    if (summaryId && !isInSidebar) pollUpComingSimulation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [summaryId]);

  const onSubmit = () => {
    if (summary?.hasFeedback || isInSidebar) {
      onSummaryClose();
    } else {
      setShowFeedbackDialog(true);
    }
  };

  if (hideSection) return null;
  return (
    <div
      className={`relative flex flex-col h-full w-full ${className}`}
      data-testid="simulation-summary"
    >
      <div className="flex flex-col gap-6 overflow-y-auto pb-20 flex-1 w-full custom-scrollbar px-[10px]">
        {retryMaxReached || summary?.details?.summary?.feedback ? (
          <>
            <FeedbackSection {...summary} />
            {!isInSidebar && (
              <PermissionGuard requiredPermissions={[Permissions.EDIT_SCENARIO_SESSION]}>
                <UpNextSimulationCard data={upComingSimulation} />
                {!isNonEmptyObject(upComingSimulation) && (
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
