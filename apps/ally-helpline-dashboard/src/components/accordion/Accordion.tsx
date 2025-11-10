import { FC } from "react";

import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { Accordion as MuiAccordion, AccordionDetails, AccordionSummary } from "@mui/material";

import { accordionDetailsSx, accordionSx, accordionSummarySx } from "./Accordion.styles";
import { AccordionProps } from "./types";

const Accordion: FC<AccordionProps> = ({ children, defaultExpanded, title, titleIcon }) => {
  return (
    <MuiAccordion defaultExpanded={defaultExpanded} sx={accordionSx}>
      <AccordionSummary
        expandIcon={<PlayArrowRounded className="rotate-90 text-[#000]" aria-label="expand icon" />}
        sx={accordionSummarySx}
      >
        {titleIcon && <titleIcon.icon className="h-6 w-6" />}
        <span className="text-lg font-medium text-[#000]">{title}</span>
      </AccordionSummary>
      <AccordionDetails sx={accordionDetailsSx}>{children}</AccordionDetails>
    </MuiAccordion>
  );
};

export default Accordion;
