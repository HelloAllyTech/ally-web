"use client";

import { FC } from "react";

import { Warning } from "@lifeline-ui-mono/ui-shared/assets";

import { SimulationControls } from "./SimulationControls";
import { SimulationTimer } from "./SimulationTimer";
import { BottomSectionProps } from "./types";

export const BottomSection: FC<BottomSectionProps> = ({
  isWarning,
  onTimeLimitWarning,
  onEndSimulation,
  onMuteSimulation,
  isMuted,
  isFocusMode,
  isEndingSession,
  startTime,
  onFocusButtonClick,
}) => {
  return (
    <div
      data-testid="simulation-bottom-section"
      className="w-full flex justify-between items-center"
    >
      <SimulationTimer
        isWarning={isWarning}
        onWarning={onTimeLimitWarning}
        onTimeLimit={onEndSimulation}
        startTime={startTime.toString()}
      />
      <SimulationControls
        isMuted={isMuted}
        isFocusMode={isFocusMode}
        isEndingSession={isEndingSession}
        onEndSessionClick={onEndSimulation}
        onMuteClick={onMuteSimulation}
        onFocusButtonClick={onFocusButtonClick}
      />
      <div data-testid="simulation-bottom-section-data-safe" className="flex items-center gap-2">
        <Warning />
        <span className="text-[15px] text-[#fff] font-['Roboto']">Your data is safe</span>
      </div>
    </div>
  );
};
