import { FC, ReactNode, useState } from "react";

import { ArrowSolid } from "@assets";

import {
  accordionClassName,
  accordionSummaryClassName,
  accordionDetailsClassName,
} from "./accordian.styles";

export interface AccordionProps {
  children?: ReactNode;
  defaultExpanded?: boolean;
  title?: string;
  headerActions?: ReactNode;
  onChange?: (expanded: boolean) => void;
  expandIcon?: ReactNode;
  headerTitle?: ReactNode;
  customAccordionClassName?: string;
  customAccordionSummaryClassName?: string;
  customAccordionDetailsClassName?: string;
}

export const Accordion: FC<AccordionProps> = ({
  children,
  defaultExpanded = false,
  title,
  headerActions,
  onChange,
  expandIcon,
  customAccordionClassName,
  customAccordionSummaryClassName,
  customAccordionDetailsClassName,
  headerTitle,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    onChange?.(next);
  };

  return (
    <div className={customAccordionClassName ?? accordionClassName}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={handleToggle}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggle();
          }
        }}
        className={`cursor-pointer ${customAccordionSummaryClassName ?? accordionSummaryClassName}`}
      >
        <span
          className={`transition-transform duration-200 [&_path]:fill-[#212121] ${
            expanded ? "" : "-rotate-90"
          }`}
        >
          {expandIcon ?? <ArrowSolid />}
        </span>
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
      </div>
      {expanded && (
        <div className={customAccordionDetailsClassName ?? accordionDetailsClassName}>
          {children}
        </div>
      )}
    </div>
  );
};
