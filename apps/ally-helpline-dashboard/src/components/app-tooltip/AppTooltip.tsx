import React from "react";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip } from "@mui/material";

import { useGetActiveTooltipsQuery } from "@api";
import { toolTipStyles } from "@constants";

interface AppTooltipProps {
  location: string;
  children: React.ReactElement;
}

const AppTooltip: React.FC<AppTooltipProps> = ({ location, children }) => {
  const { data: tooltips = [] } = useGetActiveTooltipsQuery();
  const tooltip = tooltips.find(t => t.location === location);

  if (!tooltip) return children;

  const title = tooltip.icon ? `${tooltip.icon} ${tooltip.tipText}` : tooltip.tipText;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1">{children}</div>
      <Tooltip title={title} componentsProps={toolTipStyles} arrow>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: "#6B7280", cursor: "pointer", flexShrink: 0 }} />
      </Tooltip>
    </div>
  );
};

export default AppTooltip;
