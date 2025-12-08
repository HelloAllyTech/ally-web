import React from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { ToggleSwitch } from "@components";
import { en } from "@constants";
import { Simulation } from "@types";

interface SimulationAndPathToggleCardProps {
  simulation: Simulation;
  hasAccess: boolean;
  onToggleAccess: (enabled: boolean) => void;
}

export const SimulationAndPathToggleCard: React.FC<SimulationAndPathToggleCardProps> = ({
  simulation,
  hasAccess,
  onToggleAccess,
}) => {
  return (
    <div className="flex items-center gap-4 py-4 pr-4 border-b border-border-light hover:bg-background-secondary transition-colors h-[80px]">
      {/* Simulation Image */}
      <div className="w-[18%] md:w-[10%] lg:w-[7%] h-[56px] rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
        <CustomImage
          src={simulation.coverImageUrl}
          alt={simulation.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Simulation Title and Description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="text-sm font-medium text-typography-900 mb-1 truncate">
          {simulation.title}
        </h3>
        <p className="text-sm text-typography-700 leading-relaxed line-clamp-2">
          {simulation.description}
        </p>
      </div>

      {/* Toggle and Status */}
      <div className="flex items-center gap-3 flex-shrink-0 min-w-[140px] justify-end mr-5">
        <ToggleSwitch
          enabled={hasAccess}
          onChange={onToggleAccess}
          label={en.userManagement.toggleAccess(simulation.title)}
        />
        <span className={`text-sm ${hasAccess ? "text-typography-900" : "text-typography-600"}`}>
          {hasAccess ? en.userManagement.enabled : en.userManagement.disabled}
        </span>
      </div>
    </div>
  );
};
