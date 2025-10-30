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
