import React, { useRef, useState } from "react";

import { Tooltip } from "@mui/material";

import { useGetActiveTooltipsQuery } from "@api";
import { toolTipStyles } from "@constants";

interface AppTooltipProps {
  location: string;
  children: React.ReactElement;
}

const LONG_PRESS_DELAY_MS = 500;

const AppTooltip: React.FC<AppTooltipProps> = ({ location, children }) => {
  const { data: tooltips = [] } = useGetActiveTooltipsQuery();
  const tooltip = tooltips.find(t => t.location === location);

  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!tooltip) return children;

  const title = tooltip.icon ? `${tooltip.icon} ${tooltip.tipText}` : tooltip.tipText;

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => setOpen(true), LONG_PRESS_DELAY_MS);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => setOpen(false), 1500);
  };

  return (
    <Tooltip
      title={title}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      componentsProps={toolTipStyles}
      arrow
      disableTouchListener
    >
      {React.cloneElement(children, {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
      })}
    </Tooltip>
  );
};

export default AppTooltip;
