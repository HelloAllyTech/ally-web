import React from "react";

import { SimulationStatus } from "@types";
import { formatCapitalizedEnum, getStatusColor } from "@utils";

interface StatusPillProps {
  status: SimulationStatus;
  className?: string;
}

// ACTIVE is surfaced to admins as "Published" — the two statuses are the same
// lifecycle state, but "Published" is the label the dashboard vocabulary uses.
export const StatusPill: React.FC<StatusPillProps> = ({ status, className = "" }) => {
  return (
    <div className="flex items-center">
      <div
        className={`w-auto py-1 rounded-[4px] px-2 text-sm ${getStatusColor(status)} ${className}`}
      >
        {status === SimulationStatus.ACTIVE
          ? formatCapitalizedEnum(SimulationStatus.PUBLISHED)
          : formatCapitalizedEnum(status) || "--"}
      </div>
    </div>
  );
};
