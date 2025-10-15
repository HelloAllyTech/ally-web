import { FC, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useEndSimulationMutation, useGetScenarioQuery, useStartSimulationMutation } from "@api";
import { BackCircle, ExistingCall, PageNotFoundIllustration } from "@assets";
import {
  LoginDialog,
  ScenarioDetailsCard,
  ConfirmationDialog,
  ButtonVariant,
  FallbackUI,
} from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

import { learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  const id = Number(scenarioId);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState<boolean>(false);
  const [isExistingSimulationConfirmOpen, setIsExistingSimulationConfirmOpen] =
    useState<boolean>(false);

  const {
    data: scenario,
    isSuccess: isScenarioSuccess,
    isLoading: isScenarioLoading,
  } = useGetScenarioQuery({ scenarioId: id });
  const [endSimulation] = useEndSimulationMutation();
  const [startSimulation, { isLoading: isStartingSimulation, error: startSimulationError }] =
    useStartSimulationMutation();

  const renderBackButton = () => {
    return (
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        onClick={() => navigate(ROUTES.LEARN)}
        className="hover:scale-105 transition-transform"
        aria-label="Close scenario details"
      >
        <BackCircle />
      </motion.button>
    );
  };

  const handleStartSimulation = async () => {
    setIsLoginDialogOpen(false);

    const { data, error } = await startSimulation({ scenarioId: id });
    if (error) {
      const errorData = error as { data?: { statusCode?: number; entityId?: string } };
      if (errorData.data?.statusCode === 403) {
        toast.error("You are not authorized to start this simulation");
      } else if (errorData.data?.statusCode === 400 && errorData?.data?.entityId) {
        setIsExistingSimulationConfirmOpen(true);
      }
      return;
    }

    if (data) {
      const { scenarioSession, accessToken } = data;
      // Store room data in localStorage
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ROOM_DATA,
        JSON.stringify({
          roomId: scenarioSession.id,
          name: scenario?.title,
          coverImageUrl: scenario?.coverImageUrl,
          accessToken: accessToken.token,
          createdAt: scenarioSession.startedAt,
          serverUrl: accessToken.serverUrl,
        }),
      );
      navigate(`/simulation/${scenarioSession.id}`);
    }
  };

  const onStartSimulationClick = () => {
    // TODO: update authorization check
    const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);

    if (!accessToken) {
      // TODO: Retest login through dialog
      setIsLoginDialogOpen(true);
      return;
    } else {
      handleStartSimulation();
    }
  };

  const endExistingSimulation = async () => {
    if (startSimulationError && "data" in startSimulationError) {
      const errorData = startSimulationError.data as { entityId?: string };
      if (errorData.entityId) {
        await endSimulation({ sessionId: errorData.entityId });
        toast.success("Simulation ended successfully");
        setIsExistingSimulationConfirmOpen(false);
        return;
      }
    }
    toast.error("Something went wrong!");
    setIsExistingSimulationConfirmOpen(false);
  };

  const onSecondaryButtonClick = () => {
    setIsExistingSimulationConfirmOpen(false);
  };

  // TODO: Add loading fallback UI for scenario

  return (
    <AnimatePresence mode="wait">
      <div className="h-screen w-full flex justify-center items-center bg-white">
        {scenario && isScenarioSuccess ? (
          <motion.div
            variants={learnPageExpandedVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col gap-6 max-w-[70%] m-auto"
          >
            <div className="flex items-center gap-2 font-['Replay_Pro'] text-[28px]">
              {renderBackButton()}
              <span>Start</span>
              <span className="font-bold italic"> Simulation</span>
            </div>
            <ScenarioDetailsCard
              coverImage={scenario?.coverImageUrl || ""}
              isStarting={isStartingSimulation}
              title={scenario?.title || ""}
              longDescription={scenario?.description || ""}
              onStart={onStartSimulationClick}
            />
          </motion.div>
        ) : (
          <FallbackUI
            icon={<PageNotFoundIllustration />}
            isLoading={isScenarioLoading}
            mainMessage="Scenario not found"
            description="The scenario you are looking for does not exist."
            button={{
              text: "Go back",
              onClick: () => navigate(ROUTES.LEARN),
            }}
          />
        )}
        <LoginDialog
          isOpen={isLoginDialogOpen}
          onClose={() => setIsLoginDialogOpen(false)}
          onSuccess={handleStartSimulation}
        />
        <ConfirmationDialog
          title={{ normal: "Active Simulation ", italic: "Detected" }}
          isOpen={isExistingSimulationConfirmOpen}
          onClose={() => setIsExistingSimulationConfirmOpen(false)}
          content="You have a running simulation. End the existing session to start a new one."
          buttonVariant={ButtonVariant.PRIMARY}
          onButtonClick={endExistingSimulation}
          buttonText="End session"
          secondaryButtonText="Cancel"
          onSecondaryButtonClick={onSecondaryButtonClick}
          icon={ExistingCall}
        />
      </div>
    </AnimatePresence>
  );
};
