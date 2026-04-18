"use client";

import { FC, useEffect, useRef, useState, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { motion } from "framer-motion";

import { SessionChecklist } from "./SessionChecklist";
import { SimulationEvents } from "./SimulationEvents";
import { TurnState } from "./TurnIndicator";
import { SimulationEventType, ChecklistItem, ChecklistMode } from "./types";
import { UserCallCard } from "./UserCallCard";

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
  checklistMode?: ChecklistMode;
  checklistItems?: ChecklistItem[];
  isMicrophoneGranted: boolean;
  onEnableMicrophone: () => void;
  agentTurnStatus?: AgentTurnStatus;
  score?: number;
  stateNames?: any[];
  difficultyLevel?: string;
  startTime?: string;
  maxTimeSeconds?: number;
  translations?: any;
}

export const SimulationInterface: FC<SimulationInterfaceProps> = ({
  roomStatus,
  roomData,
  events,
  detectedEventIds,
  isFocusMode,
  isMuted,
  checklistMode = ChecklistMode.OFF,
  checklistItems = [],
  isMicrophoneGranted,
  onEnableMicrophone,
  agentTurnStatus,
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
  }, [agentTurnStatus, debouncedRemoteSpeaking, localParticipant?.isSpeaking]);

  const renderConnectedContent = () => (
    <>
      <RoomAudioRenderer />
      <div className="flex md:flex-row flex-col justify-between max-h-[calc(100vh-300px)] gap-4 w-full h-full">
        <UserCallCard
          userData={{
            name: roomData?.remoteParticipant?.name,
            coverImageUrl: roomData?.remoteParticipant?.coverImageUrl,
          }}
          isSpeaking={remoteParticipant?.isSpeaking}
          turnState={remoteTurnState}
        />
        <UserCallCard
          userData={{
            name: roomData?.localParticipant?.name || "You",
            coverImageUrl: roomData?.localParticipant?.coverImageUrl || null,
          }}
          isSpeaking={localParticipant.isSpeaking}
          isMuted={isMuted}
          turnState={localTurnState}
        />
        {!isFocusMode && checklistMode !== ChecklistMode.OFF && checklistItems.length > 0 && (
          <SessionChecklist
            mode={checklistMode}
            items={checklistItems}
            triggeredEvents={detectedEventIds || []}
          />
        )}
        {!isFocusMode && checklistMode === ChecklistMode.OFF && events?.length > 0 && (
          <SimulationEvents events={events} />
        )}
      </div>
    </>
  );

  const renderPendingStartContent = () => (
    <div
      data-testid="simulation-interface-pending-start"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif'] gap-4"
    >
      <p className="text-[20px] text-white">
        <span className="font-medium italic">Click to allow microphone and join the session.</span>
      </p>
      <button
        type="button"
        onClick={onEnableMicrophone}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
      >
        Allow microphone permission
      </button>
    </div>
  );

  const renderLoadingContent = () => (
    <div
      data-testid="simulation-interface-connecting"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif']"
    >
      <p className="text-[20px] text-white">
        <span className="font-medium italic">Waiting for agent to join...</span>
      </p>
      <p className="text-[12px] text-[#B6B5B9]">
        To start the simulation, please allow us to use your microphone.
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
