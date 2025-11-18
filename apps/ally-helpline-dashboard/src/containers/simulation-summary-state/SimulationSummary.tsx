import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { toast } from "sonner";

import { useLazyGetSimulationSummaryQuery } from "@api";
import { Button, PermissionGuard } from "@components";
import { Permissions } from "@constants";
import { SessionType } from "@types";

import { FeedbackDialog } from "..";
import { FeedbackSection, LoaderSkeleton, UpNextSimulationCard } from "./components";
import { SimulationSummaryProps } from "./types";

export const SimulationSummary: FC<SimulationSummaryProps> = ({
  className,
  isInSidebar = false,
  isFromSimulationPathway = true,
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

  const renderNextSimulationDetails = () => {
    return (
      <div className="px-4">
        <div className="text-typography-900 text-base font-semibold mb-[8px]">
          Keep building on your empathy and presence.
        </div>
        <div className="text-typography-900 text-base font-normal mb-[8px]">
          This session reflected your growing ability to stay calm and connected even when the
          client expressed hopelessness. Maintaining composure helped create a safe space for
          reflection, but allowing a bit more silence could deepen trust further
        </div>
        <UpNextSimulationCard
          simulationNumber={2}
          title="Hopeless Male, 40"
          scenario="A 40-year-old male is experiencing deep hopelessness.He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope."
          coverImage="https://via.placeholder.com/120"
        />
      </div>
    );
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
            {isFromSimulationPathway && renderNextSimulationDetails()}
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
