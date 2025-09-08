import { useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { useNavigate } from "react-router-dom";

import { SimulationWarningIllustration, Warning } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks";

import {
  SimulationControls,
  SimulationInterface,
  SimulationScoreMeter,
  SimulationTimer,
} from "./components";

export const Simulation = () => {
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  const { room, roomStatus, error, startTime, handleEndSession, handleRetryConnection } =
    useLiveKitRoom();

  const onTimeLimitWarning = () => {
    setIsWarning(true);

    setTimeout(() => {
      setIsWarning(false);
    }, 10000);
  };

  const onWarningClose = () => {
    setIsWarning(false);
  };

  const onEndSimulation = () => {
    handleEndSession();
    navigate(ROUTES.SIMULATION_SUMMARY, { replace: true });
  };

  return (
    <RoomContext.Provider value={room}>
      <div className="min-h-screen p-6 flex flex-col gap-6 justify-between items-center bg-[#171A1A]">
        <SimulationInterface roomStatus={roomStatus} />
        <SimulationScoreMeter />
        <div className="w-full flex justify-between items-center">
          <SimulationTimer
            isWarning={isWarning}
            onWarning={onTimeLimitWarning}
            onTimeLimit={onEndSimulation}
            startTime={startTime.toString()}
          />
          <SimulationControls
            isMuted={isMuted}
            isEndSessionDisabled={false}
            onEndSessionClick={onEndSimulation}
            onMuteClick={() => setIsMuted(prev => !prev)}
          />
          <div className="flex items-center gap-2">
            <Warning className="[&_path]:fill-[#B6B5B9]" />
            <span className="text-[12px] text-[#fff] font-['Roboto']">Your data is safe</span>
          </div>
        </div>

        {/* Warning dialog 30 seconds before session ends */}
        <ConfirmationDialog
          isOpen={isWarning}
          onClose={onWarningClose}
          title={{ normal: "Session", italic: "Ending Soon" }}
          content="Your session will end in 30 seconds."
          buttonText="Continue Session"
          buttonVariant={ButtonVariant.PRIMARY}
          icon={SimulationWarningIllustration}
          onButtonClick={onWarningClose}
          secondaryButtonText="End Session"
          onSecondaryButtonClick={onEndSimulation}
        />

        {/* TODO: Add error modal (network error) here if needed: with retry and exit buttons */}
      </div>
    </RoomContext.Provider>
  );
};
