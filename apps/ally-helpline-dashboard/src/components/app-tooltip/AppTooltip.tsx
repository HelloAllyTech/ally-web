import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetActiveTooltipsQuery } from "@api";
import { TooltipLocation } from "@constants";

interface AppTooltipProps {
  location: TooltipLocation;
  children: React.ReactElement;
}

const AppTooltip: React.FC<AppTooltipProps> = ({ location, children }) => {
  const { data: tooltips = [], isLoading } = useGetActiveTooltipsQuery();

  if (isLoading) return children;

  const tooltip = tooltips.find(t => t.location === location);

  if (!tooltip) return children;

  const title = tooltip.icon ? `${tooltip.icon} ${tooltip.tipText}` : tooltip.tipText;

  return (
    <Tooltip label={title} align="top">
      <span style={{ display: "block" }}>{children}</span>
    </Tooltip>
  );
};

export default AppTooltip;
