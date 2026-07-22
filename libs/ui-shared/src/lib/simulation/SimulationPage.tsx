"use client";

import { FC, useEffect, useRef, useState, useMemo } from "react";

import { RoomContext } from "@livekit/components-react";
import { motion } from "framer-motion";
import { RoomEvent } from "livekit-client";
import { toast } from "sonner";

import { SessionTimeBar } from "./SessionTimeBar";
import { BottomSection } from "./SimulationBottomSection";
import { RoomStatus, SimulationInterface } from "./SimulationInterface";
import { SimulationScoreMeter } from "./SimulationScoreMeter";
import { SimulationPageProps, TriggerWarning, ChecklistMode } from "./types";
import { StartSimulation, EndSimulation } from "../../assets/audios";
const MICROPHONE_STATE = {
  GRANTED: "granted",
  DENIED: "denied",
  PROMPTED: "prompted",
};

// Pause/resume control-channel message types (single source to avoid typo drift
// against the agent). Client → agent: PAUSE/RESUME. Agent → client: the rest.
const SIM_CONTROL = {
  PAUSE: "pause",
  RESUME: "resume",
  PAUSED: "paused",
  RESUMED: "resumed",
  CAP_WARNING: "cap-warning",
  CAP_ENDED: "cap-ended",
} as const;

