import { FC } from "react";

import { en } from "@constants";

import { LandingBlockPanel } from "./LandingFields";
import { LandingBlockProps } from "./landingTypes";

/** Nothing to write: the line is worked out from the XP rules. Only the switch in the list matters. */
export const XpBlock: FC<LandingBlockProps> = ({ page }) => (
  <LandingBlockPanel
    title={en.courseLanding.blocks.xp}
    fallback={en.courseLanding.fallback.xp}
    isOff={!page.xp.enabled}
  >
    <p className="text-sm text-typography-900">{en.courseLanding.xp.explainer}</p>
    <p className="text-xs text-typography-500">{en.courseLanding.xp.offHint}</p>
  </LandingBlockPanel>
);
