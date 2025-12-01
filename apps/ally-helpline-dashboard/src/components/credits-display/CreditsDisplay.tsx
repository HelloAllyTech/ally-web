import { FC } from "react";

import { Bolt } from "@assets";
import { useSimulationCredits } from "@hooks";

interface CreditsDisplayProps {
  className?: string;
}

export const CreditsDisplay: FC<CreditsDisplayProps> = ({ className = "" }) => {
  const { credits, limitReached } = useSimulationCredits();

  return (
    <div
      className={`flex flex-row items-center min-w-[130px] justify-end ${className}`}
      data-testid="credits-display"
    >
      <div className="font-primary text-base text-typography-700 whitespace-nowrap">
        Credits used:
      </div>
      <Bolt data-testid="credits-icon" />
      <span
        data-testid="credits-consumed"
        className={`font-primary font-bold text-lg ${limitReached ? "text-red-500" : "text-black"}`}
      >
        {credits?.consumedCredits ?? 0}
      </span>
      <span className="font-primary text-base text-typography-700" data-testid="credits-limit">
        /{credits?.creditLimit ?? 0}
      </span>
    </div>
  );
};
