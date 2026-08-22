"use client";

import { FC, useEffect, useRef, useState, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";

import { SessionSidebar } from "./SessionSidebar";
import { TurnState } from "./TurnIndicator";
import {
  SimulationEventType,
  ChecklistItem,
  ChecklistMode,
  StateInstruction,
  SimulationTranslations,
  SupervisorNoteType,
} from "./types";
import { UserCallCard } from "./UserCallCard";
import { FEATURE_FLAGS_MAP } from "../../featureFlag";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
  AGENT_JOINED = "agent_joined",
}

// Visual 3-2-1 countdown shown the moment this component mounts, matching the
// start-simulation audio cue which also starts unconditionally on mount
// (SimulationPage.tsx). One second per number, fixed length regardless of how
// long the room actually takes to connect — see COUNTDOWN_STEPS below.
const COUNTDOWN_STEPS = [3, 2, 1] as const;
const COUNTDOWN_STEP_MS = 1000;

export type AgentTurnStatus = "thinking" | "speaking" | "user_turn";

export interface SimulationInterfaceProps {
  roomStatus: RoomStatus;
  roomData: any;
  events: SimulationEventType[];
  detectedEventIds?: string[];
  supervisorNotes?: SupervisorNoteType[];
  supervisorNotesEnabled?: boolean;
  isFocusMode: boolean;
  isMuted: boolean;
  isPaused?: boolean;
  pausedOffsetMs?: number;
  checklistMode?: ChecklistMode;
  checklistItems?: ChecklistItem[];
  isMicrophoneGranted: boolean;
  onEnableMicrophone: () => void;
  agentTurnStatus?: AgentTurnStatus;
  score?: number;
  stateNames?: StateInstruction[];
  difficultyLevel?: string;
  startTime?: string;
  maxTimeSeconds?: number;
  translations?: SimulationTranslations;
}

