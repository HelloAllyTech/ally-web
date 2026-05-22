import React from "react";

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
    <Tooltip title={title} componentsProps={toolTipStyles} arrow>
      {children}
    </Tooltip>
  );
};

export default AppTooltip;