// If the agent doesn't ack a pause/resume within this window, assume the
// control packet didn't land and revert the optimistic UI.
const CONTROL_ACK_TIMEOUT_MS = 2500;

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
  renderWarningDialog,
  renderFooter,
  endSessionButtonRef,
  stateNames = [],
  difficultyLevel = "",
  translations,
  agentTurnStatus,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState(MICROPHONE_STATE.GRANTED);
  // Pause/resume: paused time is excluded from the displayed timer and the
  // scenario time limit. `pausedOffsetMs` accumulates completed pauses.
  // NOTE: this is the CLIENT-side clock and drives the scenario time-limit
  // only. Billing/leaderboard paused-time is tracked independently and
  // authoritatively on the server (scenario_sessions.totalPausedMs, set from
  // the agent's SQS events). The two are intentionally separate — don't try to
  // "unify" them; they serve different surfaces and sources of truth.
  const [isPaused, setIsPaused] = useState(false);
  const [pausedOffsetMs, setPausedOffsetMs] = useState(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  // Tracks an in-flight pause/resume awaiting the agent's ack, with a revert.
  const pendingControlRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    revert: () => void;
  } | null>(null);
  // Current state mirrored into refs so the once-registered data listener can
  // reconcile the UI to the agent's authoritative ack without stale closures.
  const isPausedRef = useRef(isPaused);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isPausedRef.current = isPaused;
    isMutedRef.current = isMuted;
  });

  const endAudio = useRef<HTMLAudioElement | null>(new Audio(EndSimulation));
  const startAudio = useRef<HTMLAudioElement | null>(new Audio(StartSimulation));

  useWakeLock(sessionId);

  useEffect(() => {
    startAudio.current?.play();

    const checkMicrophonePermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setMicrophonePermission(permissionStatus.state);

          permissionStatus.onchange = () => {
            setMicrophonePermission(permissionStatus.state);
          };
        }
      } catch {
        toast.error("Failed to check microphone permission");
      }
    };

    checkMicrophonePermission();

    return () => {
      endAudio.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (roomStatus === RoomStatus.AGENT_JOINED) startAudio.current?.pause();
  }, [roomStatus]);

  // Listen for the agent's pause/resume control acks. 'cap-warning' warns
  // before auto-end; 'paused'/'resumed'/'cap-ended' need no extra UI here
  // ('cap-ended' is followed by room teardown which ends the session).
  useEffect(() => {
    if (!room) return undefined;
    const onData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        // Agent confirmed the pause/resume — cancel the revert timer and treat
        // the ack as AUTHORITATIVE: reconcile the UI to it. This self-heals a
        // late ack that arrived after the optimistic revert (client and agent
        // can't silently diverge).
        if (msg?.type === SIM_CONTROL.PAUSED || msg?.type === SIM_CONTROL.RESUMED) {
          if (pendingControlRef.current) {
            clearTimeout(pendingControlRef.current.timer);
            pendingControlRef.current = null;
          }
          const agentPaused = msg.type === SIM_CONTROL.PAUSED;
          if (agentPaused && !isPausedRef.current) {
            // We're showing running but the agent is paused → freeze to match.
            pauseStartedAtRef.current = pauseStartedAtRef.current ?? Date.now();
            setIsPaused(true);
            try {
              room?.localParticipant?.setMicrophoneEnabled?.(false);
            } catch {
              /* best-effort */
            }
          } else if (!agentPaused && isPausedRef.current) {
            // We're showing paused but the agent resumed → unfreeze to match.
            if (pauseStartedAtRef.current !== null) {
              const banked = Date.now() - pauseStartedAtRef.current;
              setPausedOffsetMs(prev => prev + banked);
              pauseStartedAtRef.current = null;
            }
            setIsPaused(false);
            try {
              room?.localParticipant?.setMicrophoneEnabled?.(!isMutedRef.current);
            } catch {
              /* best-effort */
            }
          }
          return;
        }
        if (msg?.type === SIM_CONTROL.CAP_WARNING) {
          setIsWarning(true);
          setTimeout(() => setIsWarning(false), 10000);
        }
      } catch {
        // non-JSON / unrelated packet — ignore
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  // Clear any pending control-ack timer on unmount.
  useEffect(
    () => () => {
      if (pendingControlRef.current) clearTimeout(pendingControlRef.current.timer);
    },
    [],
  );

  const onEnableMicrophone = async () => {
    try {
      // Request microphone access - this triggers the browser's native permission popup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      setMicrophonePermission(MICROPHONE_STATE.GRANTED);
    } catch {
      setMicrophonePermission(MICROPHONE_STATE.DENIED);
    }
  };

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

  const setMic = (enabled: boolean) => {
    try {
      room?.localParticipant?.setMicrophoneEnabled?.(enabled);
    } catch {
      /* best-effort */
    }
  };

  // Send a control packet to the agent. The agent freezes/unfreezes audio +
  // brain and reports paused time to the backend.
  const publishControl = (type: typeof SIM_CONTROL.PAUSE | typeof SIM_CONTROL.RESUME) => {
    try {
      room?.localParticipant?.publishData?.(new TextEncoder().encode(JSON.stringify({ type })), {
        reliable: true,
      });
    } catch {
      toast.error(
        translations?.pauseControlError ?? "Couldn't reach the session — please try again",
      );
    }
  };

  // Arm a revert timer: if the agent doesn't ack within the window, undo the
  // optimistic UI so the client can't silently diverge from the agent/backend.
  const armControlAck = (revert: () => void) => {
    if (pendingControlRef.current) clearTimeout(pendingControlRef.current.timer);
    const timer = setTimeout(() => {
      pendingControlRef.current = null;
      revert();
      toast.error(
        translations?.pauseControlError ?? "Couldn't reach the session — please try again",
      );
    }, CONTROL_ACK_TIMEOUT_MS);
    pendingControlRef.current = { timer, revert };
  };

  const onTogglePause = () => {
    if (!isPaused) {
      // Pause: stop publishing the mic (genuinely not recorded — no glow, no
      // audio leaves the device), freeze the clock locally (drives the scenario
      // time-limit), and signal the agent.
      const revert = () => {
        pauseStartedAtRef.current = null;
        setIsPaused(false);
        setMic(!isMuted);
      };
      setMic(false);
      pauseStartedAtRef.current = Date.now();
      setIsPaused(true);
      publishControl(SIM_CONTROL.PAUSE);
      armControlAck(revert);
    } else {
      // Resume: restore the mic to its pre-pause state, bank the paused
      // interval, then signal the agent.
      const pausedAt = pauseStartedAtRef.current;
      const prevOffset = pausedOffsetMs;
      const revert = () => {
        // Resume didn't take — return to the paused state.
        setPausedOffsetMs(prevOffset);
        pauseStartedAtRef.current = pausedAt ?? Date.now();
        setIsPaused(true);
        setMic(false);
      };
      setMic(!isMuted);
      if (pausedAt !== null) {
        setPausedOffsetMs(prev => prev + (Date.now() - pausedAt));
        pauseStartedAtRef.current = null;
      }
      setIsPaused(false);
      setIsWarning(false);
      publishControl(SIM_CONTROL.RESUME);
      armControlAck(revert);
    }
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
      className="h-[100%] p-3 sm:p-6 flex flex-col gap-3 sm:gap-6 justify-between items-center font-['IBM_Plex_Serif'] bg-[#171A1A]"
    >
      <div
        data-testid="simulation-page-header"
        className="flex flex-wrap justify-between gap-y-1 w-full border-l border-l-3 border-primary-500 pl-2"
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div
            data-testid="simulation-page-title"
            className="text-white text-[16px] sm:text-[20px] flex self-start"
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
        <div className="flex items-center gap-3">
          <SessionTimeBar
            startTime={startTime}
            maxTimeSeconds={roomData?.timerMode ? maxTimeSeconds : undefined}
            isPaused={isPaused}
            pausedOffsetMs={pausedOffsetMs}
          />
          {isPreview && (
            <button
              data-testid="simulation-page-close-preview-button"
              className="text-primary-300 font-['Roboto']"
              onClick={handleEndSimulation}
            >
              {translations?.closePreview ?? "Close Preview"}
            </button>
          )}
        </div>
      </div>

      <motion.div layout className="w-full flex flex-1 gap-2 min-h-0 overflow-hidden">
        <SimulationInterface
          roomStatus={roomStatus}
          roomData={roomData}
          events={events}
          detectedEventIds={detectedEventIds}
          isMuted={isMuted}
          isFocusMode={isFocusMode}
          isPaused={isPaused}
          pausedOffsetMs={pausedOffsetMs}
          checklistMode={checklistMode}
          agentTurnStatus={agentTurnStatus} // ← add this
          checklistItems={checklistItems}
          isMicrophoneGranted={microphonePermission === MICROPHONE_STATE.GRANTED}
          onEnableMicrophone={onEnableMicrophone}
          score={score}
          stateNames={stateNames}
          difficultyLevel={difficultyLevel}
          startTime={startTime}
          maxTimeSeconds={maxTimeSeconds}
          translations={translations}
        />
      </motion.div>
      {roomData?.showScoreMeter && (
        <SimulationScoreMeter score={score} translations={translations} />
      )}

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
        showFocusButton={experienceMode !== "NONE"}
        onFocusButtonClick={onFocusButtonClick}
        isPaused={isPaused}
        pausedOffsetMs={pausedOffsetMs}
        // Show the pause control only when: it is a real billed session (not
        // admin preview) AND the scenario has pause explicitly enabled. Opt-in
        // default — only an explicit `true` shows it (missing/false → hidden).
        onPauseClick={!isPreview && roomData?.pauseEnabled === true ? onTogglePause : undefined}
        translations={translations}
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
      <div className="h-[100dvh] w-full bg-black">
        <RoomContext.Provider value={room}>{content}</RoomContext.Provider>
      </div>
    );
  }

  return content;
};
