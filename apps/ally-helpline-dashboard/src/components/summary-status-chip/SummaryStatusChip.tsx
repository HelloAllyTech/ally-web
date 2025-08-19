import React from "react";

import { SummaryStatusProps } from "./types";
import { getStatusConfig } from "./utils";

const SummaryStatusChip: React.FC<SummaryStatusProps> = ({ status, className = "" }) => {
  const config = getStatusConfig(status);

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-2 py-[1] rounded-full text-sm font-medium
        transition-colors duration-200
        ${className}
      `}
      style={{
        backgroundColor: config.backgroundColor,
      }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      <span className="whitespace-nowrap">{config.label}</span>
    </div>
  );
};

export default SummaryStatusChip;
