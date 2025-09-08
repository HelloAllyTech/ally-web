import { FC } from "react";

import { scoreLevels } from "./constants";

const SimulationScoreMeter: FC = () => {
  return (
    <div className="flex gap-2">
      <span className="text-[#9CA3AF] text-[12px] font-medium">Practice Session Score</span>
      <div className="flex gap-1 items-center relative z-50">
        {scoreLevels.map(({ level, meterClassname }) => (
          <div key={level} className={`w-16 h-1 rounded-[34px] ${meterClassname}`} />
        ))}
        <div className="absolute top-1/2 -translate-y-1/2 left-[45%] w-4 h-4 border-[6px] border-[#E8E8E8] rounded-full bg-white" />
      </div>
    </div>
  );
};

export default SimulationScoreMeter;
