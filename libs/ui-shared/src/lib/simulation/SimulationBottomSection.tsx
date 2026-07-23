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
  isPaused,
  pausedOffsetMs,
  onPauseClick,
  translations,
}) => {
  return (
    <div data-testid="simulation-bottom-section" className="w-full flex items-center gap-2">
      {/* The visible session timer now lives in the page header (SessionTimeBar).
          SimulationTimer stays mounted here — invisibly — because it (not just
          displays time but) owns the onWarning/onTimeLimit side effects: the
          "ending soon" dialog trigger and the client-side auto-end fallback. */}
      <div className="flex-1 min-w-0">
        <div className="sr-only">
          <SimulationTimer
            isWarning={isWarning}
            onWarning={onTimeLimitWarning}
            onTimeLimit={onEndSimulation}
            startTime={startTime?.toString()}
            timeLimit={timeLimit}
            isPaused={isPaused}
            pausedOffsetMs={pausedOffsetMs}
            translations={
              translations ? { sessionDuration: translations.sessionDuration } : undefined
            }
          />
        </div>
      </div>
      <SimulationControls
        isMuted={isMuted}
        isFocusMode={isFocusMode}
        isEndingSession={isEndingSession}
        showFocusButton={showFocusButton}
        isPaused={isPaused}
        onEndSessionClick={onEndSimulation}
        onMuteClick={onMuteSimulation}
        onFocusButtonClick={onFocusButtonClick}
        onPauseClick={onPauseClick}
        translations={translations}
      />
      <div
        data-testid="simulation-bottom-section-data-safe"
        className="hidden sm:flex flex-1 items-center justify-end gap-2"
      >
        <Warning />
        <span className="text-[13px] lg:text-[15px] text-[#fff] font-['Roboto'] whitespace-nowrap">
          {translations?.dataSafe ?? "Your data is safe"}
        </span>
      </div>
    </div>
  );
};
