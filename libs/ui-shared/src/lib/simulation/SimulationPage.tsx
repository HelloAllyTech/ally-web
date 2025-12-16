"use client";

import { FC, useEffect, useRef, useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { BottomSection } from "./SimulationBottomSection";
import { RoomStatus, SimulationInterface } from "./SimulationInterface";
import { SimulationScoreMeter } from "./SimulationScoreMeter";
import { SimulationPageProps, TriggerWarning } from "./types";
import { StartSimulation, EndSimulation } from "../../assets/audios";

const useWakeLock = (sessionId: string | undefined) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        toast.warning("Failed to request wake lock");
      }
    };

    if (sessionId) {
      requestWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && sessionId) {
        requestWakeLock();
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
};

export const SimulationPage: FC<SimulationPageProps> = ({
  room,
  roomData = {},
  roomStatus,
  sessionId,
  isEndingSession,
  startTime,
  events,
  score,
  isPreview = false,
  onEndSimulation,
  renderWarningDialog,
  renderFooter,
  endSessionButtonRef,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const endAudio = useRef<HTMLAudioElement | null>(new Audio(EndSimulation));
  const startAudio = useRef<HTMLAudioElement | null>(new Audio(StartSimulation));

  useWakeLock(sessionId);

  useEffect(() => {
    if (roomStatus === RoomStatus.CONNECTING) startAudio.current?.play();

    return () => {
      endAudio.current?.pause();
    };
  }, [roomStatus]);

  if (!roomData) return null;

  const { triggerWarnings = [], title } = roomData ?? {};

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
    endSessionButtonRef.current = true;
    endAudio.current?.play();
    setTimeout(async () => {
      await onEndSimulation?.();
    }, 1000);
  };

  const content = (
    <div
      data-testid="simulation-page"
      className="h-[100%] p-6 flex flex-col gap-6 justify-between items-center font-['IBM_Plex_Serif'] bg-[#171A1A]"
    >
      <div
        data-testid="simulation-page-header"
        className="flex justify-between w-full border-l border-l-3 border-blue-500 pl-2"
      >
        <div className="flex flex-col gap-1">
          <div
            data-testid="simulation-page-title"
            className="text-white text-[20px] flex self-start"
          >
            {title}
          </div>
          {triggerWarnings?.length > 0 && (
            <div
              data-testid="simulation-page-trigger-warnings"
              className="flex flex-wrap justify-start items-center gap-2 opacity-75"
            >
              {triggerWarnings?.map((triggerWarning: TriggerWarning, index: number) => (
                <span key={triggerWarning.id} className="flex items-center gap-2">
                  <span className="text-white text-[12px] flex self-start">
                    {triggerWarning.name}
                  </span>
                  {index < triggerWarnings?.length - 1 && (
                    <span className="w-[5px] h-[5px] rounded-full bg-white" />
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {isPreview && (
          <button
            data-testid="simulation-page-close-preview-button"
            className="text-blue-300 font-['Roboto']"
            onClick={handleEndSimulation}
          >
            Close Preview
          </button>
        )}
      </div>

      <motion.div layout className="max-h-[calc(100vh-170px)] w-full flex flex-1 gap-2">
        <SimulationInterface
          roomStatus={roomStatus}
          roomData={roomData}
          events={events}
          isMuted={isMuted}
          isFocusMode={isFocusMode}
        />
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
    return (
      <div className="h-[100vh] w-full bg-black">
        <RoomContext.Provider value={room}>{content}</RoomContext.Provider>
      </div>
    );
  }

  return content;
};
