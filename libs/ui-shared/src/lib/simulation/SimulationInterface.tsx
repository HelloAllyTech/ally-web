"use client";

import { FC, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { motion } from "framer-motion";

import { SessionChecklist } from "./SessionChecklist";
import { SimulationEvents } from "./SimulationEvents";
import { SimulationEventType, ChecklistItem, ChecklistMode } from "./types";
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
}) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants?.[0];

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

  const connectingText = useMemo(() => {
    if (roomStatus === RoomStatus.CONNECTED || roomStatus === RoomStatus.CONNECTING)
      return "Waiting for agent to join...";
    return "Connecting to session...";
  }, [roomStatus]);

  const renderLoadingContent = () => (
    <div
      data-testid="simulation-interface-connecting bg-[#1D2020] rounded-lg"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif']"
    >
      <p className="text-[20px] text-white">
        <span className="font-medium italic">{connectingText}</span>
      </p>
      <p className="text-[12px] text-[#B6B5B9]">
        To start the simulation, please allow us to use your microphone.
      </p>
    </div>
  );

  const renderContent = () => {
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
