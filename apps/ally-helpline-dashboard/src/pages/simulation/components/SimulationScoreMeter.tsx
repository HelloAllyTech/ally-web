import { FC } from "react";

import { motion } from "framer-motion";

import { scoreLevels } from "./constants";
import { SimulationScoreMeterProps } from "./types";

const SimulationScoreMeter: FC<SimulationScoreMeterProps> = ({ score = 45 }) => {
  // Clamp the score between 0 and 100 range
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="flex gap-2">
      <span className="text-[#9CA3AF] text-[12px] font-medium">Practice Session Score</span>
      <div className="flex gap-1 items-center relative z-50">
        {scoreLevels.map(({ level, meterClassname }) => (
          <div key={level} className={`w-16 h-1 rounded-[34px] ${meterClassname}`} />
        ))}
        <motion.div
          aria-label="score-indicator"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 border-[6px] border-[#E8E8E8] rounded-full bg-white"
          animate={{ left: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 26 }}
        />
      </div>
    </div>
  );
};

export default SimulationScoreMeter;
