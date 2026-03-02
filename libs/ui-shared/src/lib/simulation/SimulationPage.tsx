"use client";

import { FC, useCallback, useEffect, useRef, useState, useMemo } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { SessionGoalTimer } from "./SessionGoalTimer";
import { BottomSection } from "./SimulationBottomSection";
import { RoomStatus, SimulationInterface } from "./SimulationInterface";
import { SimulationScoreMeter } from "./SimulationScoreMeter";
import { SimulationPageProps, TriggerWarning, ChecklistMode } from "./types";
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
  detectedEventIds,
  score,
  isPreview = false,
  onEndSimulation,
  onStartClick,
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

  const handleStartClick = useCallback(() => {
    onStartClick?.();
  }, [onStartClick]);

  useEffect(() => {
    startAudio.current?.play();
    return () => {
      endAudio.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (roomStatus === RoomStatus.AGENT_JOINED) startAudio.current?.pause();
  }, [roomStatus]);

  if (!roomData) return null;

  const {
    triggerWarnings = [],
    title,
    experienceMode,
    checklistType,
    checklistEvents,
  } = roomData ?? {};

  const checklistMode: ChecklistMode = useMemo(() => {
    if (experienceMode !== "CHECKLIST") return ChecklistMode.OFF;
    return checklistType;
  }, [experienceMode, checklistType]);

  const checklistItems = useMemo(() => {
    if (checklistMode === ChecklistMode.OFF || !checklistEvents) return [];
    return checklistEvents;
  }, [checklistMode, checklistEvents]);

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
    await onEndSimulation?.();
  };

  const parseTimeValue = (timeStr: string): number => {
    if (!timeStr) return 600000; // default 10 minutes
    const parts = timeStr.split(":").map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  const maxTimeSeconds = parseTimeValue(roomData?.maxTimeValue);

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

      {roomData?.timerMode && startTime && (
        <SessionGoalTimer startTime={startTime} maxTimeSeconds={maxTimeSeconds} />
      )}

      <motion.div layout className="w-full flex flex-1 gap-2 min-h-0 overflow-hidden">
        <SimulationInterface
          roomStatus={roomStatus}
          roomData={roomData}
          events={events}
          detectedEventIds={detectedEventIds}
          isMuted={isMuted}
          isFocusMode={isFocusMode}
          checklistMode={checklistMode}
          checklistItems={checklistItems}
          onStartClick={onStartClick ? handleStartClick : undefined}
        />
      </motion.div>
      {roomData?.showScoreMeter && <SimulationScoreMeter score={score} />}

      <BottomSection
        isWarning={isWarning}
        onTimeLimitWarning={onTimeLimitWarning}
        onEndSimulation={handleEndSimulation}
        onMuteSimulation={onMuteSimulation}
        isMuted={isMuted}
        isEndingSession={isEndingSession}
        startTime={startTime}
        timeLimit={maxTimeSeconds}
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
