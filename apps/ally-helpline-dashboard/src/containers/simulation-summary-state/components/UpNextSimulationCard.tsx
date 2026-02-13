import { useState } from "react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { ArrowDownFilled } from "@assets";
import { Button, ButtonVariant } from "@components";
import { useStartSimulation } from "@hooks";
import { GetUpComingSimulationResponse, PathwayScenarioStatus } from "@types";
import { isNonEmptyObject } from "@utils";

interface UpNextSimulationCardProps {
  data: GetUpComingSimulationResponse;
}

const ANIMATION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.8 },
};

export const UpNextSimulationCard = ({ data }: UpNextSimulationCardProps) => {
  const navigate = useNavigate();
  const { startSimulation, isStarting } = useStartSimulation({ isReplaceScreen: true });

  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(true);

  if (!isNonEmptyObject(data)) return null;

  const { upcomingScenario, currentSession } = data;
  const hasUpcomingScenario = isNonEmptyObject(upcomingScenario);
  const isPathwayCompleted = currentSession?.isScenarioPathSessionCompleted;
  const isCurrentScenarioCompleted =
    currentSession?.scenarioPathSessionItemStatus === PathwayScenarioStatus.COMPLETED;

  const handleStartNextSimulation = async () => {
    if (!hasUpcomingScenario) {
      toast.error("No upcoming simulation found");
      return;
    }

    await startSimulation({
      params: {
        scenarioId: Number(upcomingScenario.id),
        scenarioPathSessionItemId: upcomingScenario.scenarioPathSessionItemId,
      },
      metadata: {
        title: upcomingScenario.title,
        coverImageUrl: upcomingScenario.coverImageUrl,
      },
    });
  };

  const handleRetrySimulation = async () => {
    if (!isNonEmptyObject(currentSession)) return;

    await startSimulation({
      params: {
        scenarioId: Number(currentSession.scenarioId),
        scenarioPathSessionItemId: currentSession.scenarioPathSessionItemId,
      },
      metadata: {
        title: currentSession.title,
        coverImageUrl: currentSession.coverImageUrl,
      },
    });
  };

  const renderSessionGlimpse = () => {
    return (
      <div className="border border-[0.5px] border-[#C8C5D0] overflow-hidden mb-4">
        <div
          className="flex items-center py-2 px-4 bg-[#EDE7F680] cursor-pointer gap-2"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
        >
          <motion.div
            animate={{ rotate: isAccordionOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-typography-900"
          >
            <ArrowDownFilled className="w-2 h-2" />
          </motion.div>
          <span className="text-typography-900 font-base font-primary text-md">
            Session glimpse
          </span>
        </div>
        <motion.div
          initial={false}
          animate={{ height: isAccordionOpen ? "auto" : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="p-4 text-typography-700 text-base font-normal pt-2 bg-white">
            {currentSession?.sessionGlimpse}
          </div>
        </motion.div>
      </div>
    );
  };
  const handleBack = () => {
    navigate(-1);
  };

  const getActionButtonLabel = () => {
    if (isStarting) return "Starting...";
    return hasUpcomingScenario ? "Next" : "Retry";
  };

  const handleActionClick = hasUpcomingScenario ? handleStartNextSimulation : handleRetrySimulation;

  return (
    <div className="font-primary px-[15px] py-2">
      {currentSession?.sessionGlimpse && renderSessionGlimpse()}
      {!isCurrentScenarioCompleted ? (
        <>
          <div className="text-typography-900 text-base font-semibold mb-[8px]">All most there</div>
          <div className="text-typography-900 text-base font-normal mb-[20px]">
            You’re getting closer! You haven’t reached the required score or minimum time yet, but
            keep going and try again when you’re ready
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center mb-[20px]">
            {currentSession?.transitionMessageTitle?.length > 0 && (
              <div className="text-typography-900 text-base font-semibold">
                "{currentSession?.transitionMessageTitle}"
              </div>
            )}
            {currentSession?.transitionMessageContent?.length > 0 && (
              <div className="text-typography-700 text-base font-normal text-center">
                {currentSession?.transitionMessageContent}
              </div>
            )}
          </div>
        </>
      )}

      {hasUpcomingScenario && !isPathwayCompleted && (
        <div className="rounded-[8px] border border-border-light">
          <div className="flex p-4 gap-4 bg-background-secondary">
            <img
              src={upcomingScenario?.coverImageUrl}
              alt={upcomingScenario?.title}
              className="w-[120px] h-[60px] bg-secondary-100 object-cover rounded-[8px]"
            />
            <div className="flex flex-col justify-center">
              <div className="text-typography-800 text-sm font-tertiary">
                Simulation {upcomingScenario?.order}
              </div>
              <div className="text-typography-900 text-xl">{upcomingScenario?.title}</div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4">
            <div className="text-base text-typography-800 font-semibold">Scenario:</div>
            <div className="text-base text-typography-900 font-normal">
              {upcomingScenario?.description}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <motion.div
        {...ANIMATION_CONFIG}
        className="absolute bottom-5 left-0 right-0 z-10 max-w-full bg-white pt-[10px] px-[20px]"
      >
        {isPathwayCompleted ? (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleBack}
            className="w-full"
            disabled={isStarting}
          >
            Finish
          </Button>
        ) : (
          <div className="flex flex-row gap-4 w-full mx-auto">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleBack}
              className="w-[50%]"
              disabled={isStarting}
            >
              Back
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleActionClick}
              className="w-[50%]"
              disabled={isStarting}
            >
              {getActionButtonLabel()}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
