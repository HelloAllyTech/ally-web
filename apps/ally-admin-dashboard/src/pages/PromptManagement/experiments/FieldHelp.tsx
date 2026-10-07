import React from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";

/** The house help-tooltip pattern, for a label whose control isn't self-explanatory. */
export const FieldHelp: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip label={text} align="top">
    <button type="button" className="cursor-pointer inline-flex items-center" aria-label={text}>
      <TooltipIcon />
    </button>
  </Tooltip>
);
