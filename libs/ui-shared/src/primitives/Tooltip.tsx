import type { ComponentProps } from "react";

import { Tooltip as CarbonTooltip } from "@carbon/react";

export type TooltipProps = ComponentProps<typeof CarbonTooltip>;

/**
 * Design-system Tooltip.
 *
 * Thin wrapper over Carbon's `Tooltip` that turns `autoAlign` on by default.
 * With `autoAlign`, a tooltip whose preferred `align` would push it off-screen
 * (e.g. an icon button pinned to the top of the viewport with the default
 * top-alignment) flips itself back into view instead of rendering off-screen
 * and getting clipped. Carbon only repositions when the preferred placement
 * actually overflows, so tooltips that are nowhere near a viewport edge are
 * unaffected.
 *
 * Every prop — including `autoAlign` and `align` — still passes through, so a
 * caller can opt out with `autoAlign={false}` or pin a specific `align`.
 */
export const Tooltip = ({ autoAlign = true, ...props }: TooltipProps) => (
  <CarbonTooltip autoAlign={autoAlign} {...props} />
);
