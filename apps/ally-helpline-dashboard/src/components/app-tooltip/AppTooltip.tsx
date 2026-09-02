import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetActiveTooltipsQuery } from "@api";
import { TooltipLocation } from "@constants";

interface AppTooltipProps {
  location: TooltipLocation;
  children: React.ReactElement;
}

const AppTooltip: React.FC<AppTooltipProps> = ({ location, children }) => {
  // Refresh the active-tooltip list so a superadmin toggling a tooltip off (or on)
  // reaches users without a hard reload — otherwise the list is fetched once and
  // cached for the whole session (this is a separate RTK cache from the admin app,
  // so the admin's own invalidation never reaches here). Bounded rather than `true`:
  // this component wraps controls on nearly every routed page, so an unconditional
  // force-refetch on mount re-hit a failing endpoint on every page navigation with
  // no backoff (see PracticeStreakHeatmap for the same pattern).
  const { data: tooltips = [], isLoading } = useGetActiveTooltipsQuery(undefined, {
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  if (isLoading) return children;

  const tooltip = tooltips.find(t => t.location === location);

  if (!tooltip) return children;

  const title = tooltip.tipText;

  return (
    <Tooltip label={title} align="top" autoAlign>
      <span style={{ display: "block" }}>{children}</span>
    </Tooltip>
  );
};

export default AppTooltip;
