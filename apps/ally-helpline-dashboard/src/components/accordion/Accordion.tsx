import { FC } from "react";
import { Accordion as MuiAccordion, AccordionDetails, AccordionSummary } from "@mui/material";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";

import { AccordionProps } from "./types";

import "./Accordion.css";

const Accordion: FC<AccordionProps> = ({ children, defaultExpanded, title, titleIcon }) => {
  return (
    <MuiAccordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<PlayArrowRounded className="rotate-90 text-[#000]" />}>
        {titleIcon && <titleIcon.icon className="h-6 w-6" />}
        <span className="text-[16px] font-medium text-[#000]">{title}</span>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </MuiAccordion>
  );
};

export default Accordion;
