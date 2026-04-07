"use client";

import { FC, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { motion } from "framer-motion";

import { SessionChecklist } from "./SessionChecklist";
import { SessionProgress } from "./SessionProgress";
import { SimulationEvents } from "./SimulationEvents";
import {
  SimulationEventType,
  ChecklistItem,
  ChecklistMode,
  StateInstruction,
  SimulationTranslations,
} from "./types";
import { UserCallCard } from "./UserCallCard";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
  AGENT_JOINED = "agent_joined",
}

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
  checklistMode = ChecklistMode.OFF,
  checklistItems = [],
  isMicrophoneGranted,
  onEnableMicrophone,
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

  const hasStateNames = stateNames.length > 0;
  const showSessionProgress = hasStateNames || !!(roomData?.timerMode && startTime);

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
        />
        <UserCallCard
          userData={{
            name: roomData?.localParticipant?.name || "You",
            coverImageUrl: roomData?.localParticipant?.coverImageUrl || null,
          }}
          isSpeaking={localParticipant.isSpeaking}
          isMuted={isMuted}
        />
        {!isFocusMode &&
          (showSessionProgress ||
            (checklistMode !== ChecklistMode.OFF && checklistItems.length > 0) ||
            (checklistMode === ChecklistMode.OFF && events?.length > 0)) && (
            <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
              {showSessionProgress && (
                <SessionProgress
                  stateNames={stateNames}
                  difficultyLevel={difficultyLevel}
                  score={score}
                  startTime={startTime}
                  maxTimeSeconds={roomData?.timerMode ? maxTimeSeconds : undefined}
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
      return translations?.waitingForAgent ?? "Waiting for agent to join...";
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
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
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
