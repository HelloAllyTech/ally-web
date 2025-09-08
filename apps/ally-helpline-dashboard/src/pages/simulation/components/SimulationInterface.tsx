import { FC } from "react";

import { RoomAudioRenderer } from "@livekit/components-react";

import { RoomStatus } from "@types";

import { SimulationWaveform } from ".";
import { SimulationInterfaceProps } from "./types";

const SimulationInterface: FC<SimulationInterfaceProps> = ({ roomStatus }) => {
  const renderContent = () => {
    switch (roomStatus) {
      case RoomStatus.CONNECTING:
        return (
          <div className="flex flex-col items-center text-center font-['IBM_Plex_Serif']">
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
            <SimulationWaveform />
          </>
        );
    }
  };

  return (
    <div className="w-full flex justify-center items-center flex-1 bg-[#1D2020] rounded-lg">
      {renderContent()}
    </div>
  );
};

export default SimulationInterface;
