import { ReactElement } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetActiveTooltipsQuery } from "@api";
import { TooltipIcon } from "@assets";

/**
 * Resolve the display title for a data-driven tooltip `location`, or "" when no
 * active tooltip exists for it. Prefixes the optional emoji icon, matching the
 * helpline AppTooltip / ToggleSection behaviour. Returns "" while loading or
 * when location is unset so callers can render nothing.
 */
const useActiveTooltipTitle = (location?: string): string => {
  const { data: tooltips = [] } = useGetActiveTooltipsQuery(undefined, { skip: !location });
  if (!location) return "";
  const tooltip = tooltips.find(t => t.location === location);
  if (!tooltip) return "";
  return tooltip.icon ? `${tooltip.icon} ${tooltip.tipText}` : tooltip.tipText;
};

/**
 * Standalone tooltip hint — renders the standard sticky_note trigger icon with
 * its tooltip, but ONLY when an active tooltip exists for `location` (otherwise
 * renders nothing). Use next to a field label, e.g. <TooltipHint location={...} />.
 */
export const TooltipHint = ({ location }: { location?: string }) => {
  const title = useActiveTooltipTitle(location);
  if (!title) return null;
  return (
    <Tooltip label={title} align="top">
      <button type="button" className="cursor-pointer inline-flex items-center">
        <TooltipIcon />
      </button>
    </Tooltip>
  );
};

/**
 * Wrap an element so hovering it shows the tooltip for `location` when an active
 * tooltip exists; otherwise the child renders unchanged (no wrapper span, no
 * behaviour change). Use for action buttons / controls that already have their
 * own visible affordance, e.g. <AppTooltip location={...}><button/></AppTooltip>.
 */
export const AppTooltip = ({
  location,
  children,
}: {
  location?: string;
  children: ReactElement;
}) => {
  const title = useActiveTooltipTitle(location);
  if (!title) return children;
  return (
    <Tooltip label={title} align="top">
      <span style={{ display: "inline-flex" }}>{children}</span>
    </Tooltip>
  );
};