export const SimulationInterface: FC<SimulationInterfaceProps> = ({
  roomStatus,
  roomData,
  events,
  detectedEventIds,
  supervisorNotes = [],
  supervisorNotesEnabled = false,
  isFocusMode,
  isMuted,
  isPaused = false,
  pausedOffsetMs = 0,
  checklistMode = ChecklistMode.OFF,
  checklistItems = [],
  isMicrophoneGranted,
  onEnableMicrophone,
  agentTurnStatus,
  score = 0,
  stateNames = [],
  difficultyLevel = "",
  startTime,
  maxTimeSeconds,
  translations,
}) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants?.[0];

  // `null` once the countdown has finished. Runs once on mount, unconditional
  // of connection/microphone state — same trigger as the audio cue — and
  // gates the switch into the live call UI below so the learner is never
  // shown (or expected to respond to) the agent before it completes, even if
  // the agent joins and starts speaking faster than 3 seconds.
  const [countdownStep, setCountdownStep] = useState<(typeof COUNTDOWN_STEPS)[number] | null>(
    COUNTDOWN_STEPS[0],
  );

  useEffect(() => {
    const timers = COUNTDOWN_STEPS.slice(1).map((step, index) =>
      setTimeout(() => setCountdownStep(step), (index + 1) * COUNTDOWN_STEP_MS),
    );
    timers.push(
      setTimeout(() => setCountdownStep(null), COUNTDOWN_STEPS.length * COUNTDOWN_STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const isCountingDown = countdownStep !== null;

  // Debounce remote speaking to avoid flickering on natural pauses
  const [debouncedRemoteSpeaking, setDebouncedRemoteSpeaking] = useState(false);
  const remoteSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isRemoteSpeaking = remoteParticipant?.isSpeaking || false;

    if (isRemoteSpeaking) {
      setDebouncedRemoteSpeaking(true);
      if (remoteSpeakingTimeoutRef.current) {
        clearTimeout(remoteSpeakingTimeoutRef.current);
        remoteSpeakingTimeoutRef.current = null;
      }
    } else {
      remoteSpeakingTimeoutRef.current = setTimeout(() => {
        setDebouncedRemoteSpeaking(false);
      }, 1500);
    }

    return () => {
      if (remoteSpeakingTimeoutRef.current) {
        clearTimeout(remoteSpeakingTimeoutRef.current);
      }
    };
  }, [remoteParticipant?.isSpeaking]);

  // Map agentTurnStatus from hook + LiveKit speaking into TurnState for each card
  const { remoteTurnState, localTurnState } = useMemo(() => {
    // While paused, both cards show "Paused" — the underlying speaking/thinking/
    // your-turn status is frozen and would otherwise be stale and misleading.
    if (isPaused) {
      return {
        remoteTurnState: TurnState.PAUSED,
        localTurnState: TurnState.PAUSED,
      };
    }

    const isLocalSpeaking = localParticipant?.isSpeaking || false;
    const isThinking = agentTurnStatus === "thinking";

    let remoteTurnState: TurnState = TurnState.IDLE;
    let localTurnState: TurnState = TurnState.IDLE;

    if (isThinking) {
      remoteTurnState = TurnState.THINKING;
    } else if (debouncedRemoteSpeaking) {
      remoteTurnState = TurnState.AI_SPEAKING;
      localTurnState = TurnState.USER_TURN_TO_LISTEN;
    } else if (isLocalSpeaking) {
      remoteTurnState = TurnState.AI_LISTENING;
      localTurnState = TurnState.IDLE;
    } else {
      remoteTurnState = TurnState.AI_LISTENING;
      localTurnState = TurnState.USER_TURN_TO_SPEAK;
    }

    return { remoteTurnState, localTurnState };
  }, [isPaused, agentTurnStatus, debouncedRemoteSpeaking, localParticipant?.isSpeaking]);

  const hasStateNames = stateNames.length > 0;
  const sessionReminders: string[] = roomData?.reminders ?? [];
  const sessionDescription: string | undefined = roomData?.description;
  const showSessionInfo = sessionReminders.length > 0 || !!sessionDescription;

  // The sidebar's stepper only needs actual stateNames — a timerMode-only
  // session with no other content shows no sidebar, since the timer display
  // itself now lives in the page header (SessionTimeBar), not here.
  const showSidebar =
    !isFocusMode &&
    (showSessionInfo ||
      hasStateNames ||
      (checklistMode !== ChecklistMode.OFF && checklistItems.length > 0) ||
      (checklistMode === ChecklistMode.OFF && events?.length > 0) ||
      // The Supervisor tab earns the sidebar on its own: it shows from the
      // start of the session, before any note has arrived.
      supervisorNotesEnabled === true);

  const renderConnectedContent = () => (
    <>
      {/* Not mounted until roomStatus/countdown both clear (see isCountingDown
          below): this is the earliest point the learner should be able to
          hear the agent. If the agent starts speaking mid-countdown, its
          opening words are inaudible rather than played early — a deliberate
          trade so the countdown can't be skipped by a fast agent join. */}
      <RoomAudioRenderer />
      <div className="flex md:flex-row flex-col-reverse justify-between max-h-[calc(100dvh-180px)] sm:max-h-[calc(100dvh-220px)] lg:max-h-[calc(100dvh-280px)] gap-2 sm:gap-4 w-full h-full">
        {showSidebar && (
          <div
            data-testid="simulation-sidebar-column"
            className="order-3 md:order-2 flex flex-col gap-4 w-full md:w-[280px] lg:w-[320px] xl:w-[360px] shrink-0 h-full min-h-0 max-h-[45vh] md:max-h-none"
          >
            <SessionSidebar
              reminders={sessionReminders}
              description={sessionDescription}
              stateNames={stateNames}
              difficultyLevel={difficultyLevel}
              score={score}
              startTime={startTime}
              maxTimeSeconds={roomData?.timerMode ? maxTimeSeconds : undefined}
              isPaused={isPaused}
              pausedOffsetMs={pausedOffsetMs}
              checklistMode={checklistMode}
              checklistItems={checklistItems}
              detectedEventIds={detectedEventIds}
              events={events}
              supervisorNotes={supervisorNotes}
              supervisorNotesEnabled={supervisorNotesEnabled}
              translations={translations}
            />
          </div>
        )}

        <div
          data-testid="simulation-middle-column"
          className="order-1 relative flex-1 min-w-0 h-full min-h-[240px]"
        >
          <UserCallCard
            userData={{
              name: roomData?.remoteParticipant?.name,
              coverImageUrl: roomData?.remoteParticipant?.coverImageUrl,
            }}
            isSpeaking={remoteParticipant?.isSpeaking}
            turnState={FEATURE_FLAGS_MAP.TURN_INDICATOR_FLAG ? remoteTurnState : undefined}
            turnIndicatorTranslations={translations?.turnIndicator}
          />
          {/* Learner's own self-view: a small inlaid picture-in-picture bubble
              over the AI card, like a WhatsApp/Zoom video call, rather than an
              equal-size card of its own. */}
          <div
            data-testid="simulation-pip-self-view"
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-40 lg:w-36 lg:h-44 rounded-xl overflow-hidden border-2 border-[#3D4045] shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
          >
            <UserCallCard
              userData={{
                name: roomData?.localParticipant?.name || "You",
                coverImageUrl: roomData?.localParticipant?.coverImageUrl || null,
              }}
              isSpeaking={localParticipant.isSpeaking}
              isMuted={isMuted}
              turnState={FEATURE_FLAGS_MAP.TURN_INDICATOR_FLAG ? localTurnState : undefined}
              turnIndicatorTranslations={translations?.turnIndicator}
              compact
            />
          </div>
        </div>
      </div>
    </>
  );

  const connectingText = useMemo(() => {
    if (roomStatus === RoomStatus.CONNECTED || roomStatus === RoomStatus.CONNECTING)
      return (
        translations?.waitingForAgent ??
        "Waiting for the agent to join, this could take a few seconds…"
      );
    if (!isMicrophoneGranted)
      return translations?.clickToAllow ?? "Click to allow microphone and join the session.";
    return translations?.connectingToSession ?? "Connecting to session...";
  }, [roomStatus, translations]);

  const renderPendingStartContent = () => (
    <div
      data-testid="simulation-interface-pending-start"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif'] gap-4"
    >
      <p className="text-[20px] text-white">
        <span className="font-medium italic">{connectingText}</span>
      </p>
      <p className="text-[12px] text-[#B6B5B9]">
        {translations?.microphonePromptBrowser ??
          "To start the simulation, please allow microphone permission from your browser."}
      </p>
      <button
        type="button"
        onClick={onEnableMicrophone}
        className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
      >
        {translations?.allowMicrophone ?? "Allow microphone permission"}
      </button>
    </div>
  );

  const renderLoadingContent = () => (
    <div
      data-testid="simulation-interface-connecting bg-[#1D2020] rounded-lg"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif']"
    >
      <p className="text-[20px] text-white">
        <span className="font-medium italic">{connectingText}</span>
      </p>
      <p className="text-[12px] text-[#B6B5B9]">
        {translations?.microphonePrompt ??
          "To start the simulation, please allow us to use your microphone."}
      </p>
    </div>
  );

  // Fixed-length overlay, independent of connection progress: it always runs
  // the full 3 seconds it started with, whatever else is happening
  // underneath (mic prompt, connecting, or the agent already having joined).
  const renderCountdownContent = () => (
    <div
      data-testid="simulation-interface-countdown"
      role="status"
      aria-live="assertive"
      className="flex flex-col items-center text-center gap-4"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={countdownStep}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-center w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full border-2 border-primary-500 bg-[#1D2020] text-white font-['IBM_Plex_Serif'] font-medium text-[56px] sm:text-[64px]"
        >
          {countdownStep}
        </motion.div>
      </AnimatePresence>
      <p className="text-[14px] text-[#B6B5B9] font-['Roboto']">
        {translations?.simulationCountdownLabel ?? "Your simulation is about to begin…"}
      </p>
    </div>
  );

  const renderContent = () => {
    if (isCountingDown) return renderCountdownContent();
    if (!isMicrophoneGranted) return renderPendingStartContent();

    // Even if the agent already joined during the countdown, hold the switch
    // into the live call UI until the countdown above has fully played out —
    // isCountingDown covers that window, so by the time we reach here it's
    // safe to key purely off roomStatus.
    switch (roomStatus) {
      case RoomStatus.AGENT_JOINED:
        return renderConnectedContent();
      case RoomStatus.CONNECTED:
      case RoomStatus.CONNECTING:
      case RoomStatus.DISCONNECTING:
      case RoomStatus.DISCONNECTED:
      default:
        return renderLoadingContent();
    }
  };

  return (
    <motion.div
      data-testid="simulation-interface"
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full flex justify-center items-center flex-1 relative"
    >
      {renderContent()}
    </motion.div>
  );
};
