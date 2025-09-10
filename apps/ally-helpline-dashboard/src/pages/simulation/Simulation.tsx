import { useEffect, useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { SimulationWarningIllustration, Warning } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks";

import {
  SimulationEventType,
  SimulationControls,
  SimulationEvents,
  SimulationInterface,
  SimulationScoreMeter,
  SimulationTimer,
} from "./components";
import { getSimulationEvent } from "./utils";

export const Simulation = () => {
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [events, setEvents] = useState<SimulationEventType[]>([]);
  const [score, setScore] = useState<number>(0);

  const { room, roomStatus, error, startTime, handleEndSession, handleRetryConnection } =
    useLiveKitRoom();

  // TODO: update this useEffect after LiveKit event logic is implemented
  useEffect(() => {
    const id = setInterval(() => {
      const incoming = {
        version: "1.0",
        data: {
          score: Math.floor(Math.random() * 21) - 10,
          emoji: ":D",
          message: "Good Job!",
        },
        timestamp: new Date().toISOString(),
      };
      const mappedEvent = getSimulationEvent(incoming);
      setEvents(prev => [...prev, mappedEvent]);
      setScore(prev => prev + (mappedEvent.score ?? 0));
    }, 4000);
    return () => clearInterval(id);
  }, []);

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
        <motion.div layout className="max-h-[calc(100vh-170px)] w-full flex flex-1 gap-2">
          <SimulationInterface roomStatus={roomStatus} />
          <SimulationEvents events={events} />
        </motion.div>
        <SimulationScoreMeter score={score} />
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
