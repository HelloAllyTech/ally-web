import React, { useEffect } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetActiveTooltipsQuery } from "@api";
import { TooltipLocation } from "@constants";

interface AppTooltipProps {
  location: TooltipLocation;
  children: React.ReactElement;
}

// RTK Query only honours `refetchOnMountOrArgChange`'s window once a query has
// fulfilled at least once — with no `fulfilledTimeStamp` to compare against,
// its mount-time `condition()` check forces a fresh request regardless of the
// window (see isForcedQuery in @reduxjs/toolkit/query). That is exactly the
// case that matters here: while getActiveTooltips is persistently failing,
// every single remount re-hit it with no backoff at all, worse than the
// bound below implies. Track the last failure across mounts/instances (they
// all share this one query, since it takes no argument) and skip
// re-subscribing until the cooldown passes.
const RETRY_COOLDOWN_MS = 30_000;
let nextRetryAt = 0;

const AppTooltip: React.FC<AppTooltipProps> = ({ location, children }) => {
  const skipRetry = Date.now() < nextRetryAt;

  // Refresh the active-tooltip list so a superadmin toggling a tooltip off (or on)
  // reaches users without a hard reload — otherwise the list is fetched once and
  // cached for the whole session (this is a separate RTK cache from the admin app,
  // so the admin's own invalidation never reaches here). Bounded rather than `true`:
  // this component wraps controls on nearly every routed page, so an unconditional
  // force-refetch on mount re-hit a failing endpoint on every page navigation with
  // no backoff (see PracticeStreakHeatmap for the same pattern).
  const {
    data: tooltips = [],
    isLoading,
    isError,
  } = useGetActiveTooltipsQuery(undefined, {
    skip: skipRetry,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (isError) {
      nextRetryAt = Date.now() + RETRY_COOLDOWN_MS;
    }
  }, [isError]);

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
