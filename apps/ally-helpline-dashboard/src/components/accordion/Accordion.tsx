import { FC } from "react";
import { Accordion as MuiAccordion, AccordionDetails, AccordionSummary } from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";

import { AccordionProps } from "./types";

import "./Accordion.css";
const Accordion: FC<AccordionProps> = ({ children, title, titleIcon }) => {
  return (
    <MuiAccordion>
      <AccordionSummary expandIcon={<PlayArrow className="rotate-90 text-[#000]" />}>
        {titleIcon && <titleIcon.icon className="h-6 w-6" />}
        <span className="text-[16px] font-bold text-[#000]">{title}</span>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </MuiAccordion>
  );
};

export default Accordion;
