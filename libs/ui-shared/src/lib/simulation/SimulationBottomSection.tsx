"use client";

import { FC } from "react";

import { Warning } from "@ally-ui-mono/ui-shared/assets";

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
  showFocusButton,
  startTime,
  onFocusButtonClick,
  timeLimit,
  translations,
}) => {
  return (
    <div data-testid="simulation-bottom-section" className="w-full flex items-center">
      <div className="flex-1 flex justify-start">
        <SimulationTimer
          isWarning={isWarning}
          onWarning={onTimeLimitWarning}
          onTimeLimit={onEndSimulation}
          startTime={startTime?.toString()}
          timeLimit={timeLimit}
          translations={
            translations ? { sessionDuration: translations.sessionDuration } : undefined
          }
        />
      </div>
      <SimulationControls
        isMuted={isMuted}
        isFocusMode={isFocusMode}
        isEndingSession={isEndingSession}
        showFocusButton={showFocusButton}
        onEndSessionClick={onEndSimulation}
        onMuteClick={onMuteSimulation}
        onFocusButtonClick={onFocusButtonClick}
        translations={translations}
      />
      <div
        data-testid="simulation-bottom-section-data-safe"
        className="flex-1 flex items-center justify-end gap-2"
      >
        <Warning />
        <span className="text-[15px] text-[#fff] font-['Roboto']">
          {translations?.dataSafe ?? "Your data is safe"}
        </span>
      </div>
    </div>
  );
};
