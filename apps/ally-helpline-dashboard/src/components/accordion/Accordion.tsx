import { FC } from "react";
import { Accordion as MuiAccordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";

import { AccordionProps } from "./types";

import "./Accordion.css";

const Accordion: FC<AccordionProps> = ({ children, title, titleIcon }) => {
  return (
    <MuiAccordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <ExpandMore />
        {titleIcon}
        <span className="text-[16px] font-bold">{title}</span>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </MuiAccordion>
  );
};

export default Accordion;
