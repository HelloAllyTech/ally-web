import { FC, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { useGetScenarioQuery, useStartSimulationMutation } from "@api";
import { BackCircle } from "@assets";
import { LoginDialog, ScenarioDetailsCard } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

import { learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  const id = Number(scenarioId);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const { data: scenario, isLoading: isScenarioLoading } = useGetScenarioQuery({ scenarioId: id });
  const [startSimulation, { isLoading: isStartingSimulation }] = useStartSimulationMutation();

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
    const { data } = await startSimulation({ scenarioId: id });

    if (data) {
      const { scenarioSession, accessToken } = data;
      // Store room data in localStorage
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ROOM_DATA,
        JSON.stringify({
          roomId: scenarioSession.id,
          coverImageUrl: scenario?.coverImageUrl,
          accessToken: accessToken.token,
          createdAt: scenarioSession.startedAt,
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

  // TODO: Add loading fallback UI for scenario
  // TODO: Add loading fallback UI for starting simulation

  return (
    <AnimatePresence mode="wait">
      <div className="h-screen w-full flex justify-center items-center bg-white">
        {scenario && !isScenarioLoading && (
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
              title={scenario?.title || ""}
              description={scenario?.scenario || ""}
              longDescription={scenario?.description || ""}
              onStart={onStartSimulationClick}
            />
          </motion.div>
        )}
        <LoginDialog
          isOpen={isLoginDialogOpen}
          onClose={() => setIsLoginDialogOpen(false)}
          onSuccess={handleStartSimulation}
        />
      </div>
    </AnimatePresence>
  );
};
