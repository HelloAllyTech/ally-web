import { FC } from "react";

import { Accordion as CarbonAccordion, AccordionItem } from "@ally-ui-mono/ui-shared";

import { AccordionProps } from "./types";

const Accordion: FC<AccordionProps> = ({ children, defaultExpanded, title, titleIcon }) => {
  const TitleIcon = titleIcon?.icon;
  return (
    <CarbonAccordion className="border-none">
      <AccordionItem
        open={defaultExpanded}
        title={
          <span className="flex items-center gap-4">
            {TitleIcon && <TitleIcon className="h-6 w-6" />}
            <span className="text-lg font-medium text-typography-900">{title}</span>
          </span>
        }
      >
        <div className="flex flex-col gap-2 text-[14px]">{children}</div>
      </AccordionItem>
    </CarbonAccordion>
  );
};

export default Accordion;
