import { useEffect, useRef, useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared/logger";
import { useEndSimulationMutation } from "@api";
import { SimulationWarningIllustration, Warning } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import { ROUTES } from "@constants";
import { useLiveKitRoom } from "@hooks";
import { RoomStatus } from "@types";

import {
  SimulationControls,
  SimulationEvents,
  SimulationInterface,
  SimulationScoreMeter,
  SimulationTimer,
} from "./components";
import { getSimulationEvents } from "./utils";

export const Simulation = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [endSimulation, { isLoading: isEndSimulationLoading }] = useEndSimulationMutation();

  const { room, roomStatus, startTime, handleEndSession, events, score } = useLiveKitRoom();

  // Keep screen awake during an active simulation and handle tab visibility changes
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          logger.info("Wake Lock is active");
        }
      } catch (err) {
        logger.info(`Wake Lock request failed:${err}`);
      }
    };

    if (roomStatus === RoomStatus.CONNECTED && id) {
      requestWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && roomStatus === RoomStatus.CONNECTED && id) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            logger.info("Wake Lock reacquired");
          }
        } catch (err) {
          logger.info(`Error reacquiring Wake Lock:${err}`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current
          .release()
          .then(() => {
            wakeLockRef.current = null;
            logger.info("Wake Lock released");
          })
          .catch(err => logger.info(`Error releasing Wake Lock:${err}`));
      }
    };
  }, [roomStatus, id]);

  const onTimeLimitWarning = () => {
    setIsWarning(true);

    setTimeout(() => {
      setIsWarning(false);
    }, 10000);
  };

  const onWarningClose = () => {
    setIsWarning(false);
  };

  const onMuteSimulation = () => {
    setIsMuted(prev => {
      room.localParticipant.setMicrophoneEnabled(prev);
      return !prev;
    });
  };

  const onEndSimulation = async () => {
    handleEndSession();
    try {
      await endSimulation({ sessionId: id });
      logger.info(`Ended simulation for session: ${id}`);
      navigate(`${ROUTES.SIMULATION_SUMMARY}/${id}`, { replace: true });
    } catch (error) {
      logger.error(`Failed to end simulation: ${error}`);
    }
  };

  return (
    <RoomContext.Provider value={room}>
      <div className="min-h-screen p-6 flex flex-col gap-6 justify-between items-center bg-[#171A1A]">
        <motion.div layout className="max-h-[calc(100vh-170px)] w-full flex flex-1 gap-2">
          <SimulationInterface roomStatus={roomStatus} />
          <SimulationEvents events={getSimulationEvents(events)} />
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
            isEndingSession={isEndSimulationLoading}
            onEndSessionClick={onEndSimulation}
            onMuteClick={onMuteSimulation}
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
