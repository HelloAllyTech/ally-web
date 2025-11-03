"use client";

import { FC } from "react";

import { SimulationControls } from "./SimulationControls";
import { SimulationTimer } from "./SimulationTimer";
import { BottomSectionProps } from "./types";
import { Warning } from "../../assets";

export const BottomSection: FC<BottomSectionProps> = ({
  isWarning,
  onTimeLimitWarning,
  onEndSimulation,
  onMuteSimulation,
  isMuted,
  isEndingSession,
  startTime,
}) => {
  return (
    <div className="w-full flex justify-between items-center">
      <SimulationTimer
        isWarning={isWarning}
        onWarning={onTimeLimitWarning}
        onTimeLimit={onEndSimulation}
        startTime={startTime.toString()}
      />
      <SimulationControls
        isMuted={isMuted}
        isEndingSession={isEndingSession}
        onEndSessionClick={onEndSimulation}
        onMuteClick={onMuteSimulation}
      />
      <div className="flex items-center gap-2">
        <Warning />
        <span className="text-[12px] text-[#fff] font-['Roboto']">Your data is safe</span>
      </div>
    </div>
  );
};
