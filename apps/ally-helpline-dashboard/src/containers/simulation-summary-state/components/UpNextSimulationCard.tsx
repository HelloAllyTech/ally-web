import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  const handleBack = () => {
    navigate(-1);
  };

  const getActionButtonLabel = () => {
    if (isStarting) return "Starting...";
    return hasUpcomingScenario ? "Next" : "Retry";
  };

  const handleActionClick = hasUpcomingScenario ? handleStartNextSimulation : handleRetrySimulation;

  return (
    <div className="font-primary px-[15px]">
      {!isCurrentScenarioCompleted ? (
        <>
          <div className="text-typography-900 text-base font-semibold mb-[8px]">All most there</div>
          <div className="text-typography-900 text-base font-normal mb-[20px]">
            You didn’t meet the benchmark score or minimum time yet, but you’re improving. Try again
            when you’re ready
          </div>
        </>
      ) : (
        <>
          {currentSession?.transitionMessageTitle?.length > 0 && (
            <div className="text-typography-900 text-base font-semibold mb-[8px]">
              {currentSession?.transitionMessageTitle}
            </div>
          )}
          {currentSession?.transitionMessageContent?.length > 0 && (
            <div className="text-typography-900 text-base font-normal mb-[20px]">
              {currentSession?.transitionMessageContent}
            </div>
          )}
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
                Up next - Simulation {upcomingScenario?.order}
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
        className="absolute bottom-0 left-0 right-0 z-10 max-w-full bg-white pt-[10px] px-[20px]"
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
