import { FC } from "react";

import { useTranslation } from "react-i18next";

import { Bolt } from "@assets";
import { TooltipLocation } from "@constants";
import { useSimulationCredits } from "@hooks";

import AppTooltip from "../app-tooltip/AppTooltip";

interface CreditsDisplayProps {
  className?: string;
}

export const CreditsDisplay: FC<CreditsDisplayProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const { credits, limitReached } = useSimulationCredits();

  return (
    <AppTooltip location={TooltipLocation.CREDITS_DISPLAY_METER}>
      <div
        className={`flex flex-row items-center gap-1 min-w-[130px] justify-end ${className}`}
        data-testid="credits-display"
      >
        <div className="font-primary text-base text-typography-700 whitespace-nowrap">
          {t("learn.credits.used")}
        </div>
        <Bolt data-testid="credits-icon" className="h-4 w-4 flex-shrink-0" />
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
    </AppTooltip>
  );
};
