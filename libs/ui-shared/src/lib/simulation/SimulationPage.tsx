"use client";

import { FC, useEffect, useRef, useState } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { BottomSection } from "./SimulationBottomSection";
import { SimulationInterface } from "./SimulationInterface";
import { SimulationScoreMeter } from "./SimulationScoreMeter";
import { SimulationPageProps, TriggerWarning } from "./types";
import { logger } from "../../logger";

enum MeetingSoundType {
  JOIN = "join",
  LEAVE = "leave",
}

const useMeetingSound = () => {
  useEffect(() => {
    const playSound = (type: MeetingSoundType) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);

        if (type === MeetingSoundType.JOIN) {
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(500, now);
          oscillator.frequency.setValueAtTime(800, now + 0.15);
          gainNode.gain.setValueAtTime(0.1, now + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          oscillator.start(now);
          oscillator.stop(now + 0.4);
        } else {
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.setValueAtTime(300, now + 0.15);
          gainNode.gain.setValueAtTime(0.1, now + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          oscillator.start(now);
          oscillator.stop(now + 0.4);
        }
      } catch {
        logger.error("Failed to play meeting sound");
      }
    };

    playSound(MeetingSoundType.JOIN);
    return () => {
      playSound(MeetingSoundType.LEAVE);
    };
  }, []);
};

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
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  if (!room) return null;

  useMeetingSound();
  useWakeLock(sessionId);

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
    await onEndSimulation?.();
  };

  const content = (
    <div
      data-testid="simulation-page"
      className="min-h-screen p-6 flex flex-col gap-6 justify-between items-center font-['IBM_Plex_Serif'] bg-[#171A1A]"
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
                <>
                  <div key={triggerWarning.id} className="text-white text-[12px] flex self-start">
                    {triggerWarning.name}
                  </div>
                  {index < triggerWarnings?.length - 1 && (
                    <div className="w-[5px] h-[5px] rounded-full bg-white" />
                  )}
                </>
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
    return <RoomContext.Provider value={room}>{content}</RoomContext.Provider>;
  }

  return content;
};
