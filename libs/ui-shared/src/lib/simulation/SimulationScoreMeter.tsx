"use client";

import { FC } from "react";

import { motion } from "framer-motion";

import { SimulationScoreMeterProps } from "./types";
import { scoreLevels } from "./waveformConstants";

export const SimulationScoreMeter: FC<SimulationScoreMeterProps> = ({
  score = 0,
  translations,
}) => {
  const clamped = Math.max(-100, Math.min(100, score));
  const leftPercent = (clamped + 100) / 2;

  return (
    <div
      data-testid="simulation-score-meter"
      className="flex flex-col items-center justify-center gap-2"
    >
      <div
        data-testid="simulation-score-meter-label"
        className="text-[#9CA3AF] text-[12px] font-medium mr-1"
      >
        {translations?.points ?? "Points"}
      </div>
      <div
        data-testid="simulation-score-meter-bar"
        className="flex gap-1 items-center relative z-50"
      >
        {scoreLevels.map(({ level, meterClassname }) => (
          <div
            key={level}
            data-testid={`simulation-score-meter-level-${level}`}
            className={`w-16 h-1 rounded-[34px] ${meterClassname}`}
          />
        ))}
        <motion.div
          data-testid="simulation-score-meter-indicator"
          aria-label="score-indicator"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 border-[6px] border-[#E8E8E8] rounded-full bg-white"
          animate={{ left: `${leftPercent}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 26 }}
        />
      </div>
    </div>
  );
};
