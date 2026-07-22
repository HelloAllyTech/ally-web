"use client";

import { FC, useEffect, useRef, useState, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { motion } from "framer-motion";

import { SessionChecklist } from "./SessionChecklist";
import { SessionInfoTabs } from "./SessionInfoTabs";
import { SessionProgress } from "./SessionProgress";
import { SimulationEvents } from "./SimulationEvents";
import { TurnState } from "./TurnIndicator";
import {
  SimulationEventType,
  ChecklistItem,
  ChecklistMode,
  StateInstruction,
  SimulationTranslations,
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

export type AgentTurnStatus = "thinking" | "speaking" | "user_turn";

export interface SimulationInterfaceProps {
  roomStatus: RoomStatus;
  roomData: any;
  events: SimulationEventType[];
  detectedEventIds?: string[];
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
  const showSessionProgress = hasStateNames || !!(roomData?.timerMode && startTime);
  const sessionReminders: string[] = roomData?.reminders ?? [];
  const sessionDescription: string | undefined = roomData?.description;
  const showSessionInfo = sessionReminders.length > 0 || !!sessionDescription;

  const showRightColumn =
    !isFocusMode &&
    (showSessionProgress ||
      (checklistMode !== ChecklistMode.OFF && checklistItems.length > 0) ||
      (checklistMode === ChecklistMode.OFF && events?.length > 0));
  const showLeftColumn = !isFocusMode && showSessionInfo;

  const renderConnectedContent = () => (
    <>
      <RoomAudioRenderer />
      <div className="flex md:flex-row flex-col-reverse justify-between max-h-[calc(100dvh-180px)] sm:max-h-[calc(100dvh-220px)] lg:max-h-[calc(100dvh-280px)] gap-2 sm:gap-4 w-full h-full">
        {showLeftColumn && (
          <div
            data-testid="simulation-left-column"
            className="order-3 md:order-1 flex flex-col gap-4 w-full md:w-[240px] lg:w-[280px] xl:w-[320px] shrink-0 h-full min-h-0 max-h-[35vh] md:max-h-none"
          >
            <SessionInfoTabs
              reminders={sessionReminders}
              description={sessionDescription}
              translations={translations}
            />
          </div>
        )}

        <div
          data-testid="simulation-middle-column"
          className="order-1 md:order-2 relative flex-1 min-w-0 h-full min-h-[240px]"
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

        {showRightColumn && (
          <div
            data-testid="simulation-right-column"
            className="order-2 md:order-3 flex flex-col gap-4 w-full md:w-[300px] lg:w-[320px] shrink-0 h-full min-h-0 max-h-[40vh] md:max-h-none"
          >
            {showSessionProgress && (
              <SessionProgress
                stateNames={stateNames}
                difficultyLevel={difficultyLevel}
                score={score}
                startTime={startTime}
                maxTimeSeconds={roomData?.timerMode ? maxTimeSeconds : undefined}
                isPaused={isPaused}
                pausedOffsetMs={pausedOffsetMs}
              />
            )}
            {checklistMode !== ChecklistMode.OFF && checklistItems.length > 0 && (
              <SessionChecklist
                mode={checklistMode}
                items={checklistItems}
                triggeredEvents={detectedEventIds || []}
                translations={translations}
              />
            )}
            {checklistMode === ChecklistMode.OFF && events?.length > 0 && (
              <SimulationEvents events={events} />
            )}
          </div>
        )}
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

  const renderContent = () => {
    if (!isMicrophoneGranted) return renderPendingStartContent();

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
