import { FC } from "react";

import { SummaryStatusProps } from "./types";
import { getStatusConfig } from "./utils";

const SummaryStatusChip: FC<SummaryStatusProps> = ({ status, className = "" }) => {
  const config = getStatusConfig(status);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-[1] rounded-full text-sm font-medium transition-colors duration-200 ${config.outerDivClassName} ${className}`}
    >
      {config.icon ? (
        <config.icon />
      ) : (
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClassName}`} />
      )}
      <span className="whitespace-nowrap">{config.label}</span>
    </div>
  );
};

export default SummaryStatusChip;
