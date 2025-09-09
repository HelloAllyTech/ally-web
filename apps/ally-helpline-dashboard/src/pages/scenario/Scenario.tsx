import { FC, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { useCreateRoomMutation, useGetScenarioQuery } from "@api";
import { BackCircle } from "@assets";
import { LoginDialog, ScenarioDetailsCard } from "@components";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

import { dummyScenarios, learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  const id = Number(scenarioId);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  // TODO: Remove dummy data once API is implemented
  const scenario = dummyScenarios.find(scenario => scenario.id === id);

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

  const onStartSimulation = () => {
    const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    // const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);

    if (!accessToken) {
      setIsLoginDialogOpen(true);
      return;
    }

    // TODO: Implement API call to create room
    // TODO: Store room data in localStorage: LOCAL_STORAGE_KEYS.ROOM_DATA
    // TODO: Redirect to simulation page with room ID appended to the URL
    navigate(ROUTES.SIMULATION);
  };

  return (
    <AnimatePresence mode="wait">
      <div className="h-screen w-full flex justify-center items-center bg-white">
        {scenario && (
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
              onStart={onStartSimulation}
            />
          </motion.div>
        )}
        {/* TODO: Add temporary OTP input dialog when clicking on start simulation */}
        {/* {isCreatingRoom && renderSimulationLoading()} */}
        <LoginDialog
          isOpen={isLoginDialogOpen}
          onClose={() => setIsLoginDialogOpen(false)}
          onSuccess={() => setIsLoginDialogOpen(false)}
        />
      </div>
    </AnimatePresence>
  );
};
