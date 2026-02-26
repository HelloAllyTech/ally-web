import { FC, ReactNode, useState } from "react";

import {
  Accordion as MuiAccordion,
  AccordionDetails,
  AccordionSummary,
  SxProps,
  Theme,
} from "@mui/material";

import { ArrowSolid } from "@assets";

import { accordionSx, accordionSummarySx, accordionDetailsSx } from "./accordian.styles";

export interface AccordionProps {
  children?: ReactNode;
  defaultExpanded?: boolean;
  title?: string;
  headerActions?: ReactNode;
  onChange?: (expanded: boolean) => void;
  expandIcon?: ReactNode;
  headerTitle?: ReactNode;
  customAccordionSx?: SxProps<Theme>;
  customAccordionSummarySx?: SxProps<Theme>;
  customAccordionDetailsSx?: SxProps<Theme>;
}

export const Accordion: FC<AccordionProps> = ({
  children,
  defaultExpanded = false,
  title,
  headerActions,
  onChange,
  expandIcon,
  customAccordionSx,
  customAccordionSummarySx,
  customAccordionDetailsSx,
  headerTitle,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
    onChange?.(isExpanded);
  };

  return (
    <MuiAccordion
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onChange={handleChange}
      sx={customAccordionSx ?? accordionSx}
    >
      <AccordionSummary
        expandIcon={
          expandIcon ? (
            <span
              className={`transition-transform duration-200 [&_path]:fill-[#212121] ${
                expanded ? "" : "-rotate-90"
              }`}
            >
              {expandIcon}
            </span>
          ) : (
            <span
              className={`transition-transform duration-200 [&_path]:fill-[#212121] ${
                expanded ? "" : "-rotate-90"
              }`}
            >
              <ArrowSolid />
            </span>
          )
        }
        sx={customAccordionSummarySx ?? accordionSummarySx}
      >
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-[18px] items-center">
            {headerTitle ?? (
              <div className="text-base font-medium text-typography-900">{title}</div>
            )}
          </div>
          {headerActions && (
            <div
              className="flex flex-row gap-[18px] items-center"
              onClick={e => e.stopPropagation()}
            >
              {headerActions}
            </div>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails sx={customAccordionDetailsSx ?? accordionDetailsSx}>
        {children}
      </AccordionDetails>
    </MuiAccordion>
  );
};
