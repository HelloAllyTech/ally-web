"use client";

import { FC, useEffect, useRef, useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { BottomSection } from "./SimulationBottomSection";
import { SimulationEvents } from "./SimulationEvents";
import { SimulationInterface } from "./SimulationInterface";
import { SimulationScoreMeter } from "./SimulationScoreMeter";
import { SimulationPageProps } from "./types";

export const SimulationPage: FC<SimulationPageProps> = ({
  room,
  roomData,
  roomStatus,
  sessionId,
  isEndingSession,
  startTime,
  events,
  score,
  title,
  onEndSimulation,
  renderWarningDialog,
  renderFooter,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        toast.error("Failed to request wake lock");
      }
    };

    if (sessionId) {
      requestWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && sessionId) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          }
        } catch {
          toast.error("Failed to request wake lock");
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
          })
          .catch(() => {});
      }
    };
  }, [sessionId]);

  const onTimeLimitWarning = () => {
    setIsWarning(true);
    setTimeout(() => setIsWarning(false), 10000);
  };

  const onWarningClose = () => setIsWarning(false);

  const onMuteSimulation = () => {
    setIsMuted(prev => {
      try {
        room?.localParticipant?.setMicrophoneEnabled?.(prev);
      } catch {
        toast.error("Failed to mute simulation");
      }
      return !prev;
    });
  };

  const onFocusButtonClick = () => {
    setIsFocusMode(prev => !prev);
  };

  const handleEndSimulation = async () => {
    await onEndSimulation?.();
  };

  const content = (
    <div className="min-h-screen p-6 flex flex-col gap-6 justify-between items-center font-primary bg-[#171A1A]">
      {title && (
        <div className="flex justify-between w-full">
          <div className="text-white text-[24px] flex self-start">{title}</div>
          <button className="text-primary-300 font-tertiary" onClick={handleEndSimulation}>
            Close Preview
          </button>
        </div>
      )}
      <motion.div layout className="max-h-[calc(100vh-170px)] w-full flex flex-1 gap-2">
        <SimulationInterface roomStatus={roomStatus} roomData={roomData} />
        {!isFocusMode && <SimulationEvents events={events} />}
      </motion.div>
      <SimulationScoreMeter score={score} />

      <BottomSection
        isWarning={isWarning}
        onTimeLimitWarning={onTimeLimitWarning}
        onEndSimulation={handleEndSimulation}
        onMuteSimulation={onMuteSimulation}
        isMuted={isMuted}
        isEndingSession={isEndingSession}
        startTime={startTime}
        isFocusMode={isFocusMode}
        onFocusButtonClick={onFocusButtonClick}
      />

      {renderFooter?.()}

      {renderWarningDialog({
        isOpen: isWarning,
        onClose: onWarningClose,
        onContinue: onWarningClose,
        onEnd: handleEndSimulation,
      })}
    </div>
  );

  if (room) {
    return <RoomContext.Provider value={room}>{content}</RoomContext.Provider>;
  }

  return content;
};
