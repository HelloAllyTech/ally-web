"use client";

import { FC, useMemo } from "react";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { motion } from "framer-motion";

import { SimulationEvents } from "./SimulationEvents";
import { TurnState } from "./TurnTakingIndicator";
import { SimulationEventType } from "./types";
import { UserCallCard } from "./UserCallCard";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
}

export interface SimulationInterfaceProps {
  roomStatus: RoomStatus;
  roomData: any;
  events: SimulationEventType[];
  isFocusMode: boolean;
  isMuted: boolean;
}

export const SimulationInterface: FC<SimulationInterfaceProps> = ({
  roomStatus,
  roomData,
  events,
  isFocusMode,
  isMuted,
}) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants?.[0];

  // Calculate turn states based on speaking status
  const { remoteTurnState, localTurnState } = useMemo(() => {
    const isRemoteSpeaking = remoteParticipant?.isSpeaking || false;
    const isLocalSpeaking = localParticipant?.isSpeaking || false;

    let remoteTurnState: TurnState = TurnState.IDLE;
    let localTurnState: TurnState = TurnState.IDLE;

    if (isRemoteSpeaking) {
      // Remote (AI) is speaking
      remoteTurnState = TurnState.AI_SPEAKING; // Show "Speaking..." on AI card
      localTurnState = TurnState.USER_TURN_TO_LISTEN; // Show "Your turn to listen" on user card
    } else if (isLocalSpeaking) {
      // Local (user) is speaking
      remoteTurnState = TurnState.AI_LISTENING; // Show "Listening..." on AI card
      localTurnState = TurnState.IDLE; // No indicator while user is speaking
    } else {
      // Neither speaking - it's the user's turn
      remoteTurnState = TurnState.AI_LISTENING; // Show "Listening..." on AI card
      localTurnState = TurnState.USER_TURN_TO_SPEAK; // Show "Your turn to speak" on user card
    }

    return { remoteTurnState, localTurnState };
  }, [remoteParticipant?.isSpeaking, localParticipant?.isSpeaking]);

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
        {!isFocusMode && events?.length > 0 && <SimulationEvents events={events} />}
      </div>
    </>
  );

  const renderLoadingContent = () => (
    <div
      data-testid="simulation-interface-connecting bg-[#1D2020] rounded-lg"
      className="flex flex-col items-center text-center font-['IBM_Plex_Serif']"
    >
      <p className="text-[20px] text-white">
        Simulation
        <span className="font-medium italic">
          {" "}
          {roomStatus === RoomStatus.CONNECTING ? "starting..." : "disconnecting..."}
        </span>
      </p>
      <p className="text-[12px] text-[#B6B5B9]">
        To start the simulation, please allow us to use your microphone.
      </p>
    </div>
  );

  const renderContent = () => {
    switch (roomStatus) {
      case RoomStatus.CONNECTED:
        return renderConnectedContent();
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
