"use client";

import { FC } from "react";

import { RoomAudioRenderer } from "@livekit/components-react";
import { motion } from "framer-motion";

import { SimulationWaveform } from "./SimulationWaveform";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
}

export interface SimulationInterfaceProps {
  roomStatus: RoomStatus;
  roomData: any;
}

export const SimulationInterface: FC<SimulationInterfaceProps> = ({ roomStatus, roomData }) => {
  const renderContent = () => {
    switch (roomStatus) {
      case RoomStatus.CONNECTING:
        return (
          <div
            data-testid="simulation-interface-connecting"
            className="flex flex-col items-center text-center font-['IBM_Plex_Serif']"
          >
            <p className="text-[20px] text-white">
              Simulation
              <span className="font-medium italic"> starting...</span>
            </p>
            <p className="text-[12px] text-[#B6B5B9]">
              To start the simulation, please allow us to use your microphone.
            </p>
          </div>
        );
      case RoomStatus.CONNECTED:
      default:
        return (
          <>
            <RoomAudioRenderer />
            <SimulationWaveform roomData={roomData} />
            <span
              data-testid="simulation-interface-room-name"
              className="absolute bottom-4 left-4 text-white font-['IBM_Plex_Serif']"
            >
              {roomData?.name}
            </span>
          </>
        );
    }
  };

  return (
    <motion.div
      data-testid="simulation-interface"
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="w-full flex justify-center items-center flex-1 bg-[#1D2020] rounded-lg relative"
    >
      {renderContent()}
    </motion.div>
  );
};
