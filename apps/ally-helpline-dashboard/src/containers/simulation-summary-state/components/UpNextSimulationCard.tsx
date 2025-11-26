import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button, ButtonVariant } from "@components";
import { useStartSimulation } from "@hooks";
import { GetUpComingSimulationResponse, PathwayScenarioStatus } from "@types";
import { isNonEmptyObject } from "@utils";

export const UpNextSimulationCard = ({ data }: { data: GetUpComingSimulationResponse }) => {
  if (!isNonEmptyObject(data)) return null;

  const { upcomingScenario, currentSession } = data || {};

  const { coverImageUrl, title, order, description, scenarioPathSessionItemId, id } =
    upcomingScenario || {};
  const {
    transitionMessageTitle,
    transitionMessageContent,
    scenarioPathSessionItemId: currentScenarioPathSessionItemId,
    scenarioId,
    coverImageUrl: currentCoverImageUrl,
    title: currentTitle,
  } = currentSession || {};

  const navigate = useNavigate();
  const { startSimulation, isStarting } = useStartSimulation();

  const onNext = async () => {
    if (isNonEmptyObject(upcomingScenario)) {
      await startSimulation({
        params: {
          scenarioId: Number(id),
          scenarioPathSessionItemId: scenarioPathSessionItemId,
        },
        metadata: {
          title: title,
          coverImageUrl: coverImageUrl,
        },
      });
    } else {
      toast.error("No upcoming simulation found");
    }
  };

  const retrySimulation = async () => {
    if (isNonEmptyObject(currentSession)) {
      await startSimulation({
        params: {
          scenarioId: Number(scenarioId),
          scenarioPathSessionItemId: currentScenarioPathSessionItemId,
        },
        metadata: {
          title: currentTitle,
          coverImageUrl: currentCoverImageUrl,
        },
      });
    }
  };

  const onBack = () => {
    navigate(-1);
  };

  return (
    <div className="font-primary">
      <div className="text-typography-900 text-base font-semibold mb-[8px]">
        {transitionMessageTitle}
      </div>
      <div className="text-typography-900 text-base font-normal mb-[20px]">
        {transitionMessageContent}
      </div>
      <div className="rounded-[8px] border border-border-light">
        <div className="flex p-4 gap-4 bg-background-secondary">
          <img
            src={coverImageUrl}
            alt={title}
            className="w-[120px] h-[60px] bg-secondary-100 object-cover rounded-[8px]"
          />
          <div className="flex flex-col justify-center">
            <div className="text-typography-800 text-sm font-tertiary">
              Up next - Simulation {order}
            </div>
            <div className="text-typography-900 text-xl">{title}</div>
          </div>
        </div>

        <div className="p-4">
          {/* Scenario Label */}
          <div className="text-base text-typography-800 font-semibold">Scenario:</div>

          {/* Scenario Description */}
          <div className="text-base text-typography-900 font-normal">{description}</div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="absolute bottom-0 left-4 right-4 z-10 max-w-full bg-white"
      >
        {currentSession?.scenarioPathSessionStatus === PathwayScenarioStatus.COMPLETED ? (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={onBack}
            className="w-full"
            disabled={isStarting}
          >
            Finish
          </Button>
        ) : (
          <div className="flex flex-row gap-4 w-full mx-auto">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={onBack}
              className="w-[50%]"
              disabled={isStarting}
            >
              Back
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={isNonEmptyObject(upcomingScenario) ? onNext : retrySimulation}
              className="w-[50%]"
              disabled={isStarting}
            >
              {isStarting ? "Starting..." : isNonEmptyObject(upcomingScenario) ? "Next" : "Retry"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
